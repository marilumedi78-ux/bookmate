import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getReferralStats } from '@/lib/referrals'

// GET /api/referrals/stats
// Returns the current user's referral stats for the "Invita y gana" dashboard:
//   - code: their referral code
//   - signedUp: how many people signed up with their code
//   - paid: how many of those converted to a paid plan
//   - credits: how many months of Pro they have earned (1 per paid referral)
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })
    }
    const stats = await getReferralStats(session.user.id)
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Get referral stats error:', error)
    return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 })
  }
}
