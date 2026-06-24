import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { promises as fs } from 'fs'
import path from 'path'

const STORAGE_DIR = path.join(process.cwd(), '.audiobooks-storage')

// GET /api/audiobooks/[id]/stream — stream the MP3 file
//
// Supports HTTP Range requests so the audio element can seek.
// Returns the raw MP3 bytes with Content-Type: audio/mpeg.
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
      select: {
        id: true,
        userId: true,
        storageKey: true,
        status: true,
        sizeBytes: true,
        durationSec: true,
      },
    })

    if (!audiobook) {
      return NextResponse.json({ error: 'Audiolibro no encontrado' }, { status: 404 })
    }
    if (audiobook.userId !== userId) {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
    }
    if (audiobook.status !== 'ready') {
      return NextResponse.json(
        { error: `Audiolibro no está listo (estado: ${audiobook.status})` },
        { status: 409 }
      )
    }

    const filePath = path.join(STORAGE_DIR, audiobook.storageKey)

    // Read the file
    let fileBuffer: Buffer
    try {
      fileBuffer = await fs.readFile(filePath)
    } catch {
      return NextResponse.json(
        { error: 'Archivo de audio no encontrado en el servidor' },
        { status: 500 }
      )
    }

    // ─── Handle HTTP Range requests (for seek support) ───
    const range = request.headers.get('range')
    if (range) {
      // Parse "bytes=start-end"
      const match = /bytes=(\d*)-(\d*)/.exec(range)
      if (match) {
        const start = match[1] ? parseInt(match[1], 10) : 0
        const end = match[2] ? parseInt(match[2], 10) : fileBuffer.length - 1

        if (start >= fileBuffer.length || end >= fileBuffer.length || start > end) {
          return new NextResponse(null, {
            status: 416,
            headers: {
              'Content-Range': `bytes */${fileBuffer.length}`,
            },
          })
        }

        const chunk = fileBuffer.subarray(start, end + 1)
        return new NextResponse(chunk as unknown as BodyInit, {
          status: 206,
          headers: {
            'Content-Type': 'audio/mpeg',
            'Content-Range': `bytes ${start}-${end}/${fileBuffer.length}`,
            'Content-Length': chunk.length.toString(),
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'private, max-age=0',
          },
        })
      }
    }

    // Full response (no range)
    return new NextResponse(fileBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': fileBuffer.length.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, max-age=0',
      },
    })
  } catch (error) {
    console.error('Stream audiobook error:', error)
    return NextResponse.json({ error: 'Error al reproducir audiolibro' }, { status: 500 })
  }
}
