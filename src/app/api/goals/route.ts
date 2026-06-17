import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { format, startOfWeek, endOfWeek } from 'date-fns'

// GET /api/goals
// FREE for ALL plans. Returns the user's reading goals plus today's and this week's progress.
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Debes iniciar sesión' },
        { status: 401 }
      )
    }
    const userId = session.user.id

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { dailyGoalMin: true, weeklyGoalDays: true },
    })
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    const dailyGoalMin = user.dailyGoalMin ?? 20
    const weeklyGoalDays = user.weeklyGoalDays ?? 5

    // Today's progress: sum minutes from ReadingLog where date === today
    const today = format(new Date(), 'yyyy-MM-dd')
    const todayLogs = await db.readingLog.findMany({
      where: { userId, date: today },
      select: { minutes: true },
    })
    const todayMinutes = todayLogs.reduce((sum, l) => sum + l.minutes, 0)

    // Weekly progress: count distinct dates in the current week (Monday-Sunday)
    const now = new Date()
    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
    const weekLogs = await db.readingLog.findMany({
      where: {
        userId,
        date: {
          gte: format(weekStart, 'yyyy-MM-dd'),
          lte: format(weekEnd, 'yyyy-MM-dd'),
        },
      },
      select: { date: true },
    })
    const distinctDates = new Set(weekLogs.map((l) => l.date))
    const weekDaysRead = distinctDates.size

    const dailyProgress = Math.min(1, todayMinutes / dailyGoalMin)
    const weeklyProgress = Math.min(1, weekDaysRead / weeklyGoalDays)
    const dailyCompleted = todayMinutes >= dailyGoalMin
    const weeklyCompleted = weekDaysRead >= weeklyGoalDays

    return NextResponse.json({
      dailyGoalMin,
      weeklyGoalDays,
      todayMinutes,
      weekDaysRead,
      dailyProgress,
      weeklyProgress,
      dailyCompleted,
      weeklyCompleted,
    })
  } catch (error) {
    console.error('Get goals error:', error)
    return NextResponse.json(
      { error: 'Error al obtener las metas de lectura' },
      { status: 500 }
    )
  }
}

// PUT /api/goals
// FREE for ALL plans. Updates the user's reading goals.
// Body: { dailyGoalMin?: number, weeklyGoalDays?: number }
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Debes iniciar sesión' },
        { status: 401 }
      )
    }
    const userId = session.user.id

    const body = await request.json().catch(() => ({}))
    const { dailyGoalMin, weeklyGoalDays } = body as {
      dailyGoalMin?: number
      weeklyGoalDays?: number
    }

    // Validate provided fields
    const data: { dailyGoalMin?: number; weeklyGoalDays?: number } = {}

    if (dailyGoalMin !== undefined) {
      if (
        typeof dailyGoalMin !== 'number' ||
        !Number.isFinite(dailyGoalMin) ||
        dailyGoalMin < 1 ||
        dailyGoalMin > 480 ||
        !Number.isInteger(dailyGoalMin)
      ) {
        return NextResponse.json(
          {
            error:
              'dailyGoalMin debe ser un número entero entre 1 y 480 (8 horas máximo)',
          },
          { status: 400 }
        )
      }
      data.dailyGoalMin = dailyGoalMin
    }

    if (weeklyGoalDays !== undefined) {
      if (
        typeof weeklyGoalDays !== 'number' ||
        !Number.isFinite(weeklyGoalDays) ||
        weeklyGoalDays < 1 ||
        weeklyGoalDays > 7 ||
        !Number.isInteger(weeklyGoalDays)
      ) {
        return NextResponse.json(
          {
            error: 'weeklyGoalDays debe ser un número entero entre 1 y 7',
          },
          { status: 400 }
        )
      }
      data.weeklyGoalDays = weeklyGoalDays
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        {
          error:
            'Debes enviar al menos dailyGoalMin o weeklyGoalDays para actualizar',
        },
        { status: 400 }
      )
    }

    const updated = await db.user.update({
      where: { id: userId },
      data,
      select: { dailyGoalMin: true, weeklyGoalDays: true },
    })

    // Recompute progress with updated goals so the response is immediately consistent
    const goalDailyMin = updated.dailyGoalMin ?? 20
    const goalWeeklyDays = updated.weeklyGoalDays ?? 5

    const today = format(new Date(), 'yyyy-MM-dd')
    const todayLogs = await db.readingLog.findMany({
      where: { userId, date: today },
      select: { minutes: true },
    })
    const todayMinutes = todayLogs.reduce((sum, l) => sum + l.minutes, 0)

    const now = new Date()
    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
    const weekLogs = await db.readingLog.findMany({
      where: {
        userId,
        date: {
          gte: format(weekStart, 'yyyy-MM-dd'),
          lte: format(weekEnd, 'yyyy-MM-dd'),
        },
      },
      select: { date: true },
    })
    const distinctDates = new Set(weekLogs.map((l) => l.date))
    const weekDaysRead = distinctDates.size

    const dailyProgress = Math.min(1, todayMinutes / goalDailyMin)
    const weeklyProgress = Math.min(1, weekDaysRead / goalWeeklyDays)
    const dailyCompleted = todayMinutes >= goalDailyMin
    const weeklyCompleted = weekDaysRead >= goalWeeklyDays

    return NextResponse.json({
      dailyGoalMin: goalDailyMin,
      weeklyGoalDays: goalWeeklyDays,
      todayMinutes,
      weekDaysRead,
      dailyProgress,
      weeklyProgress,
      dailyCompleted,
      weeklyCompleted,
    })
  } catch (error) {
    console.error('Update goals error:', error)
    return NextResponse.json(
      { error: 'Error al actualizar las metas de lectura' },
      { status: 500 }
    )
  }
}
