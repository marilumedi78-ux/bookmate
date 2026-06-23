import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { getEffectivePlan, getPlanLimits } from '@/lib/plan-limits'

// POST /api/books/upload
// Saves a book with its extracted text content (PDF was parsed on the client).
// Body: { title, author, fileName, fileHash, text, totalPages, force? }
//
// Plan-based enforcement:
//   - maxBooks limit per plan (3 free / 20 plus / Infinity pro)
//   - Duplicate detection by fileHash — returns { duplicate: true, ... }
//     unless force=true is passed (user chose to keep both)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })
    }
    const userId = session.user.id

    const body = await request.json()
    const { title, author, fileName, fileHash, text, totalPages, force } = body || {}

    // Validate required fields
    if (!title || !fileName || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: title, fileName, text' },
        { status: 400 }
      )
    }

    // Load user + plan
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { plan: true, isVip: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const effectivePlan = getEffectivePlan(user.plan, user.isVip)
    const limits = getPlanLimits(effectivePlan)

    // ─── Duplicate detection (by hash) ───
    // Only check when force !== true (user already confirmed they want both)
    if (fileHash && force !== true) {
      const existing = await db.book.findFirst({
        where: { userId, fileHash },
        select: {
          id: true,
          title: true,
          author: true,
          fileName: true,
          coverColor: true,
          totalPages: true,
          createdAt: true,
        },
      })
      if (existing) {
        return NextResponse.json({
          duplicate: true,
          matchType: 'hash',
          existingBook: existing,
          message: `Ya subiste un libro con el mismo contenido: "${existing.title}"`,
        })
      }
    }

    // ─── Plan limit check (max books) ───
    if (limits.maxBooks !== Infinity) {
      const currentCount = await db.book.count({ where: { userId } })
      // If force=true (keep both), we still need to enforce the limit.
      if (currentCount >= limits.maxBooks) {
        return NextResponse.json(
          {
            error: `Has alcanzado el límite de ${limits.maxBooks} libros del plan ${effectivePlan === 'free' ? 'Gratis' : effectivePlan}`,
            code: 'PLAN_LIMIT',
            used: currentCount,
            limit: limits.maxBooks,
            requiredPlan: effectivePlan === 'free' ? 'plus' : 'pro',
          },
          { status: 403 }
        )
      }
    }

    // ─── Compute metadata ───
    const totalChars = text.length
    // Estimate reading time: ~900 chars/min for Spanish TTS at 1x
    const estimatedMin = Math.max(1, Math.round(totalChars / 900))

    // Deterministic cover color from title hash (so re-uploads keep same color)
    const coverColors = [
      '#4DB6AC', '#FF8A65', '#BA68C8', '#7986CB', '#4FC3F7',
      '#FFD54F', '#81C784', '#F06292', '#A1887F', '#90A4AE',
    ]
    let colorIdx = 0
    for (let i = 0; i < title.length; i++) {
      colorIdx = (colorIdx + title.charCodeAt(i)) % coverColors.length
    }
    const coverColor = coverColors[colorIdx]

    // ─── Create the book ───
    const book = await db.book.create({
      data: {
        userId,
        title: String(title).slice(0, 500),
        author: author ? String(author).slice(0, 300) : 'Desconocido',
        fileName: String(fileName).slice(0, 500),
        filePath: '', // No file storage — text is stored in DB
        fileHash: fileHash || null,
        coverColor,
        totalPages: typeof totalPages === 'number' ? totalPages : 0,
        totalChars,
        estimatedMin,
        language: 'es',
        textContent: text,
      },
      select: {
        id: true,
        userId: true,
        title: true,
        author: true,
        fileName: true,
        filePath: true,
        fileHash: true,
        coverColor: true,
        totalPages: true,
        currentPage: true,
        currentCharIdx: true,
        totalChars: true,
        readChars: true,
        estimatedMin: true,
        isFinished: true,
        language: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { highlights: true } },
      },
    })

    // ─── Streak update: mark today as a reading day ───
    const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
    const freshUser = await db.user.findUnique({
      where: { id: userId },
      select: { lastReadDate: true, streakDays: true },
    })
    if (freshUser) {
      if (freshUser.lastReadDate !== today) {
        // Compute streak: if yesterday was lastReadDate → +1, else reset to 1
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
        const newStreak = freshUser.lastReadDate === yesterday
          ? (freshUser.streakDays || 0) + 1
          : 1
        await db.user.update({
          where: { id: userId },
          data: { lastReadDate: today, streakDays: newStreak },
        })
      }
    }

    const { _count, ...bookFields } = book
    return NextResponse.json({
      book: { ...bookFields, highlightsCount: _count.highlights },
      duplicate: false,
    })
  } catch (error) {
    console.error('Upload book error:', error)
    return NextResponse.json(
      { error: 'Error al guardar el libro' },
      { status: 500 }
    )
  }
}
