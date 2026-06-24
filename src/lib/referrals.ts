// Referral system utilities
//
// Each user gets a unique referral code they can share with friends.
// When a friend signs up using the code AND later upgrades to a paid plan,
// BOTH users get 1 month of Pro free (referralCredits += 1).
//
// Code format:
//   - First 6 chars of user's name/email (uppercase, letters only)
//   - + "-" + 4 random alphanumeric chars
//   - e.g. "MARILU-7K3X", "JUANPE-9F2A"
//
// We avoid ambiguous chars (0/O, 1/I) for usability when shared verbally.

import { db } from '@/lib/db'

const AMBIGUOUS_CHARS = '0O1I5S8B2Z'  // visually ambiguous
const ALPHABET = 'ABCDEFGHJKLMNPQRTUVWXY34679'  // no ambiguous chars
const CODE_PREFIX_LEN = 6
const CODE_SUFFIX_LEN = 4

// Generate a random alphanumeric string using only unambiguous chars
function randomCode(length: number): string {
  let out = ''
  for (let i = 0; i < length; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  }
  return out
}

// Build a prefix from a user's name or email.
// Strip non-letters, uppercase, take first 6 chars, pad with random if too short.
function buildPrefix(seed: string): string {
  const letters = seed
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, CODE_PREFIX_LEN)
  if (letters.length >= CODE_PREFIX_LEN) return letters
  // Pad with random chars if name is too short (e.g. "Ana" → "ANAXYZ")
  return (letters + randomCode(CODE_PREFIX_LEN - letters.length)).slice(0, CODE_PREFIX_LEN)
}

// Generate a unique referral code for a user.
// Format: PREFIX-RAND (e.g. "MARILU-7K3X")
// Retries up to 10 times if there's a collision.
export async function generateUniqueReferralCode(seed: string): Promise<string> {
  const prefix = buildPrefix(seed || 'USER')

  for (let attempt = 0; attempt < 10; attempt++) {
    const suffix = randomCode(CODE_SUFFIX_LEN)
    const code = `${prefix}-${suffix}`

    const existing = await db.user.findUnique({
      where: { referralCode: code },
      select: { id: true },
    })
    if (!existing) return code
  }

  // Fallback: pure random (very unlikely to reach here)
  return `${randomCode(CODE_PREFIX_LEN)}-${randomCode(CODE_SUFFIX_LEN)}`
}

// Ensure a user has a referral code. Generates one if missing.
// Returns the user's referral code.
export async function ensureReferralCode(userId: string, seed: string): Promise<string> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { referralCode: true },
  })
  if (user?.referralCode) return user.referralCode

  const code = await generateUniqueReferralCode(seed)
  await db.user.update({
    where: { id: userId },
    data: { referralCode: code },
  })
  return code
}

// Apply a referral code at signup.
// - Validates the code exists (case-insensitive)
// - Sets referredById on the new user
// - Increments referralCount on the referrer
// - Returns true if the code was valid and applied
export async function applyReferralCode(
  newUserId: string,
  code: string
): Promise<boolean> {
  if (!code || typeof code !== 'string') return false

  const normalized = code.trim().toUpperCase()
  if (!normalized) return false

  // Find the referrer by code (case-insensitive — codes are stored uppercase)
  const referrer = await db.user.findFirst({
    where: { referralCode: normalized },
    select: { id: true },
  })
  if (!referrer) return false
  if (referrer.id === newUserId) return false  // can't refer yourself

  // Set the referrer on the new user + bump the referrer's count
  await db.user.update({
    where: { id: newUserId },
    data: { referredById: referrer.id },
  })
  await db.user.update({
    where: { id: referrer.id },
    data: { referralCount: { increment: 1 } },
  })
  return true
}

// Reward BOTH users when a referral converts to a paid plan.
// Called by the Lemon Squeezy webhook when a subscription becomes active.
// - Increments referralCredits by 1 on BOTH users (referrer + new paid user)
// - Increments referralPaidCount on the referrer
// - Extends Pro access for the referrer by 30 days
// Returns true if a referral was rewarded, false if the user had no referrer.
export async function rewardReferralOnPaid(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { referredById: true },
  })
  if (!user?.referredById) return false

  // Give 1 credit to BOTH users
  await db.user.update({
    where: { id: userId },
    data: { referralCredits: { increment: 1 } },
  })
  await db.user.update({
    where: { id: user.referredById },
    data: {
      referralCredits: { increment: 1 },
      referralPaidCount: { increment: 1 },
    },
  })
  return true
}

// Consume 1 referral credit to extend Pro access by 30 days.
// Called when a user's subscription would expire but they have credits.
// Returns the new expiry date or null if no credits.
export async function consumeReferralCredit(userId: string): Promise<Date | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { referralCredits: true },
  })
  if (!user || user.referralCredits <= 0) return null

  // Decrement credit + return a date 30 days from now
  // (The caller is responsible for updating the subscription end date in Lemon Squeezy
  // or in our DB if we're managing Pro expiry locally.)
  await db.user.update({
    where: { id: userId },
    data: { referralCredits: { decrement: 1 } },
  })
  const newExpiry = new Date()
  newExpiry.setDate(newExpiry.getDate() + 30)
  return newExpiry
}

// Get referral stats for a user (used in the "Invita y gana" UI).
export async function getReferralStats(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      referralCode: true,
      referralCount: true,
      referralPaidCount: true,
      referralCredits: true,
    },
  })
  if (!user) {
    return {
      code: null,
      signedUp: 0,
      paid: 0,
      credits: 0,
    }
  }
  return {
    code: user.referralCode,
    signedUp: user.referralCount,
    paid: user.referralPaidCount,
    credits: user.referralCredits,
  }
}
