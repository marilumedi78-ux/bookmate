import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { getEffectivePlan, getPlanLimits } from '@/lib/plan-limits'
import { getZAI } from '@/lib/zai'

// Build a representative ~12000 char sample: beginning + middle + end of the text
function buildSample(text: string, maxLen = 12000): string {
  if (text.length <= maxLen) return text

  const third = Math.floor(maxLen / 3)
  const begin = text.slice(0, third)
  const midStart = Math.floor((text.length - third) / 2)
  const middle = text.slice(midStart, midStart + third)
  const end = text.slice(text.length - third)

  return `${begin}\n\n[...]\n\n${middle}\n\n[...]\n\n${end}`
}

// Strip markdown code fences and parse JSON defensively
function parseSummaryJSON(raw: string): {
  keyPoints: string[]
  quotes: string[]
  targetReader: string
} {
  let cleaned = raw.trim()

  // Strip ```json ... ``` or ``` ... ``` fences
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim()
  }

  // Try direct JSON.parse first
  try {
    const parsed = JSON.parse(cleaned)
    return {
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints.map(String) : [],
      quotes: Array.isArray(parsed.quotes) ? parsed.quotes.map(String) : [],
      targetReader: typeof parsed.targetReader === 'string' ? parsed.targetReader : '',
    }
  } catch {
    // fall through to fallback strategies
  }

  // Fallback: try to find first { ... } block
  const objMatch = cleaned.match(/\{[\s\S]*\}/)
  if (objMatch) {
    try {
      const parsed = JSON.parse(objMatch[0])
      return {
        keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints.map(String) : [],
        quotes: Array.isArray(parsed.quotes) ? parsed.quotes.map(String) : [],
        targetReader: typeof parsed.targetReader === 'string' ? parsed.targetReader : '',
      }
    } catch {
      // fall through
    }
  }

  // Last resort fallback: split content by lines and pick whatever looks like content
  const lines = cleaned
    .split('\n')
    .map((l) => l.replace(/^[-*\d.\]\[\s]+/, '').trim())
    .filter(Boolean)

  return {
    keyPoints: lines.slice(0, 3),
    quotes: lines.slice(3, 8),
    targetReader: lines.slice(8).join(' ') || 'Lectores interesados en el tema del libro',
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Debes iniciar sesión para usar el resumen IA' },
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

    // AI Summary requires Pro plan
    if (!limits.canUseAISummary) {
      return NextResponse.json(
        {
          error: 'El resumen IA requiere plan Pro',
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
        summary: true,
      },
    })

    if (!book) {
      return NextResponse.json({ error: 'Libro no encontrado' }, { status: 404 })
    }

    // Return cached summary if exists and force !== true
    if (book.summary && force !== true) {
      let keyPoints: string[] = []
      let quotes: string[] = []
      let targetReader = ''
      try {
        keyPoints = JSON.parse(book.summary.keyPoints)
        quotes = JSON.parse(book.summary.quotes)
        targetReader = book.summary.targetReader
      } catch {
        // ignore parse errors and regenerate below
      }

      if (keyPoints.length || quotes.length || targetReader) {
        return NextResponse.json({
          keyPoints,
          quotes,
          targetReader,
          cached: true,
        })
      }
    }

    if (!book.textContent || book.textContent.trim().length === 0) {
      return NextResponse.json(
        { error: 'El libro no tiene contenido de texto para resumir' },
        { status: 400 }
      )
    }

    const sample = buildSample(book.textContent, 12000)

    const zai = await getZAI()

    const systemPrompt =
      'Eres un editor literario experto que analiza libros y produce resúmenes estructurados. ' +
      'Siempre respondes en español. Devuelves únicamente JSON válido, sin texto adicional ni markdown.'

    const userPrompt = `Analiza el siguiente libro titulado "${book.title}"${book.author ? ` de ${book.author}` : ''}.

Tu tarea es generar un resumen con:
1. Tres puntos clave (ideas principales del libro)
2. Cinco citas memorables (frases destacadas literales o paráfrasis cercanas al texto)
3. Una frase describiendo para quién es este libro (targetReader)

Devuelve ÚNICAMENTE un objeto JSON con esta estructura EXACTA:
{
  "keyPoints": ["punto 1", "punto 2", "punto 3"],
  "quotes": ["cita 1", "cita 2", "cita 3", "cita 4", "cita 5"],
  "targetReader": "Una frase describiendo para quién es este libro"
}

Responde ÚNICAMENTE con JSON válido, sin texto adicional ni markdown.

Contenido del libro:
${sample}`

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      thinking: { type: 'disabled' },
    })

    const rawContent = completion.choices[0]?.message?.content || ''

    const parsed = parseSummaryJSON(rawContent)

    // Ensure we have the expected counts (pad/truncate defensively)
    while (parsed.keyPoints.length < 3) parsed.keyPoints.push('')
    if (parsed.keyPoints.length > 3) parsed.keyPoints = parsed.keyPoints.slice(0, 3)

    while (parsed.quotes.length < 5) parsed.quotes.push('')
    if (parsed.quotes.length > 5) parsed.quotes = parsed.quotes.slice(0, 5)

    if (!parsed.targetReader) {
      parsed.targetReader = 'Lectores interesados en el tema del libro'
    }

    // Upsert into BookSummary
    await db.bookSummary.upsert({
      where: { bookId: book.id },
      create: {
        bookId: book.id,
        keyPoints: JSON.stringify(parsed.keyPoints),
        quotes: JSON.stringify(parsed.quotes),
        targetReader: parsed.targetReader,
      },
      update: {
        keyPoints: JSON.stringify(parsed.keyPoints),
        quotes: JSON.stringify(parsed.quotes),
        targetReader: parsed.targetReader,
      },
    })

    return NextResponse.json({
      keyPoints: parsed.keyPoints,
      quotes: parsed.quotes,
      targetReader: parsed.targetReader,
      cached: false,
    })
  } catch (error) {
    console.error('Summary error:', error)
    return NextResponse.json(
      { error: 'Error al generar el resumen del libro' },
      { status: 500 }
    )
  }
}
