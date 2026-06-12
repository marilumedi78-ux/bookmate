import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// PATCH /api/plan — change current user's plan (requires auth)
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })
    }

    const { plan } = await req.json()

    if (!plan || !['free', 'plus', 'pro'].includes(plan)) {
      return NextResponse.json({ error: 'Plan inválido. Usa: free, plus, o pro' }, { status: 400 })
    }

    const user = await db.user.update({
      where: { id: session.user.id },
      data: {
        plan,
        isVip: plan === 'pro' ? (await db.user.findUnique({ where: { id: session.user.id } }))?.isVip || false : false,
      },
    })

    return NextResponse.json({
      plan: user.plan,
      isVip: user.isVip,
      email: user.email,
    })
  } catch {
    return NextResponse.json({ error: 'Error al actualizar el plan' }, { status: 500 })
  }
}
