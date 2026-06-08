import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { extractPdfText } from '@/lib/pdf-extract'
import { createHash } from 'crypto'

// Nice cover colors for book cards
const COVER_COLORS = [
  '#2A9D8F', // teal
  '#E76F51', // coral
  '#F4A261', // sandy
  '#E9C46A', // golden
  '#264653', // dark teal
  '#D62828', // red
  '#6A994E', // green
  '#BC6C25', // brown
  '#8338EC', // purple
  '#3A86FF', // blue
  '#FF006E', // pink
  '#FB5607', // orange
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

// Compute SHA-256 hash from buffer
function computeHash(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const force = formData.get('force') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó ningún archivo' }, { status: 400 })
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Solo se aceptan archivos PDF' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Compute file hash for duplicate detection
    const fileHash = computeHash(buffer)

    // Ensure demo user exists
    const user = await ensureDemoUser()

    // Skip duplicate checks if force=true (user chose "Guardar ambos")
    if (force !== 'true') {
      // Check for duplicates by hash (exact same file)
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

    // Extract text from PDF
    const data = await extractPdfText(buffer)
    const text = data.text || ''

    // Extract metadata
    const title = (data.info?.Title as string) || file.name.replace(/\.pdf$/i, '') || 'Sin título'
    const author = (data.info?.Author as string) || 'Desconocido'

    // Check for duplicates by title + author (different file, same book)
    // Skip if force=true
    if (force !== 'true') {
      const existingByMeta = await db.book.findFirst({
        where: {
          userId: user.id,
          title: { equals: title, mode: 'insensitive' },
          author: { equals: author, mode: 'insensitive' },
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

    // Pick a random cover color
    const coverColor = COVER_COLORS[Math.floor(Math.random() * COVER_COLORS.length)]
    const totalPages = data.numpages || 0
    const totalChars = text.length
    const estimatedMin = Math.ceil(text.split(/\s+/).filter(Boolean).length / 150)

    // Create the book record with text stored in DB
    const book = await db.book.create({
      data: {
        userId: user.id,
        title,
        author,
        fileName: file.name,
        filePath: '',
        fileHash,
        coverColor,
        totalPages,
        totalChars,
        estimatedMin,
        language: 'es',
        textContent: text,
      }
    })

    return NextResponse.json({ duplicate: false, book })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Error al procesar el PDF' }, { status: 500 })
  }
}
