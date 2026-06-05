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

// POST: Create a highlight
export async function POST(request: NextRequest) {
  try {
    const { bookId, text, note, color, charStart, charEnd } = await request.json()

    if (!bookId || !text || charStart === undefined || charEnd === undefined) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const user = await ensureDemoUser()

    const highlight = await db.highlight.create({
      data: {
        userId: user.id,
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
    const { searchParams } = new URL(request.url)
    const bookId = searchParams.get('bookId')

    if (!bookId) {
      return NextResponse.json({ error: 'Se requiere bookId' }, { status: 400 })
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
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Se requiere id del subrayado' }, { status: 400 })
    }

    await db.highlight.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete highlight error:', error)
    return NextResponse.json({ error: 'Error al eliminar subrayado' }, { status: 500 })
  }
}
