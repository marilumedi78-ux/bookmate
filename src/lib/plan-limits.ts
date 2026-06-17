import { db } from '@/lib/db'
import { format } from 'date-fns'

// Plan limits configuration
export const PLAN_LIMITS = {
  free: {
    maxBooks: 3,
    maxHighlightsPerBook: 5,
    maxExplicaPerMonth: 5,
    maxIaVoiceHoursPerMonth: 0,
    canUseAmbientSounds: true,
    canUseSleepTimer: false,
    canUseAllSpeeds: false,
    canUseIAVoice: false,
    canUseAISummary: false,
    canUseOCR: false,
  },
  plus: {
    maxBooks: 20,
    maxHighlightsPerBook: Infinity,
    maxExplicaPerMonth: 10,
    maxIaVoiceHoursPerMonth: 15,
    canUseAmbientSounds: true,
    canUseSleepTimer: true,
    canUseAllSpeeds: true,
    canUseIAVoice: true,
    canUseAISummary: false,
    canUseOCR: false,
  },
  pro: {
    maxBooks: Infinity,
    maxHighlightsPerBook: Infinity,
    maxExplicaPerMonth: Infinity,
    maxIaVoiceHoursPerMonth: 25,
    canUseAmbientSounds: true,
    canUseSleepTimer: true,
    canUseAllSpeeds: true,
    canUseIAVoice: true,
    canUseAISummary: true,
    canUseOCR: true,
  },
} as const

export type PlanType = 'free' | 'plus' | 'pro'

// Reset monthly usage counters if we're in a new month
export async function ensureMonthlyUsageReset(userId: string): Promise<{
  iaHoursUsed: number
  explicaUsed: number
  ocrUsed: number
}> {
  const currentMonth = format(new Date(), 'yyyy-MM')
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { usageMonth: true, iaHoursUsed: true, explicaUsed: true, ocrUsed: true },
  })

  if (!user) {
    return { iaHoursUsed: 0, explicaUsed: 0, ocrUsed: 0 }
  }

  // If the usage month doesn't match current month, reset counters
  if (user.usageMonth !== currentMonth) {
    await db.user.update({
      where: { id: userId },
      data: {
        usageMonth: currentMonth,
        iaHoursUsed: 0,
        explicaUsed: 0,
        ocrUsed: 0,
      },
    })
    return { iaHoursUsed: 0, explicaUsed: 0, ocrUsed: 0 }
  }

  return {
    iaHoursUsed: user.iaHoursUsed,
    explicaUsed: user.explicaUsed,
    ocrUsed: user.ocrUsed,
  }
}

// Get effective plan (VIP = pro)
export function getEffectivePlan(plan: string, isVip: boolean): PlanType {
  if (isVip) return 'pro'
  if (plan === 'plus' || plan === 'pro') return plan as PlanType
  return 'free'
}

// Get plan limits for a user
export function getPlanLimits(plan: PlanType) {
  return PLAN_LIMITS[plan]
}
