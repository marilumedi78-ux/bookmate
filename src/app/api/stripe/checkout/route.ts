import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2025-04-30.basil',
})

// Price IDs for each plan (set these in your Stripe dashboard and env vars)
const PRICES: Record<string, { monthly: string; annual: string }> = {
  plus: {
    monthly: process.env.STRIPE_PLUS_MONTHLY_PRICE_ID || 'price_plus_monthly',
    annual: process.env.STRIPE_PLUS_ANNUAL_PRICE_ID || 'price_plus_annual',
  },
  pro: {
    monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || 'price_pro_monthly',
    annual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID || 'price_pro_annual',
  },
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })
    }

    const { planId, isAnnual } = await req.json()

    if (!planId || !PRICES[planId]) {
      return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })
    }

    const priceId = isAnnual ? PRICES[planId].annual : PRICES[planId].monthly

    // Get or create Stripe customer
    const user = await (await import('@/lib/db')).db.user.findUnique({
      where: { id: session.user.id },
    })

    let customerId = user?.stripeCustomerId

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email || undefined,
        name: session.user.name || undefined,
        metadata: {
          userId: session.user.id,
        },
      })
      customerId = customer.id

      // Save customer ID
      await (await import('@/lib/db')).db.user.update({
        where: { id: session.user.id },
        data: { stripeCustomerId: customerId },
      })
    }

    // Create Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXTAUTH_URL || 'https://bookmate-three.vercel.app'}/?checkout=success`,
      cancel_url: `${process.env.NEXTAUTH_URL || 'https://bookmate-three.vercel.app'}/?checkout=cancel`,
      metadata: {
        userId: session.user.id,
        planId,
        isAnnual: isAnnual ? 'true' : 'false',
      },
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      { error: 'Error al crear la sesión de pago' },
      { status: 500 }
    )
  }
}
