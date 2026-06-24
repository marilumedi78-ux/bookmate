import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { getEffectivePlan, getPlanLimits, ensureMonthlyUsageReset } from '@/lib/plan-limits'
import { getPremiumVoiceById } from '@/lib/premium-voices'
import { synthesizeText } from '@/lib/google-tts'
import crypto from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'

// Maximum text length we accept for a full audiobook generation.
// Books longer than this will be rejected (the user can still read in-app
// via the live TTS — just can't download as a single MP3).
// 1.5M chars ≈ 250k words ≈ ~500 page book. Plenty for almost any book.
const MAX_TOTAL_CHARS = 1_500_000

// Where we store the generated MP3 files (filesystem, server-local).
// For production with multiple Vercel serverless instances, this should be
// replaced with Vercel Blob storage. For now, this works for a single instance.
const STORAGE_DIR = path.join(process.cwd(), '.audiobooks-storage')

async function ensureStorageDir() {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true })
  } catch {}
}

// POST /api/audiobooks/generate
// Body: { bookId, voiceId }
// Response: { audiobook: { id, status, ... } }
//
// Flow:
//   1. Validate session + plan (Pro only)
//   2. Validate bookId (must belong to user, must have textContent)
//   3. Validate voiceId (must be a valid premium voice)
//   4. Check if an audiobook already exists for this (bookId, voiceId) — if so,
//      return it instead of regenerating. This is the cross-user cache.
//   5. Check monthly quota (maxAudiobookHoursPerMonth)
//   6. Create a pending Audiobook row
//   7. Generate the MP3 (synthesizeText)
//   8. Save the MP3 to filesystem
//   9. Update the Audiobook row with status=ready, durationSec, sizeBytes
//  10. Update user.audiobookHoursUsed
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })
    }
    const userId = session.user.id

    // ─── Load user + plan ───
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { plan: true, isVip: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const effectivePlan = getEffectivePlan(user.plan, user.isVip)
    const limits = getPlanLimits(effectivePlan)

    if (!limits.canDownloadAudiobooks) {
      return NextResponse.json(
        {
          error: 'La descarga de audiolibros en MP3 requiere el plan Pro',
          code: 'PLAN_LIMIT',
          requiredPlan: 'pro',
        },
        { status: 403 }
      )
    }

    // ─── Parse body ───
    const body = await request.json()
    const { bookId, voiceId } = body || {}

    if (!bookId || !voiceId) {
      return NextResponse.json(
        { error: 'Se requieren bookId y voiceId' },
        { status: 400 }
      )
    }

    // ─── Validate voice ───
    const voice = getPremiumVoiceById(voiceId)
    if (!voice) {
      return NextResponse.json({ error: 'Voz premium no encontrada' }, { status: 400 })
    }

    // ─── Validate book ───
    const book = await db.book.findUnique({
      where: { id: bookId },
      select: { id: true, userId: true, title: true, textContent: true },
    })
    if (!book) {
      return NextResponse.json({ error: 'Libro no encontrado' }, { status: 404 })
    }
    if (book.userId !== userId) {
      return NextResponse.json({ error: 'No tienes permiso sobre este libro' }, { status: 403 })
    }
    if (!book.textContent || book.textContent.trim().length === 0) {
      return NextResponse.json(
        { error: 'Este libro no tiene texto para generar audio' },
        { status: 400 }
      )
    }
    if (book.textContent.length > MAX_TOTAL_CHARS) {
      return NextResponse.json(
        {
          error: `El libro es demasiado largo para generar MP3 (${book.textContent.length} caracteres, máx ${MAX_TOTAL_CHARS}).`,
        },
        { status: 413 }
      )
    }

    // ─── Cross-user cache: check if this book+voice already has an MP3 ───
    const contentHash = crypto
      .createHash('sha256')
      .update(`${book.textContent}|${voiceId}`)
      .digest('hex')

    const existing = await db.audiobook.findFirst({
      where: { contentHash, status: 'ready' },
    })
    if (existing) {
      // Create a new Audiobook row for THIS user pointing at the same storageKey.
      // This way each user has their own row (for cuota tracking + deletion),
      // but the actual MP3 bytes are shared.
      const audiobook = await db.audiobook.create({
        data: {
          userId,
          bookId,
          voiceId,
          contentHash,
          storageKey: existing.storageKey,
          durationSec: existing.durationSec,
          sizeBytes: existing.sizeBytes,
          status: 'ready',
        },
      })
      return NextResponse.json({
        audiobook,
        cached: true,
        message: 'Audiolibro ya estaba generado — reutilizando MP3 existente.',
      })
    }

    // ─── Quota check ───
    const usage = await ensureMonthlyUsageReset(userId)
    const usedHours = usage.audiobookHoursUsed
    const estimatedHours = book.textContent.length / 14 / 3600 // ~14 chars/sec
    if (usedHours + estimatedHours > limits.maxAudiobookHoursPerMonth) {
      return NextResponse.json(
        {
          error: `Has alcanzado el límite mensual de ${limits.maxAudiobookHoursPerMonth} horas de audiolibros. Ya usaste ${usedHours.toFixed(1)}h. Este libro requiere ~${estimatedHours.toFixed(1)}h más.`,
          code: 'QUOTA_EXCEEDED',
          usedHours: usedHours.toFixed(1),
          limitHours: limits.maxAudiobookHoursPerMonth,
          requiredHours: estimatedHours.toFixed(1),
        },
        { status: 403 }
      )
    }

    // ─── Create pending Audiobook row ───
    const storageKey = `${contentHash}.mp3`
    const audiobook = await db.audiobook.create({
      data: {
        userId,
        bookId,
        voiceId,
        contentHash,
        storageKey,
        status: 'pending',
      },
    })

    // ─── Generate the MP3 ───
    try {
      const result = await synthesizeText(book.textContent, voice)

      // Save to filesystem
      await ensureStorageDir()
      const filePath = path.join(STORAGE_DIR, storageKey)
      await fs.writeFile(filePath, result.audioBuffer)

      // Update the Audiobook row
      const updated = await db.audiobook.update({
        where: { id: audiobook.id },
        data: {
          status: 'ready',
          durationSec: result.durationSec,
          sizeBytes: result.audioBuffer.length,
        },
      })

      // Track usage (in hours)
      const hoursUsed = result.durationSec / 3600
      await db.user.update({
        where: { id: userId },
        data: { audiobookHoursUsed: { increment: hoursUsed } },
      })

      return NextResponse.json({
        audiobook: updated,
        cached: false,
        message: 'Audiolibro generado correctamente.',
      })
    } catch (err) {
      // Mark the Audiobook row as failed
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      await db.audiobook.update({
        where: { id: audiobook.id },
        data: { status: 'failed', errorMessage },
      })
      return NextResponse.json(
        { error: `Error generando audio: ${errorMessage}` },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Generate audiobook error:', error)
    return NextResponse.json(
      { error: 'Error al generar el audiolibro' },
      { status: 500 }
    )
  }
}
