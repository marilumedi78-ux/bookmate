import { NextRequest, NextResponse } from 'next/server'
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
    const body = await request.json()
    const { title, author, fileName, fileHash, text, totalPages, force } = body

    if (!title || !text) {
      return NextResponse.json(
        { error: 'Se requiere título y texto del libro' },
        { status: 400 }
      )
    }

    const user = await ensureDemoUser()

    // Estimate reading time (avg 250 words per minute in Spanish)
    const wordCount = text.split(/\s+/).length
    const estimatedMin = Math.max(1, Math.round(wordCount / 250))

    // Duplicate detection (unless force=true)
    if (!force) {
      // Check by file hash
      if (fileHash) {
        const existingByHash = await db.book.findFirst({
          where: { userId: user.id, fileHash }
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

      // Check by title + author
      const existingByMeta = await db.book.findFirst({
        where: {
          userId: user.id,
          title: { equals: title, mode: 'insensitive' },
          author: { equals: author || 'Desconocido', mode: 'insensitive' },
        }
      })
      if (existingByMeta) {
        return NextResponse.json({
          duplicate: true,
          matchType: 'metadata',
          existingBook: {
            id: existingByMeta.id,
            title: existingByMeta.title,
            author: existingByMeta.author,
          },
          message: `Ya tienes un libro con el mismo título y autor: "${existingByMeta.title}"`
        })
      }
    }

    // Create the book
    const book = await db.book.create({
      data: {
        userId: user.id,
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
