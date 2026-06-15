import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { format, subDays } from 'date-fns'

// POST: Create or update a reading log entry and update user stats
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })
    }
    const userId = session.user.id

    const body = await request.json()
    const { bookId, minutes } = body

    if (!bookId || typeof minutes !== 'number' || minutes <= 0) {
      return NextResponse.json(
        { error: 'Se requiere bookId y minutes (número mayor a 0)' },
        { status: 400 }
      )
    }

    // Verify the book belongs to the user
    const book = await db.book.findUnique({
      where: { id: bookId },
      select: { userId: true },
    })
    if (!book || book.userId !== userId) {
      return NextResponse.json({ error: 'Libro no encontrado o sin permiso' }, { status: 403 })
    }

    const today = format(new Date(), 'yyyy-MM-dd')
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')

    // Find existing reading log for this user+book+date
    const existingLog = await db.readingLog.findFirst({
      where: {
        userId,
        bookId,
        date: today,
      },
    })

    // Create or update the reading log
    const log = existingLog
      ? await db.readingLog.update({
          where: { id: existingLog.id },
          data: { minutes: existingLog.minutes + minutes },
        })
      : await db.readingLog.create({
          data: {
            userId,
            bookId,
            minutes,
            date: today,
          },
        })

    // Update user stats
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { totalReadMin: true, streakDays: true, lastReadDate: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Calculate new streak
    let newStreakDays = user.streakDays
    const lastReadDate = user.lastReadDate

    if (lastReadDate === yesterday) {
      // Last read was yesterday — increment streak
      newStreakDays = user.streakDays + 1
    } else if (lastReadDate === today) {
      // Already read today — no change to streak
      newStreakDays = user.streakDays
    } else {
      // Last read was older than yesterday or never — reset to 1
      newStreakDays = 1
    }

    await db.user.update({
      where: { id: userId },
      data: {
        totalReadMin: user.totalReadMin + minutes,
        streakDays: newStreakDays,
        lastReadDate: today,
      },
    })

    return NextResponse.json({
      streakDays: newStreakDays,
      totalReadMin: user.totalReadMin + minutes,
      lastReadDate: today,
      log,
    })
  } catch (error) {
    console.error('Create reading log error:', error)
    return NextResponse.json({ error: 'Error al registrar lectura' }, { status: 500 })
  }
}

// GET: Get reading logs for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })
    }
    const userId = session.user.id

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    // Build the where clause
    const where: any = { userId }

    if (date) {
      // Single date filter
      where.date = date
    } else if (from && to) {
      // Date range filter
      where.date = {
        gte: from,
        lte: to,
      }
    } else if (from) {
      where.date = { gte: from }
    } else if (to) {
      where.date = { lte: to }
    }

    const logs = await db.readingLog.findMany({
      where,
      orderBy: { date: 'desc' },
    })

    return NextResponse.json({ logs })
  } catch (error) {
    console.error('Get reading logs error:', error)
    return NextResponse.json({ error: 'Error al obtener registros de lectura' }, { status: 500 })
  }
}
