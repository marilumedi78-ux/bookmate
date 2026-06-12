import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// Allow up to 30 seconds for upload (large PDFs can take time)
export const maxDuration = 30

// Generate a random cover color
function randomCoverColor(): string {
  const colors = [
    '#2A9D8F', '#E76F51', '#264653', '#F4A261', '#E9C46A',
    '#606C38', '#283618', '#DDA15E', '#BC6C25', '#3D405B',
    '#81B29A', '#F2CC8F', '#5F0F40', '#9A031E', '#FB8B24',
    '#E36414', '#0F4C5C', '#5C4D7D', '#8ECAE6', '#219EBC',
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })
    }
    const userId = session.user.id

    const body = await request.json()
    const { title, author, fileName, fileHash, text, totalPages, force } = body

    if (!title || !text) {
      return NextResponse.json(
        { error: 'Se requiere título y texto del libro' },
        { status: 400 }
      )
    }

    // Estimate reading time (avg 250 words per minute in Spanish)
    const wordCount = text.split(/\s+/).length
    const estimatedMin = Math.max(1, Math.round(wordCount / 250))

    // Duplicate detection - only by file hash (precise, no false positives)
    if (!force && fileHash) {
      const existingByHash = await db.book.findFirst({
        where: { userId, fileHash }
      })
      if (existingByHash) {
        return NextResponse.json({
          duplicate: true,
          matchType: 'hash',
          existingBook: {
            id: existingByHash.id,
            title: existingByHash.title,
            author: existingByHash.author,
          },
          message: `Ya tienes un libro idéntico: "${existingByHash.title}"`
        })
      }
    }

    // Create the book
    const book = await db.book.create({
      data: {
        userId,
        title,
        author: author || 'Desconocido',
        fileName: fileName || 'unknown.pdf',
        filePath: '', // No longer using file system
        fileHash: fileHash || null,
        coverColor: randomCoverColor(),
        totalPages: totalPages || 0,
        totalChars: text.length,
        estimatedMin,
        textContent: text, // Store text in database
        language: 'es',
      }
    })

    return NextResponse.json({
      book: {
        id: book.id,
        title: book.title,
        author: book.author,
        fileName: book.fileName,
        coverColor: book.coverColor,
        totalPages: book.totalPages,
        totalChars: book.totalChars,
        readChars: book.readChars,
        estimatedMin: book.estimatedMin,
        isFinished: book.isFinished,
        language: book.language,
        createdAt: book.createdAt.toISOString(),
      }
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Error al subir el libro' },
      { status: 500 }
    )
  }
}
