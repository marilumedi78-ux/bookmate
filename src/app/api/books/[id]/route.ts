import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const book = await db.book.findUnique({
      where: { id },
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
        highlights: {
          orderBy: { charStart: 'asc' }
        }
      }
    })

    if (!book) {
      return NextResponse.json({ error: 'Libro no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ book })
  } catch (error) {
    console.error('Get book error:', error)
    return NextResponse.json({ error: 'Error al obtener el libro' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const { currentPage, currentCharIdx, readChars, isFinished } = body

    // Build update data only with provided fields
    const updateData: Record<string, unknown> = {}
    if (currentPage !== undefined) updateData.currentPage = currentPage
    if (currentCharIdx !== undefined) updateData.currentCharIdx = currentCharIdx
    if (readChars !== undefined) updateData.readChars = readChars
    if (isFinished !== undefined) updateData.isFinished = isFinished

    const book = await db.book.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({ book })
  } catch (error) {
    console.error('Update book error:', error)
    return NextResponse.json({ error: 'Error al actualizar el libro' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Delete highlights first (cascade should handle this, but explicit is safer)
    await db.highlight.deleteMany({ where: { bookId: id } })

    // Delete reading logs for this book
    await db.readingLog.deleteMany({ where: { bookId: id } })

    // Delete the book
    await db.book.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete book error:', error)
    return NextResponse.json({ error: 'Error al eliminar el libro' }, { status: 500 })
  }
}
