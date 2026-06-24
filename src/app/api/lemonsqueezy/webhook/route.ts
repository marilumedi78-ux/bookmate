import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getLemonSqueezyClient, isLemonSqueezyConfigured, getPlanFromVariantId } from '@/lib/lemonsqueezy'
import { rewardReferralOnPaid } from '@/lib/referrals'
import crypto from 'crypto'

/**
 * Lemon Squeezy Webhook Handler
 *
 * Handles subscription events:
 * - subscription_created: User subscribes to a plan
 * - subscription_updated: Plan change or billing update
 * - subscription_cancelled: Subscription cancelled (still active until period end)
 * - subscription_expired: Subscription fully expired, revert to free
 * - subscription_paused: Subscription paused
 * - subscription_resumed: Subscription resumed from pause
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get('x-signature') || ''

    // Verify webhook signature
    const webhookSecret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET

    if (webhookSecret && signature) {
      const hmac = crypto.createHmac('sha256', webhookSecret)
      const digest = hmac.update(rawBody).digest('hex')
      if (digest !== signature) {
        console.error('Lemon Squeezy webhook: Invalid signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
      }
    } else if (webhookSecret) {
      // Secret is configured but no signature provided
      console.error('Lemon Squeezy webhook: Missing signature')
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }
    // If no webhook secret is configured (dev mode), skip verification

    const payload = JSON.parse(rawBody)
    const eventName = payload.meta?.event_name
    const eventData = payload.data

    if (!eventName || !eventData) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const attributes = eventData.attributes
    const relationships = eventData.relationships

    // Extract subscription details
    const subscriptionId = String(eventData.id)
    const variantId = String(relationships?.variant?.data?.id || '')
    const customerId = String(relationships?.customer?.data?.id || '')
    const status = attributes?.status || ''

    // Extract custom user data from order/sub custom_data
    // For subscription_created, custom data is in the order's custom_data
    const customData = attributes?.custom_data || {}
    let userId = customData?.userId || ''
    const planId = customData?.planId || getPlanFromVariantId(variantId)

    // If we don't have userId from custom data, look it up by lsCustomerId
    if (!userId && customerId) {
      const userByCustomer = await db.user.findUnique({
        where: { lsCustomerId: customerId },
      })
      if (userByCustomer) {
        userId = userByCustomer.id
      }
    }

    // If still no userId, try to find by subscription ID
    if (!userId && subscriptionId) {
      const userBySub = await db.user.findUnique({
        where: { lsSubscriptionId: subscriptionId },
      })
      if (userBySub) {
        userId = userBySub.id
      }
    }

    if (!userId) {
      console.error('Lemon Squeezy webhook: Could not find user for event', eventName, 'customerId:', customerId, 'subId:', subscriptionId)
      return NextResponse.json({ received: true, warning: 'User not found' })
    }

    switch (eventName) {
      case 'subscription_created': {
        // New subscription — activate the plan
        const plan = planId || getPlanFromVariantId(variantId)
        await db.user.update({
          where: { id: userId },
          data: {
            plan,
            lsCustomerId: customerId || undefined,
            lsSubscriptionId: subscriptionId,
            lsVariantId: variantId || undefined,
          },
        })
        console.log(`Lemon Squeezy: subscription_created — user ${userId} → plan ${plan}`)

        // ─── Referral reward ───
        // When a user subscribes for the FIRST time (subscription_created),
        // reward both them and their referrer with 1 month of Pro credit.
        // (We only do this on _created, not _updated, to avoid rewarding the
        // same referral multiple times on plan changes.)
        try {
          const rewarded = await rewardReferralOnPaid(userId)
          if (rewarded) {
            console.log(`Referral reward: user ${userId} + their referrer both earned 1 month Pro credit`)
          }
        } catch (err) {
          // Non-fatal: don't fail the webhook if the referral reward fails
          console.warn('Referral reward failed (non-fatal):', err)
        }
        break
      }

      case 'subscription_updated': {
        // Subscription updated (plan change, etc.)
        if (status === 'active' || status === 'on_trial') {
          const plan = getPlanFromVariantId(variantId)
          await db.user.update({
            where: { id: userId },
            data: {
              plan,
              lsSubscriptionId: subscriptionId,
              lsVariantId: variantId || undefined,
            },
          })
          console.log(`Lemon Squeezy: subscription_updated — user ${userId} → plan ${plan}`)
        }
        break
      }

      case 'subscription_cancelled': {
        // Subscription cancelled but still active until period end
        // Don't downgrade yet — will be handled by subscription_expired
        console.log(`Lemon Squeezy: subscription_cancelled — user ${userId} (still active until period end)`)
        break
      }

      case 'subscription_expired': {
        // Subscription fully expired — downgrade to free
        await db.user.update({
          where: { id: userId },
          data: {
            plan: 'free',
            lsSubscriptionId: null,
            lsVariantId: null,
          },
        })
        console.log(`Lemon Squeezy: subscription_expired — user ${userId} → plan free`)
        break
      }

      case 'subscription_paused': {
        // Optionally downgrade while paused
        await db.user.update({
          where: { id: userId },
          data: {
            plan: 'free',
          },
        })
        console.log(`Lemon Squeezy: subscription_paused — user ${userId} → plan free (paused)`)
        break
      }

      case 'subscription_resumed': {
        // Re-activate from pause
        if (status === 'active') {
          const plan = getPlanFromVariantId(variantId)
          await db.user.update({
            where: { id: userId },
            data: {
              plan,
            },
          })
          console.log(`Lemon Squeezy: subscription_resumed — user ${userId} → plan ${plan}`)
        }
        break
      }

      default:
        console.log(`Lemon Squeezy webhook: Unhandled event ${eventName}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Lemon Squeezy webhook error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
