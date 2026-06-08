import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createHash } from 'crypto'

// Nice cover colors for book cards
const COVER_COLORS = [
  '#2A9D8F', '#E76F51', '#F4A261', '#E9C46A', '#264653',
  '#D62828', '#6A994E', '#BC6C25', '#8338EC', '#3A86FF',
  '#FF006E', '#FB5607',
]

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, author, fileName, fileHash, text, totalPages, force } = body

    if (!title || !text) {
      return NextResponse.json({ error: 'Faltan datos requeridos (título y texto)' }, { status: 400 })
    }

    // Ensure demo user exists
    const user = await ensureDemoUser()

    // Skip duplicate checks if force=true
    if (force !== 'true' && fileHash) {
      const existingByHash = await db.book.findFirst({
        where: { userId: user.id, fileHash }
      })
      if (existingByHash) {
        return NextResponse.json({
          duplicate: true,
          matchType: 'hash',
          existingBook: existingByHash,
          message: '¡Ya tienes este libro en tu biblioteca!'
        })
      }
    }

    // Check for duplicates by title + author
    if (force !== 'true') {
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
          existingBook: existingByMeta,
          message: `Parece que ya tienes "${title}" en tu biblioteca.`
        })
      }
    }

    const coverColor = COVER_COLORS[Math.floor(Math.random() * COVER_COLORS.length)]
    const totalChars = text.length
    const estimatedMin = Math.ceil(text.split(/\s+/).filter(Boolean).length / 150)

    const book = await db.book.create({
      data: {
        userId: user.id,
        title,
        author: author || 'Desconocido',
        fileName: fileName || 'unknown.pdf',
        filePath: '',
        fileHash: fileHash || null,
        coverColor,
        totalPages: totalPages || 0,
        totalChars,
        estimatedMin,
        language: 'es',
        textContent: text,
      }
    })

    return NextResponse.json({ duplicate: false, book })
  } catch (error) {
    console.error('Upload error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ 
      error: 'Error al guardar el libro',
      details: errorMessage 
    }, { status: 500 })
  }
}
