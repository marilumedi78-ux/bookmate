import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { ensureMonthlyUsageReset, getEffectivePlan, getPlanLimits } from '@/lib/plan-limits'
import { getZAI } from '@/lib/zai'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })
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

    // Check if user has access to AI Voice
    if (!limits.canUseIAVoice) {
      return NextResponse.json(
        { error: 'Voz IA requiere plan Plus o Pro', code: 'PLAN_LIMIT', requiredPlan: 'plus' },
        { status: 403 }
      )
    }

    // Check monthly usage limit
    const usage = await ensureMonthlyUsageReset(userId)
    if (usage.iaHoursUsed >= limits.maxIaVoiceHoursPerMonth) {
      return NextResponse.json(
        {
          error: `Has alcanzado el límite de ${limits.maxIaVoiceHoursPerMonth} horas de voz IA este mes`,
          code: 'USAGE_LIMIT',
          used: usage.iaHoursUsed,
          limit: limits.maxIaVoiceHoursPerMonth,
        },
        { status: 403 }
      )
    }

    const { text, speed, voice } = await request.json()

    // Check speed restriction: free users can only use speed 1.0
    if (speed && speed !== 1 && !limits.canUseAllSpeeds) {
      return NextResponse.json(
        { error: 'Velocidades avanzadas requieren plan Plus o Pro', code: 'PLAN_LIMIT', requiredPlan: 'plus' },
        { status: 403 }
      )
    }

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'Se requiere texto para generar audio' }, { status: 400 })
    }

    // Validate voice parameter — only allow known voices
    const ALLOWED_VOICES = ['tongtong', 'chuichui', 'xiaochen', 'jam', 'kazi', 'douji', 'luodo']
    const selectedVoice = voice && ALLOWED_VOICES.includes(voice) ? voice : 'tongtong'

    // SDK limit is 1024 chars per request — truncate to avoid errors
    const truncatedText = text.slice(0, 1024)

    const zai = await getZAI()

    // CRITICAL: SDK API is zai.audio.tts.create({ input, voice, ... })
    // NOT zai.tts.create({ text, voice }) — using wrong params causes voice to be ignored
    // NOTE: 'mp3' format is NOT supported by the API — use 'wav' instead
    const audioResponse = await zai.audio.tts.create({
      input: truncatedText,
      voice: selectedVoice,
      response_format: 'wav',
      stream: false,
    })

    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer())

    // Estimate audio duration: average speech rate ~150 words/min, ~5 chars per word in Spanish
    // So ~750 chars/min. More accurately, TTS is roughly 1 minute per 750 characters.
    const estimatedMinutes = truncatedText.length / 750
    const estimatedHours = estimatedMinutes / 60

    // Update usage tracking
    await db.user.update({
      where: { id: userId },
      data: {
        iaHoursUsed: usage.iaHoursUsed + estimatedHours,
      },
    })

    // Return audio as streaming response (WAV format)
    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/wav',
        'Cache-Control': 'no-cache',
        'X-Ia-Hours-Used': (usage.iaHoursUsed + estimatedHours).toFixed(4),
        'X-Ia-Hours-Limit': limits.maxIaVoiceHoursPerMonth.toString(),
      },
    })
  } catch (error) {
    console.error('TTS error:', error)
    const errMsg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Error generando audio', details: errMsg }, { status: 500 })
  }
}
