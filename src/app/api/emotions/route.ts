import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { getEffectivePlan, getPlanLimits } from '@/lib/plan-limits'
import { getZAI } from '@/lib/zai'

interface EmotionPoint {
  segmentIdx: number
  charStart: number
  charEnd: number
  emotion: string
  intensity: number
  label: string
}

const ALLOWED_EMOTIONS = [
  'alegría',
  'tristeza',
  'tensión',
  'misterio',
  'esperanza',
  'miedo',
  'amor',
  'reflexión',
  'acción',
  'calma',
]

// Parse AI response as array of emotion points, defensively
function parseEmotionArray(raw: string, expectedCount: number): Array<{
  emotion: string
  intensity: number
  label: string
}> {
  let cleaned = raw.trim()

  // Strip ```json ... ``` or ``` ... ``` fences
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim()
  }

  const tryParseArray = (text: string): Array<Record<string, unknown>> | null => {
    try {
      const parsed = JSON.parse(text)
      if (Array.isArray(parsed)) return parsed as Array<Record<string, unknown>>
    } catch {
      // ignore
    }
    // Try to extract first [ ... ] block
    const arrMatch = text.match(/\[[\s\S]*\]/)
    if (arrMatch) {
      try {
        const parsed = JSON.parse(arrMatch[0])
        if (Array.isArray(parsed)) return parsed as Array<Record<string, unknown>>
      } catch {
        // ignore
      }
    }
    return null
  }

  const arr = tryParseArray(cleaned)
  if (arr) {
    return arr.map((item) => {
      const emotionRaw = typeof item.emotion === 'string' ? item.emotion : ''
      const emotionLower = emotionRaw.toLowerCase().trim()
      const emotion = ALLOWED_EMOTIONS.includes(emotionLower)
        ? emotionLower
        : emotionRaw || 'reflexión'

      let intensity = 5
      if (typeof item.intensity === 'number') {
        intensity = Math.max(1, Math.min(10, Math.round(item.intensity)))
      } else if (typeof item.intensity === 'string') {
        const n = parseInt(item.intensity, 10)
        if (!Number.isNaN(n)) intensity = Math.max(1, Math.min(10, n))
      }

      const label =
        typeof item.label === 'string' && item.label.trim().length > 0
          ? item.label.trim()
          : 'Momento del libro'

      return { emotion, intensity, label }
    })
  }

  // Fallback: produce neutral points so the graph still renders
  return Array.from({ length: expectedCount }, () => ({
    emotion: 'reflexión',
    intensity: 5,
    label: 'Momento del libro',
  }))
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Debes iniciar sesión para usar el gráfico de emociones' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Get user plan info
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { plan: true, isVip: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const effectivePlan = getEffectivePlan(user.plan, user.isVip)
    const limits = getPlanLimits(effectivePlan)

    // Emotions graph requires Pro plan
    if (!limits.canUseAISummary) {
      return NextResponse.json(
        {
          error: 'El gráfico de emociones requiere plan Pro',
          code: 'PLAN_LIMIT',
          requiredPlan: 'pro',
        },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { bookId, force } = body || {}

    if (!bookId || typeof bookId !== 'string') {
      return NextResponse.json({ error: 'Se requiere bookId' }, { status: 400 })
    }

    // Look up the book (must belong to the user)
    const book = await db.book.findFirst({
      where: { id: bookId, userId },
      select: {
        id: true,
        title: true,
        author: true,
        textContent: true,
        totalChars: true,
        emotions: true,
      },
    })

    if (!book) {
      return NextResponse.json({ error: 'Libro no encontrado' }, { status: 404 })
    }

    // Return cached emotions if exists and force !== true
    if (book.emotions && force !== true) {
      let cachedEmotions: EmotionPoint[] = []
      try {
        cachedEmotions = JSON.parse(book.emotions.data)
        if (Array.isArray(cachedEmotions) && cachedEmotions.length > 0) {
          return NextResponse.json({
            emotions: cachedEmotions,
            totalChars: book.totalChars,
            cached: true,
          })
        }
      } catch {
        // ignore and regenerate
      }
    }

    if (!book.textContent || book.textContent.trim().length === 0) {
      return NextResponse.json(
        { error: 'El libro no tiene contenido de texto para analizar' },
        { status: 400 }
      )
    }

    const text = book.textContent
    const totalChars = book.totalChars > 0 ? book.totalChars : text.length

    // Compute number of segments: min(12, max(6, floor(totalChars / 4000)))
    const segmentCount = Math.min(12, Math.max(6, Math.floor(totalChars / 4000)))
    const segmentSize = Math.ceil(totalChars / segmentCount)
    const sampleSize = 1500

    // Build segment samples
    const segments: Array<{
      idx: number
      charStart: number
      charEnd: number
      sample: string
    }> = []

    for (let i = 0; i < segmentCount; i++) {
      const charStart = i * segmentSize
      const charEnd = Math.min(totalChars, (i + 1) * segmentSize)
      const sample = text.slice(charStart, Math.min(charEnd, charStart + sampleSize))
      segments.push({
        idx: i,
        charStart,
        charEnd,
        sample: sample.length > 0 ? sample : text.slice(0, sampleSize),
      })
    }

    // Build a single prompt with all numbered segments
    const segmentsText = segments
      .map(
        (s) =>
          `[${s.idx + 1}] (caracteres ${s.charStart}-${s.charEnd}):\n${s.sample}`
      )
      .join('\n\n---\n\n')

    const zai = await getZAI()

    const systemPrompt =
      'Eres un analista literario experto en identificar la emoción dominante de fragmentos de texto. ' +
      'Siempre respondes en español. Devuelves únicamente JSON válido, sin texto adicional ni markdown.'

    const userPrompt = `Analiza el libro titulado "${book.title}"${book.author ? ` de ${book.author}` : ''}.

El libro se ha dividido en ${segmentCount} segmentos numerados. Para cada segmento, identifica la emoción dominante.

Emociones permitidas (usa una de estas, escrita exactamente así):
- alegría
- tristeza
- tensión
- misterio
- esperanza
- miedo
- amor
- reflexión
- acción
- calma

Para cada segmento numerado, devuelve un objeto JSON con:
- emotion: una de las emociones permitidas (string)
- intensity: número entero de 1 a 10 (intensidad de la emoción en ese momento)
- label: frase corta de 3-5 palabras que describa el momento (string)

Responde ÚNICAMENTE con un array JSON de ${segmentCount} objetos, sin markdown. Un objeto por cada segmento, en orden.

Segmentos:
${segmentsText}`

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      thinking: { type: 'disabled' },
    })

    const rawContent = completion.choices[0]?.message?.content || ''
    const parsedPoints = parseEmotionArray(rawContent, segmentCount)

    // Compose final emotion points with segmentIdx, charStart, charEnd
    const emotions: EmotionPoint[] = segments.map((seg, i) => {
      const point = parsedPoints[i] || {
        emotion: 'reflexión',
        intensity: 5,
        label: 'Momento del libro',
      }
      return {
        segmentIdx: seg.idx,
        charStart: seg.charStart,
        charEnd: seg.charEnd,
        emotion: point.emotion,
        intensity: point.intensity,
        label: point.label,
      }
    })

    // Upsert into BookEmotion
    await db.bookEmotion.upsert({
      where: { bookId: book.id },
      create: {
        bookId: book.id,
        data: JSON.stringify(emotions),
      },
      update: {
        data: JSON.stringify(emotions),
      },
    })

    return NextResponse.json({
      emotions,
      totalChars,
      cached: false,
    })
  } catch (error) {
    console.error('Emotions error:', error)
    return NextResponse.json(
      { error: 'Error al generar el gráfico de emociones' },
      { status: 500 }
    )
  }
}
