import { lemonSqueezySetup, createCheckout, createCustomer, getCustomer } from '@lemonsqueezy/lemonsqueezy.js'

let _isSetup = false

/**
 * Initialize Lemon Squeezy SDK.
 * Must be called before any API calls.
 */
export function setupLemonSqueezy() {
  if (_isSetup) return
  const apiKey = process.env.LEMONSQUEEZY_API_KEY
  if (!apiKey) return
  lemonSqueezySetup({ apiKey })
  _isSetup = true
}

/** Check if Lemon Squeezy is properly configured */
export function isLemonSqueezyConfigured(): boolean {
  return !!(
    process.env.LEMONSQUEEZY_API_KEY &&
    process.env.LEMONSQUEEZY_STORE_ID &&
    process.env.LEMONSQUEEZY_PLUS_MONTHLY_VARIANT_ID &&
    process.env.LEMONSQUEEZY_PLUS_ANNUAL_VARIANT_ID &&
    process.env.LEMONSQUEEZY_PRO_MONTHLY_VARIANT_ID &&
    process.env.LEMONSQUEEZY_PRO_ANNUAL_VARIANT_ID
  )
}

/** Variant IDs for each plan — set these in your Lemon Squeezy dashboard */
export const VARIANTS: Record<string, { monthly: string; annual: string }> = {
  plus: {
    monthly: process.env.LEMONSQUEEZY_PLUS_MONTHLY_VARIANT_ID || '',
    annual: process.env.LEMONSQUEEZY_PLUS_ANNUAL_VARIANT_ID || '',
  },
  pro: {
    monthly: process.env.LEMONSQUEEZY_PRO_MONTHLY_VARIANT_ID || '',
    annual: process.env.LEMONSQUEEZY_PRO_ANNUAL_VARIANT_ID || '',
  },
}

/** Map a Lemon Squeezy variant ID back to a plan name */
export function getPlanFromVariantId(variantId: string): 'plus' | 'pro' | 'free' {
  for (const [plan, variants] of Object.entries(VARIANTS)) {
    if (variants.monthly === variantId || variants.annual === variantId) {
      return plan as 'plus' | 'pro'
    }
  }
  return 'free'
}

/** Base URL for the app — used in success/cancel URLs */
export function getAppUrl(): string {
  return process.env.NEXTAUTH_URL || 'https://bookmate-three.vercel.app'
}

// Re-export SDK functions for convenience
export { createCheckout, createCustomer, getCustomer }
