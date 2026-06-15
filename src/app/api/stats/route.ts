import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { format, startOfWeek, endOfWeek, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })
    }
    const userId = session.user.id

    // Get the user from DB for streak and other DB-only fields
    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Get all books for the user
    const books = await db.book.findMany({
      where: { userId }
    })

    const totalBooks = books.length
    const finishedBooks = books.filter(b => b.isFinished).length
    // Use real reading minutes (from ReadingLog) instead of estimated minutes
    const totalReadMin = user.totalReadMin || 0
    const totalHours = Math.round((totalReadMin / 60) * 10) / 10

    // Calculate current streak
    const streakDays = user.streakDays
    const lastReadDate = user.lastReadDate

    // Calculate best streak from reading logs
    const readingLogs = await db.readingLog.findMany({
      where: { userId },
      orderBy: { date: 'asc' }
    })

    let bestStreak = 0
    let currentStreakCount = 0
    let prevDate: Date | null = null

    for (const log of readingLogs) {
      const logDate = parseISO(log.date)
      if (prevDate) {
        const diffDays = Math.round((logDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays === 1) {
          currentStreakCount++
        } else if (diffDays > 1) {
          currentStreakCount = 1
        }
      } else {
        currentStreakCount = 1
      }
      bestStreak = Math.max(bestStreak, currentStreakCount)
      prevDate = logDate
    }
    bestStreak = Math.max(bestStreak, streakDays)

    // Get weekly reading data
    const now = new Date()
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }) // Monday
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 }) // Sunday

    const weekLogs = await db.readingLog.findMany({
      where: {
        userId,
        date: {
          gte: format(weekStart, 'yyyy-MM-dd'),
          lte: format(weekEnd, 'yyyy-MM-dd'),
        }
      }
    })

    // Build weekly data (Mon-Sun)
    const weeklyData = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart)
      day.setDate(day.getDate() + i)
      const dateStr = format(day, 'yyyy-MM-dd')
      const dayLogs = weekLogs.filter(l => l.date === dateStr)
      const minutes = dayLogs.reduce((sum, l) => sum + l.minutes, 0)
      weeklyData.push({
        day: format(day, 'EEE', { locale: es }),
        minutes,
        date: dateStr,
      })
    }

    // Get achievements
    const achievements = await db.achievement.findMany({
      where: { userId }
    })

    // Check and award new achievements
    const newAchievements: string[] = []
    const existingTypes = new Set(achievements.map(a => a.type))

    const achievementChecks = [
      { type: 'first_book', condition: totalBooks >= 1 },
      { type: '10_books', condition: totalBooks >= 10 },
      { type: '100_hours', condition: totalHours >= 100 },
      { type: 'streak_7', condition: streakDays >= 7 },
      { type: 'streak_30', condition: streakDays >= 30 },
      { type: 'finish_first', condition: finishedBooks >= 1 },
    ]

    for (const check of achievementChecks) {
      if (check.condition && !existingTypes.has(check.type)) {
        await db.achievement.create({
          data: { userId, type: check.type }
        })
        newAchievements.push(check.type)
      }
    }

    // If new achievements were created, fetch the full list again
    const allAchievements = newAchievements.length > 0
      ? await db.achievement.findMany({ where: { userId } })
      : achievements

    return NextResponse.json({
      user: {
        email: user.email,
        plan: user.plan,
        isVip: user.isVip,
      },
      stats: {
        totalBooks,
        finishedBooks,
        totalHours,
        totalReadMin: user.totalReadMin,
        streakDays,
        bestStreak,
        lastReadDate,
        weeklyData,
        plan: user.plan,
        isVip: user.isVip,
      },
      achievements: allAchievements,
      newAchievements,
    })
  } catch (error) {
    console.error('Stats error:', error)
    return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 })
  }
}
