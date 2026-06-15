import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { getEffectivePlan, getPlanLimits, ensureMonthlyUsageReset } from '@/lib/plan-limits'

// GET /api/auth/me — get current authenticated user data with usage info
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ user: null }, { status: 200 })
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        isVip: true,
        isAdmin: true,
        streakDays: true,
        totalReadMin: true,
        iaHoursUsed: true,
        explicaUsed: true,
        ocrUsed: true,
        usageMonth: true,
      },
    })

    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 })
    }

    // Ensure monthly usage counters are up to date
    const usage = await ensureMonthlyUsageReset(user.id)
    const effectivePlan = getEffectivePlan(user.plan, user.isVip)
    const limits = getPlanLimits(effectivePlan)

    return NextResponse.json({
      user: {
        ...user,
        iaHoursUsed: usage.iaHoursUsed,
        explicaUsed: usage.explicaUsed,
        ocrUsed: usage.ocrUsed,
      },
      planLimits: {
        effectivePlan,
        maxHighlightsPerBook: limits.maxHighlightsPerBook === Infinity ? null : limits.maxHighlightsPerBook,
        maxExplicaPerMonth: limits.maxExplicaPerMonth === Infinity ? null : limits.maxExplicaPerMonth,
        maxIaVoiceHoursPerMonth: limits.maxIaVoiceHoursPerMonth,
        canUseAmbientSounds: limits.canUseAmbientSounds,
        canUseSleepTimer: limits.canUseSleepTimer,
        canUseAllSpeeds: limits.canUseAllSpeeds,
        canUseIAVoice: limits.canUseIAVoice,
        canUseAISummary: limits.canUseAISummary,
        canUseOCR: limits.canUseOCR,
      },
    })
  } catch {
    return NextResponse.json({ user: null }, { status: 200 })
  }
}
