import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { db } from '@/lib/db'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2025-04-30.basil',
})

// This handles Stripe webhook events (subscription created, cancelled, etc.)
export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  // In development without webhook secret, parse the body directly
  let event: Stripe.Event

  if (process.env.STRIPE_WEBHOOK_SECRET && sig) {
    try {
      event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
    } catch {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }
  } else {
    // Dev mode: parse without signature verification
    try {
      event = JSON.parse(body)
    } catch {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId
        const planId = session.metadata?.planId

        if (userId && planId) {
          await db.user.update({
            where: { id: userId },
            data: {
              plan: planId,
              stripeSubId: session.subscription as string,
              stripePriceId: (session as any).line_items?.data?.[0]?.price?.id,
            },
          })
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const user = await db.user.findUnique({
          where: { stripeCustomerId: customerId },
        })

        if (user && subscription.status === 'active') {
          const priceId = subscription.items.data[0]?.price.id
          await db.user.update({
            where: { id: user.id },
            data: {
              plan: priceId?.includes('pro') ? 'pro' : 'plus',
              stripeSubId: subscription.id,
              stripePriceId: priceId,
            },
          })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const user = await db.user.findUnique({
          where: { stripeCustomerId: customerId },
        })

        if (user) {
          await db.user.update({
            where: { id: user.id },
            data: {
              plan: 'free',
              stripeSubId: null,
              stripePriceId: null,
            },
          })
        }
        break
      }
    }
  } catch (error) {
    console.error('Stripe webhook error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
