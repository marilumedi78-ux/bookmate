import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Helper to ensure demo user exists
async function ensureDemoUser() {
  let user = await db.user.findUnique({ where: { email: 'demo@bookmate.app' } })
  if (!user) {
    user = await db.user.create({
      data: { email: 'demo@bookmate.app', name: 'Usuario Demo', plan: 'pro', isVip: true }
    })
  }
  return user
}

export async function GET() {
  try {
    const user = await ensureDemoUser()

    const books = await db.book.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
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
        _count: {
          select: { highlights: true }
        }
      }
    })

    // Transform to include highlightsCount at top level
    const result = books.map(({ _count, ...book }) => ({
      ...book,
      highlightsCount: _count.highlights
    }))

    return NextResponse.json({ books: result })
  } catch (error) {
    console.error('Get books error:', error)
    return NextResponse.json({ error: 'Error al obtener libros' }, { status: 500 })
  }
}
