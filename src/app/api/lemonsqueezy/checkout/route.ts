import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  setupLemonSqueezy,
  isLemonSqueezyConfigured,
  VARIANTS,
  getAppUrl,
  createCheckout,
  createCustomer,
  getCustomer,
} from '@/lib/lemonsqueezy'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })
    }

    // Check if Lemon Squeezy is configured
    if (!isLemonSqueezyConfigured()) {
      return NextResponse.json(
        { error: 'Lemon Squeezy no está configurado. Agrega las variables de entorno.' },
        { status: 503 }
      )
    }

    setupLemonSqueezy()

    const { planId, isAnnual } = await req.json()

    if (!planId || !VARIANTS[planId]) {
      return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })
    }

    const variantId = isAnnual ? VARIANTS[planId].annual : VARIANTS[planId].monthly
    const storeId = process.env.LEMONSQUEEZY_STORE_ID!

    // Get or create Lemon Squeezy customer
    const user = await db.user.findUnique({
      where: { id: session.user.id },
    })

    let lsCustomerId = user?.lsCustomerId || null

    if (lsCustomerId) {
      // Verify the customer still exists in Lemon Squeezy
      try {
        const customerRes = await getCustomer(lsCustomerId)
        if (customerRes.error) {
          lsCustomerId = null // Customer was deleted, recreate
        }
      } catch {
        lsCustomerId = null
      }
    }

    if (!lsCustomerId) {
      const customerRes = await createCustomer(storeId, {
        name: session.user.name || 'BookMate User',
        email: session.user.email || '',
      })

      if (customerRes.error || !customerRes.data?.id) {
        throw new Error('Failed to create Lemon Squeezy customer: ' + (customerRes.error?.message || 'Unknown error'))
      }

      lsCustomerId = String(customerRes.data.id)

      // Save customer ID to DB
      await db.user.update({
        where: { id: session.user.id },
        data: { lsCustomerId },
      })
    }

    // Create Checkout
    const appUrl = getAppUrl()
    const checkoutRes = await createCheckout(storeId, variantId, {
      customPrice: null,
      checkoutData: {
        email: session.user.email || undefined,
        name: session.user.name || undefined,
        custom: {
          userId: session.user.id,
          planId,
          isAnnual: isAnnual ? 'true' : 'false',
        },
      },
      checkoutOptions: {
        embed: false,
        media: true,
        logo: true,
        desc: true,
        discount: true,
        subscriptionPreview: true,
      },
      productOptions: {
        redirectUrl: `${appUrl}/?checkout=success`,
        receiptButtonUrl: appUrl,
        receiptThankYouNote: '¡Gracias por suscribirte a BookMate! 📚',
        confirmationTitle: '¡Bienvenido a BookMate! 🎉',
        confirmationMessage: 'Tu suscripción está activa. ¡Disfruta la lectura!',
        confirmationButtonText: 'Ir a BookMate',
      },
    })

    if (checkoutRes.error || !checkoutRes.data?.attributes?.url) {
      throw new Error('Failed to create checkout: ' + (checkoutRes.error?.message || 'No checkout URL'))
    }

    const checkoutUrl = checkoutRes.data.attributes.url

    return NextResponse.json({ url: checkoutUrl })
  } catch (error) {
    console.error('Lemon Squeezy checkout error:', error)
    return NextResponse.json(
      { error: 'Error al crear la sesión de pago' },
      { status: 500 }
    )
  }
}
