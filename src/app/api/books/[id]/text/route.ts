import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const filePath = join(process.cwd(), 'download', `${id}.txt`)
    const text = await readFile(filePath, 'utf-8')
    return NextResponse.json({ text })
  } catch {
    // If file doesn't exist, return demo text
    return NextResponse.json({ text: 'Contenido de demostración. Sube un PDF para leer su contenido real.' })
  }
}
