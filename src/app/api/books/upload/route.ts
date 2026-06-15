import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { getEffectivePlan, getPlanLimits } from '@/lib/plan-limits'

// Cover color palette for book covers
const COVER_COLORS = [
  '#4DB6AC', '#FF8A65', '#9575CD', '#4FC3F7', '#81C784',
  '#FFB74D', '#F06292', '#7986CB', '#A1887F', '#90A4AE',
  '#E57373', '#64B5F6', '#AED581', '#FFD54F', '#BA68C8',
]

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

    // Check book count limit
    const currentBookCount = await db.book.count({
      where: { userId },
    })

    if (limits.maxBooks !== Infinity && currentBookCount >= limits.maxBooks) {
      return NextResponse.json(
        {
          error: `Has alcanzado el límite de ${limits.maxBooks} libros del plan ${effectivePlan === 'free' ? 'Gratis' : 'Plus'}. Mejora tu plan para subir más libros.`,
          code: 'PLAN_LIMIT',
          used: currentBookCount,
          limit: limits.maxBooks,
          requiredPlan: effectivePlan === 'free' ? 'plus' : 'pro',
        },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { title, author, fileName, fileHash, text, totalPages, force } = body

    if (!title || !fileName) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    // Check for duplicates (unless force flag is set)
    if (!force && fileHash) {
      const existingByHash = await db.book.findFirst({
        where: { userId, fileHash },
      })
      if (existingByHash) {
        return NextResponse.json({
          duplicate: true,
          matchType: 'hash',
          existingBook: existingByHash,
          message: 'Ya tienes un libro idéntico en tu biblioteca.',
        })
      }
    }

    // Check for duplicate by title+author (metadata match)
    if (!force) {
      const existingByMeta = await db.book.findFirst({
        where: {
          userId,
          title,
          author: author || 'Desconocido',
        },
      })
      if (existingByMeta) {
        return NextResponse.json({
          duplicate: true,
          matchType: 'metadata',
          existingBook: existingByMeta,
          message: 'Ya tienes un libro con el mismo título y autor.',
        })
      }
    }

    // Generate a cover color
    const coverColor = COVER_COLORS[Math.floor(Math.random() * COVER_COLORS.length)]

    // Estimate reading time: ~250 words per minute, ~5 chars per word in Spanish
    const charCount = text?.length || 0
    const estimatedMin = Math.max(1, Math.round(charCount / (250 * 5)))

    // Create the book
    const book = await db.book.create({
      data: {
        userId,
        title,
        author: author || 'Desconocido',
        fileName,
        filePath: '',
        fileHash: fileHash || null,
        coverColor,
        totalPages: totalPages || 0,
        totalChars: charCount,
        readChars: 0,
        estimatedMin,
        textContent: text || null,
        language: 'es',
      },
    })

    return NextResponse.json({ book })
  } catch (error) {
    console.error('Book upload error:', error)
    return NextResponse.json({ error: 'Error al subir el libro' }, { status: 500 })
  }
}
