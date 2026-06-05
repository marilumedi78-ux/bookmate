import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import pdf from 'pdf-parse'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó ningún archivo' }, { status: 400 })
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Solo se aceptan archivos PDF' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Extract text from PDF
    const data = await pdf(buffer)
    const text = data.text || ''

    // Ensure demo user exists
    const user = await ensureDemoUser()

    // Pick a random cover color
    const coverColor = COVER_COLORS[Math.floor(Math.random() * COVER_COLORS.length)]

    // Extract metadata
    const title = (data.info?.Title as string) || file.name.replace(/\.pdf$/i, '') || 'Sin título'
    const author = (data.info?.Author as string) || 'Desconocido'
    const totalPages = data.numpages || 0
    const totalChars = text.length
    const estimatedMin = Math.ceil(text.split(/\s+/).filter(Boolean).length / 150)

    // Create the book record
    const book = await db.book.create({
      data: {
        userId: user.id,
        title,
        author,
        fileName: file.name,
        filePath: `download/${file.name}`, // stored path reference
        coverColor,
        totalPages,
        totalChars,
        estimatedMin,
        language: 'es',
      }
    })

    // Save extracted text to download directory
    const downloadDir = join(process.cwd(), 'download')
    await mkdir(downloadDir, { recursive: true })
    const textFilePath = join(downloadDir, `${book.id}.txt`)
    await writeFile(textFilePath, text, 'utf-8')

    return NextResponse.json({ book })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Error al procesar el PDF' }, { status: 500 })
  }
}
