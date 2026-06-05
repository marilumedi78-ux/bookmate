import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const book = await db.book.findUnique({
      where: { id },
      select: { textContent: true }
    })
    
    if (!book || !book.textContent) {
      return NextResponse.json({ text: 'Contenido de demostración. Sube un PDF para leer su contenido real.' })
    }
    
    return NextResponse.json({ text: book.textContent })
  } catch {
    return NextResponse.json({ text: 'Contenido de demostración. Sube un PDF para leer su contenido real.' })
  }
}
