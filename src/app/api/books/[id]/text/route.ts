import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })
    }
    const userId = session.user.id

    const { id } = await params

    const book = await db.book.findUnique({
      where: { id },
      select: { userId: true, textContent: true }
    })

    if (!book) {
      return NextResponse.json({ error: 'Libro no encontrado' }, { status: 404 })
    }

    if (book.userId !== userId) {
      return NextResponse.json({ error: 'No tienes permiso para ver este libro' }, { status: 403 })
    }
    
    if (!book.textContent) {
      return NextResponse.json({ text: 'Contenido de demostración. Sube un PDF para leer su contenido real.' })
    }
    
    return NextResponse.json({ text: book.textContent })
  } catch {
    return NextResponse.json({ error: 'Error al obtener el texto del libro' }, { status: 500 })
  }
}
