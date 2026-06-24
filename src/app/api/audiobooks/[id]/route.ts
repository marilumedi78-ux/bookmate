import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { promises as fs } from 'fs'
import path from 'path'

const STORAGE_DIR = path.join(process.cwd(), '.audiobooks-storage')

// GET /api/audiobooks/[id] — get info about a specific audiobook
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

    const audiobook = await db.audiobook.findUnique({
      where: { id },
      include: {
        book: {
          select: {
            id: true,
            title: true,
            author: true,
            coverColor: true,
          },
        },
      },
    })

    if (!audiobook) {
      return NextResponse.json({ error: 'Audiolibro no encontrado' }, { status: 404 })
    }
    if (audiobook.userId !== userId) {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
    }

    return NextResponse.json({ audiobook })
  } catch (error) {
    console.error('Get audiobook error:', error)
    return NextResponse.json({ error: 'Error al obtener audiolibro' }, { status: 500 })
  }
}

// DELETE /api/audiobooks/[id] — delete an audiobook (DB row + MP3 file if no other users reference it)
export async function DELETE(
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

    const audiobook = await db.audiobook.findUnique({
      where: { id },
      select: { id: true, userId: true, storageKey: true, contentHash: true },
    })

    if (!audiobook) {
      return NextResponse.json({ error: 'Audiolibro no encontrado' }, { status: 404 })
    }
    if (audiobook.userId !== userId) {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
    }

    // Delete the DB row first
    await db.audiobook.delete({ where: { id } })

    // Check if any OTHER user still references this same MP3 (cross-user cache)
    const others = await db.audiobook.findFirst({
      where: {
        contentHash: audiobook.contentHash,
        id: { not: audiobook.id },
      },
      select: { id: true },
    })

    // If no other users reference the MP3, delete the file too
    if (!others) {
      try {
        const filePath = path.join(STORAGE_DIR, audiobook.storageKey)
        await fs.unlink(filePath)
      } catch {
        // Non-fatal: file may already be deleted
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete audiobook error:', error)
    return NextResponse.json({ error: 'Error al eliminar audiolibro' }, { status: 500 })
  }
}
