'use client'

// Premium Voice System — Cloudflare Workers AI (Deepgram Aura Spanish)
// 10 neural voices that speak native Spanish.
// These voices are server-rendered via /api/tts-premium and played through HTML5 Audio.

export type PremiumGender = 'female' | 'male'
export type PremiumPlan = 'plus' | 'pro'

export interface PremiumVoice {
  id: string          // Deepgram voice name (e.g. 'stella', 'zeus')
  name: string        // Friendly display name (Spanish)
  desc: string        // Short description
  gender: PremiumGender
  plan: PremiumPlan   // Minimum plan required (Plus or Pro)
  badge?: string      // Optional badge like "Plus" or "Pro"
}

// ─── All 10 Deepgram Aura Spanish voices ───
// Verified working via Cloudflare Workers AI API.
// Plan assignment:
//   - Plus: 6 voices (3F + 3M) — covers the most useful characters
//   - Pro:  4 voices (2F + 2M) — adds the most distinctive/narrative voices

export const PREMIUM_VOICES: PremiumVoice[] = [
  // ─── PLUS (6 voices: 3F + 3M) ───
  {
    id: 'stella',
    name: 'Stella',
    desc: 'Cálida narrativa femenina',
    gender: 'female',
    plan: 'plus',
    badge: 'Plus',
  },
  {
    id: 'luna',
    name: 'Luna',
    desc: 'Suave y dulce',
    gender: 'female',
    plan: 'plus',
    badge: 'Plus',
  },
  {
    id: 'athena',
    name: 'Atenea',
    desc: 'Clara y profesional',
    gender: 'female',
    plan: 'plus',
    badge: 'Plus',
  },
  {
    id: 'arcas',
    name: 'Arcas',
    desc: 'Cálida y amigable',
    gender: 'male',
    plan: 'plus',
    badge: 'Plus',
  },
  {
    id: 'helios',
    name: 'Helios',
    desc: 'Clara y enérgica',
    gender: 'male',
    plan: 'plus',
    badge: 'Plus',
  },
  {
    id: 'eros',
    name: 'Eros',
    desc: 'Suave y juvenil',
    gender: 'male',
    plan: 'plus',
    badge: 'Plus',
  },

  // ─── PRO (4 voices: 2F + 2M — the most distinctive) ───
  {
    id: 'hera',
    name: 'Hera',
    desc: 'Profunda y elegante',
    gender: 'female',
    plan: 'pro',
    badge: 'Pro',
  },
  {
    id: 'diana',
    name: 'Diana',
    desc: 'Joven y energética',
    gender: 'female',
    plan: 'pro',
    badge: 'Pro',
  },
  {
    id: 'orion',
    name: 'Orión',
    desc: 'Grave y envolvente',
    gender: 'male',
    plan: 'pro',
    badge: 'Pro',
  },
  {
    id: 'zeus',
    name: 'Zeus',
    desc: 'Profunda y autoritaria',
    gender: 'male',
    plan: 'pro',
    badge: 'Pro',
  },
]

// Get a premium voice by its Deepgram voice id
export function getPremiumVoiceById(id: string): PremiumVoice | undefined {
  return PREMIUM_VOICES.find(v => v.id === id)
}

// Get all premium voices available for a given plan
export function getPremiumVoicesForPlan(plan: 'free' | 'plus' | 'pro'): PremiumVoice[] {
  const planLevel = { free: 0, plus: 1, pro: 2 }
  const userLevel = planLevel[plan]
  return PREMIUM_VOICES.filter(v => planLevel[v.plan] <= userLevel)
}

// Count of premium voices per plan (used in pricing UI)
export const PREMIUM_VOICE_COUNTS = {
  plus: PREMIUM_VOICES.filter(v => v.plan === 'plus').length,   // 6
  pro: PREMIUM_VOICES.length,                                     // 10 (Pro sees all)
}

// Preview text used for the dropdown "test voice" buttons
export const PREMIUM_VOICE_PREVIEW_TEXT = 'Hola, soy una de las voces premium de BookMate. Así sonaré cuando lea tu libro en español.'
