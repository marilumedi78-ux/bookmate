import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/audiobooks/list
// Returns all audiobooks for the current user (with book title + voice name).
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })
    }
    const userId = session.user.id

    const audiobooks = await db.audiobook.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        book: {
          select: {
            id: true,
            title: true,
            author: true,
            coverColor: true,
          },
        },
      },
    })

    return NextResponse.json({ audiobooks })
  } catch (error) {
    console.error('List audiobooks error:', error)
    return NextResponse.json(
      { error: 'Error al obtener audiolibros' },
      { status: 500 }
    )
  }
}
