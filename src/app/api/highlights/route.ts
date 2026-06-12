import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// POST: Create a highlight
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })
    }
    const userId = session.user.id

    const { bookId, text, note, color, charStart, charEnd } = await request.json()

    if (!bookId || !text || charStart === undefined || charEnd === undefined) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    // Verify the book belongs to the user
    const book = await db.book.findUnique({ where: { id: bookId }, select: { userId: true } })
    if (!book || book.userId !== userId) {
      return NextResponse.json({ error: 'Libro no encontrado o sin permiso' }, { status: 403 })
    }

    const highlight = await db.highlight.create({
      data: {
        userId,
        bookId,
        text,
        note: note || null,
        color: color || '#FBBF24',
        charStart,
        charEnd,
      }
    })

    return NextResponse.json({ highlight })
  } catch (error) {
    console.error('Create highlight error:', error)
    return NextResponse.json({ error: 'Error al crear subrayado' }, { status: 500 })
  }
}

// GET: Get highlights for a book (query param: bookId)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })
    }
    const userId = session.user.id

    const { searchParams } = new URL(request.url)
    const bookId = searchParams.get('bookId')

    if (!bookId) {
      return NextResponse.json({ error: 'Se requiere bookId' }, { status: 400 })
    }

    // Verify the book belongs to the user
    const book = await db.book.findUnique({ where: { id: bookId }, select: { userId: true } })
    if (!book || book.userId !== userId) {
      return NextResponse.json({ error: 'Libro no encontrado o sin permiso' }, { status: 403 })
    }

    const highlights = await db.highlight.findMany({
      where: { bookId },
      orderBy: { charStart: 'asc' }
    })

    return NextResponse.json({ highlights })
  } catch (error) {
    console.error('Get highlights error:', error)
    return NextResponse.json({ error: 'Error al obtener subrayados' }, { status: 500 })
  }
}

// DELETE: Delete a highlight by id
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })
    }
    const userId = session.user.id

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Se requiere id del subrayado' }, { status: 400 })
    }

    // Verify the highlight belongs to the user
    const highlight = await db.highlight.findUnique({ where: { id }, select: { userId: true } })
    if (!highlight || highlight.userId !== userId) {
      return NextResponse.json({ error: 'Subrayado no encontrado o sin permiso' }, { status: 403 })
    }

    await db.highlight.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete highlight error:', error)
    return NextResponse.json({ error: 'Error al eliminar subrayado' }, { status: 500 })
  }
}
