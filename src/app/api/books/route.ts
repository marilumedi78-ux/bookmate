import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })
    }
    const userId = session.user.id

    const books = await db.book.findMany({
      where: { userId },
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
