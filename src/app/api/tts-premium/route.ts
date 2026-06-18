import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { getEffectivePlan } from '@/lib/plan-limits'
import { PREMIUM_VOICES, getPremiumVoiceById, type PremiumVoice } from '@/lib/premium-voices'
import { promises as fs } from 'fs'
import path from 'path'
import crypto from 'crypto'

// ─── Cloudflare Workers AI — Deepgram Aura Spanish ───
// Credentials MUST be set as env vars on Vercel:
//   CLOUDFLARE_ACCOUNT_ID  — your Cloudflare account ID
//   CLOUDFLARE_API_TOKEN   — a Cloudflare API token with Workers AI permission
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || ''
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || ''
const CF_TTS_MODEL = '@cf/deepgram/aura-2-es'
const CF_TTS_ENDPOINT = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/${CF_TTS_MODEL}`

// ─── Filesystem cache for generated audio ───
// Cache key = sha256(voice + text). Cache files are MP3.
const CACHE_DIR = path.join(process.cwd(), '.tts-cache')
const MAX_TEXT_LENGTH = 1500 // Deepgram Aura recommended max ~2000 chars per request

// In-memory LRU map (process-lifetime) of cache keys we know exist on disk.
// Avoids redundant fs.stat calls for popular sentences.
const cacheHitMap = new Map<string, boolean>()

async function ensureCacheDir() {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true })
  } catch {}
}

function cacheKey(voice: string, text: string): string {
  return crypto.createHash('sha256').update(`${voice}|${text}`).digest('hex')
}

function cachePath(key: string): string {
  // Use first 2 chars as subdir to spread files across directories
  const subdir = key.slice(0, 2)
  return path.join(CACHE_DIR, subdir, `${key}.mp3`)
}

async function readCache(key: string): Promise<Buffer | null> {
  if (cacheHitMap.get(key) === false) return null
  try {
    const p = cachePath(key)
    const buf = await fs.readFile(p)
    cacheHitMap.set(key, true)
    return buf
  } catch {
    cacheHitMap.set(key, false)
    return null
  }
}

async function writeCache(key: string, buf: Buffer): Promise<void> {
  try {
    const p = cachePath(key)
    await fs.mkdir(path.dirname(p), { recursive: true })
    await fs.writeFile(p, buf)
    cacheHitMap.set(key, true)
  } catch (err) {
    // Non-fatal: cache write failures just mean we re-generate next time
    console.warn('[tts-premium] cache write failed:', err)
  }
}

// Estimate audio duration from MP3 byte count.
// Deepgram Aura output is ~48 kbps mono → ~6 KB per second.
function estimateDurationSeconds(buf: Buffer): number {
  return Math.max(1, Math.round(buf.length / 6000))
}

// Track usage seconds per user (best-effort, non-blocking)
async function trackUsage(userId: string, seconds: number) {
  try {
    // iaHoursUsed is stored as a float in hours
    const hours = seconds / 3600
    await db.user.update({
      where: { id: userId },
      data: { iaHoursUsed: { increment: hours } },
    })
  } catch (err) {
    console.warn('[tts-premium] usage tracking failed:', err)
  }
}

async function callCloudflareTTS(text: string, voice: string): Promise<Buffer> {
  if (!CF_ACCOUNT_ID || !CF_API_TOKEN) {
    throw new Error('CLOUDFLARE_ACCOUNT_ID o CLOUDFLARE_API_TOKEN no configurados. Configúralos en las variables de entorno de Vercel.')
  }
  const resp = await fetch(CF_TTS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, voice }),
  })

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '')
    throw new Error(`Cloudflare TTS ${resp.status}: ${errText.slice(0, 200)}`)
  }

  // Deepgram Aura returns audio/mpeg directly (not JSON base64 like MeloTTS)
  const buf = Buffer.from(await resp.arrayBuffer())
  if (buf.length < 100) {
    throw new Error('Cloudflare TTS returned empty audio')
  }
  return buf
}

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

    // Free users cannot use premium TTS at all
    if (effectivePlan === 'free') {
      return NextResponse.json(
        { error: 'Voces premium requieren plan Plus o Pro', code: 'PLAN_LIMIT', requiredPlan: 'plus' },
        { status: 403 }
      )
    }

    // Parse body
    let body: { text?: string; voice?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
    }

    const text = (body.text || '').trim()
    const voiceId = (body.voice || '').trim()

    if (!text) {
      return NextResponse.json({ error: 'Texto requerido' }, { status: 400 })
    }
    if (!voiceId) {
      return NextResponse.json({ error: 'Voz requerida' }, { status: 400 })
    }
    if (text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `Texto demasiado largo (máx ${MAX_TEXT_LENGTH} caracteres). Divide en oraciones más cortas.` },
        { status: 413 }
      )
    }

    // Validate voice exists and is allowed for user's plan
    const voice: PremiumVoice | undefined = getPremiumVoiceById(voiceId)
    if (!voice) {
      return NextResponse.json({ error: 'Voz no encontrada' }, { status: 404 })
    }

    const planLevel = { free: 0, plus: 1, pro: 2 }
    const userLevel = planLevel[effectivePlan]
    const voiceLevel = planLevel[voice.plan]
    if (voiceLevel > userLevel) {
      return NextResponse.json(
        {
          error: `La voz "${voice.name}" requiere plan ${voice.plan === 'pro' ? 'Pro' : 'Plus'}`,
          code: 'PLAN_LIMIT',
          requiredPlan: voice.plan,
        },
        { status: 403 }
      )
    }

    // ─── Check cache first ───
    await ensureCacheDir()
    const key = cacheKey(voiceId, text)
    const cached = await readCache(key)
    if (cached) {
      // Track usage (best-effort) — estimate duration from byte count
      const dur = estimateDurationSeconds(cached)
      trackUsage(userId, dur)
      return new NextResponse(cached, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': String(cached.length),
          'Cache-Control': 'public, max-age=31536000, immutable',
          'X-TTS-Cache': 'HIT',
          'X-TTS-Voice': voiceId,
        },
      })
    }

    // ─── Call Cloudflare Workers AI (Deepgram Aura Spanish) ───
    let audioBuf: Buffer
    try {
      audioBuf = await callCloudflareTTS(text, voiceId)
    } catch (err) {
      console.error('[tts-premium] Cloudflare TTS error:', err)
      return NextResponse.json(
        { error: 'No se pudo generar el audio. Intenta de nuevo.' },
        { status: 502 }
      )
    }

    // Write to cache (best-effort)
    await writeCache(key, audioBuf)

    // Track usage (best-effort)
    const dur = estimateDurationSeconds(audioBuf)
    trackUsage(userId, dur)

    return new NextResponse(audioBuf, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(audioBuf.length),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-TTS-Cache': 'MISS',
        'X-TTS-Voice': voiceId,
      },
    })
  } catch (err) {
    console.error('[tts-premium] unhandled error:', err)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ─── GET endpoint: list all available premium voices for the user's plan ───
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { plan: true, isVip: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const effectivePlan = getEffectivePlan(user.plan, user.isVip)
    const planLevel = { free: 0, plus: 1, pro: 2 }
    const userLevel = planLevel[effectivePlan]

    const voices = PREMIUM_VOICES.map(v => ({
      id: v.id,
      name: v.name,
      desc: v.desc,
      gender: v.gender,
      plan: v.plan,
      badge: v.badge,
      previewUrl: `/samples/voice-${v.id}.mp3`,
      locked: planLevel[v.plan] > userLevel,
    }))

    return NextResponse.json({ voices, plan: effectivePlan })
  } catch (err) {
    console.error('[tts-premium] GET error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
