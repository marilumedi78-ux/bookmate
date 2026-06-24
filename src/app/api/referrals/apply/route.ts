import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { applyReferralCode } from '@/lib/referrals'

// POST /api/referrals/apply
// Body: { code: string }
// Applies a referral code to the current user (must be logged in, must not
// already have a referrer). Used when:
//   - User signed up without a code (clicked a referral link AFTER signing up)
//   - User wants to apply a code they got from a friend
//
// Returns { success: true } if applied, { success: false, error } otherwise.
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })
    }
    const userId = session.user.id

    const body = await request.json()
    const code = body?.code

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Código requerido' }, { status: 400 })
    }

    // Check if user already has a referrer
    const me = await (await import('@/lib/db')).db.user.findUnique({
      where: { id: userId },
      select: { referredById: true },
    })
    if (me?.referredById) {
      return NextResponse.json(
        { success: false, error: 'Ya tienes un código de referido aplicado' },
        { status: 400 }
      )
    }

    const applied = await applyReferralCode(userId, code)
    if (!applied) {
      return NextResponse.json(
        { success: false, error: 'Código de referido inválido' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Apply referral code error:', error)
    return NextResponse.json({ error: 'Error al aplicar código de referido' }, { status: 500 })
  }
}
