import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PATCH /api/plan — change current user's plan (for testing)
export async function PATCH(req: NextRequest) {
  try {
    const { plan, email } = await req.json()

    if (!plan || !['free', 'plus', 'pro'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan. Use: free, plus, or pro' }, { status: 400 })
    }

    // Find or create user
    const userEmail = email || 'demo@bookmate.app'
    let user = await db.user.findUnique({ where: { email: userEmail } })

    if (!user) {
      user = await db.user.create({
        data: {
          email: userEmail,
          name: 'Demo User',
          plan,
          isAdmin: plan === 'pro',
        },
      })
    } else {
      user = await db.user.update({
        where: { email: userEmail },
        data: {
          plan,
          isVip: plan === 'pro' ? user.isVip : false,
        },
      })
    }

    return NextResponse.json({
      plan: user.plan,
      isVip: user.isVip,
      email: user.email,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 })
  }
}
