'use client'

// Voice Profile System
// Combines browser TTS voice + pitch + rate to create distinct "voice characters"
// Works on ALL devices (Web Speech API is universal) and costs $0 (no API calls)
//
// Premium voices are browser-based profiles with carefully tuned pitch + rate
// combinations that create genuinely distinct characters — some bright and youthful,
// others deep and authoritative. The underlying browser voice provides real male/female
// gender distinction (unlike neural APIs that often produce androgynous output).

export interface VoiceProfile {
  id: string
  name: string          // Friendly Spanish name (e.g., "Sofía")
  desc: string          // Short description (e.g., "Cálida y amigable")
  gender: 'female' | 'male'
  pitch: number         // 0.5 - 2.0 (1.0 = normal) — creates the "character"
  rate: number          // 0.5 - 2.0 (1.0 = normal) — narration speed
  voiceURI: string | null  // null = use best available Spanish voice of matching gender
  plan: 'free' | 'plus' | 'pro'  // Minimum plan required
  badge?: string        // Optional badge like "Plus" or "Pro"
  engine: 'browser'     // All voices use the browser Web Speech API
  preferredVoiceNames?: string[]  // Optional: specific browser voice names to try (in order) before gender fallback
}

// ─── Voice profiles organized by plan ───
// Free: 2 basic browser voices (just gender selection, neutral pitch/rate)
// Plus: 6 premium tuned profiles (3F + 3M) — distinct characters via pitch/rate
// Pro: 4 more premium tuned profiles (2F + 2M) — the most distinctive characters
//
// Pitch is the key differentiator:
//   < 0.9  = deeper, more authoritative
//   ~ 1.0  = natural
//   > 1.1  = brighter, more youthful
// Combined with rate, each profile sounds like a genuinely different narrator.

export const VOICE_PROFILES: VoiceProfile[] = [
  // ─── FREE (2 basic browser voices) ───
  {
    id: 'free-female',
    name: 'Mujer',
    desc: 'Voz femenina del navegador',
    gender: 'female',
    pitch: 1.0,
    rate: 1.0,
    voiceURI: null,
    plan: 'free',
    engine: 'browser',
  },
  {
    id: 'free-male',
    name: 'Hombre',
    desc: 'Voz masculina del navegador',
    gender: 'male',
    pitch: 1.0,
    rate: 1.0,
    voiceURI: null,
    plan: 'free',
    engine: 'browser',
  },

  // ─── PLUS (6 premium tuned profiles: 3F + 3M) ───
  // Each profile has a distinct pitch/rate combo creating a unique "character"
  {
    id: 'pv-stella',
    name: 'Stella',
    desc: 'Cálida narrativa femenina',
    gender: 'female',
    pitch: 1.15,   // slightly higher = warmer
    rate: 0.95,    // slightly slower = narrative feel
    voiceURI: null,
    plan: 'plus',
    badge: 'Plus',
    engine: 'browser',
  },
  {
    id: 'pv-luna',
    name: 'Luna',
    desc: 'Suave y dulce',
    gender: 'female',
    pitch: 1.3,    // bright = youthful, sweet
    rate: 1.05,
    voiceURI: null,
    plan: 'plus',
    badge: 'Plus',
    engine: 'browser',
  },
  {
    id: 'pv-athena',
    name: 'Atenea',
    desc: 'Clara y profesional',
    gender: 'female',
    pitch: 1.0,    // natural pitch
    rate: 1.0,
    voiceURI: null,
    plan: 'plus',
    badge: 'Plus',
    engine: 'browser',
  },
  {
    id: 'pv-arcas',
    name: 'Arcas',
    desc: 'Cálida y amigable',
    gender: 'male',
    pitch: 0.95,   // slightly deep = warm, friendly
    rate: 1.0,
    voiceURI: null,
    plan: 'plus',
    badge: 'Plus',
    engine: 'browser',
  },
  {
    id: 'pv-helios',
    name: 'Helios',
    desc: 'Clara y enérgica',
    gender: 'male',
    pitch: 1.1,    // brighter = energetic
    rate: 1.05,
    voiceURI: null,
    plan: 'plus',
    badge: 'Plus',
    engine: 'browser',
  },
  {
    id: 'pv-eros',
    name: 'Eros',
    desc: 'Suave y juvenil',
    gender: 'male',
    pitch: 1.2,    // higher = youthful
    rate: 1.1,
    voiceURI: null,
    plan: 'plus',
    badge: 'Plus',
    engine: 'browser',
  },

  // ─── PRO (4 additional distinctive profiles: 2F + 2M) ───
  // The most distinctive characters — extreme pitch/rate combos
  {
    id: 'pv-hera',
    name: 'Hera',
    desc: 'Profunda y elegante',
    gender: 'female',
    pitch: 0.85,   // deep female = elegant, authoritative
    rate: 0.9,
    voiceURI: null,
    plan: 'pro',
    badge: 'Pro',
    engine: 'browser',
  },
  {
    id: 'pv-diana',
    name: 'Diana',
    desc: 'Joven y energética',
    gender: 'female',
    pitch: 1.4,    // very bright = young, energetic
    rate: 1.15,
    voiceURI: null,
    plan: 'pro',
    badge: 'Pro',
    engine: 'browser',
  },
  {
    id: 'pv-orion',
    name: 'Orión',
    desc: 'Grave y envolvente',
    gender: 'male',
    pitch: 0.75,   // deep = immersive, resonant
    rate: 0.9,
    voiceURI: null,
    plan: 'pro',
    badge: 'Pro',
    engine: 'browser',
  },
  {
    id: 'pv-zeus',
    name: 'Zeus',
    desc: 'Profunda y autoritaria',
    gender: 'male',
    pitch: 0.65,   // very deep = authoritative, commanding
    rate: 0.85,
    voiceURI: null,
    plan: 'pro',
    badge: 'Pro',
    engine: 'browser',
  },
]

// Get voice profiles available for a given plan
export function getVoiceProfilesForPlan(plan: 'free' | 'plus' | 'pro'): VoiceProfile[] {
  const planLevel = { free: 0, plus: 1, pro: 2 }
  const userLevel = planLevel[plan]
  return VOICE_PROFILES.filter(p => planLevel[p.plan] <= userLevel)
}

// Get a voice profile by ID
export function getVoiceProfile(id: string): VoiceProfile | undefined {
  return VOICE_PROFILES.find(p => p.id === id)
}

// Default voice profile ID (used when none is selected)
export const DEFAULT_VOICE_PROFILE_ID = 'free-female'

// Preview text for testing voices
export const VOICE_PREVIEW_TEXT = 'Hola, soy tu voz de lectura. Así es como sonaré cuando lea tus libros favoritos.'

// Find the best matching browser voice for a profile's gender.
// BUG FIX (previous version): when no gender-specific voice was found, it fell back
// to `pool[0]` which on many devices is a FEMALE voice — so selecting "Hombre" still
// sounded female. Now we explicitly return null when no matching gender voice exists,
// letting the caller handle the fallback (e.g. show a notice) instead of silently
// using the wrong gender.
export function findBrowserVoiceForGender(
  voices: SpeechSynthesisVoice[],
  gender: 'female' | 'male'
): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null

  const spanishVoices = voices.filter(v => v.lang?.toLowerCase().startsWith('es'))
  const pool = spanishVoices.length > 0 ? spanishVoices : voices

  // Known female voice name patterns
  const femaleNames = [
    'helena', 'sabina', 'laura', 'carmen', 'elvira', 'monica', 'paulina',
    'marisol', 'sofia', 'lucia', 'valeria', 'isabela', 'mónica', 'lucía',
    'female', 'mujer', 'femenina', 'google español', 'google us español',
    'mónica', 'paula', 'esperanza', 'mujer español', 'marisol', 'monica',
  ]
  // Known male voice name patterns
  const maleNames = [
    'pablo', 'jorge', 'miguel', 'enrique', 'carlos', 'diego', 'juan',
    'mateo', 'daniel', 'andres', 'andrés', 'alejandro', 'male', 'hombre',
    'masculino', 'javier', 'raúl', 'raul', 'hombre español',
  ]

  const names = gender === 'female' ? femaleNames : maleNames
  const match = pool.find(v => {
    const n = v.name.toLowerCase()
    return names.some(pattern => n.includes(pattern))
  })

  if (match) return match

  // Prefer a local Spanish voice of the correct gender over a remote one.
  // (Local voices often have gender cues in their names.)
  const localSpanish = pool.find(v => v.localService && v.lang?.toLowerCase().startsWith('es'))
  if (localSpanish) {
    // Only use it if its name doesn't strongly suggest the opposite gender
    const n = localSpanish.name.toLowerCase()
    const oppositeNames = gender === 'female' ? maleNames : femaleNames
    const stronglyOpposite = oppositeNames.some(p => n.includes(p))
    if (!stronglyOpposite) return localSpanish
  }

  // No reliable gender match — return null so the caller can show a notice
  // instead of silently using a voice of the wrong gender.
  return null
}

// Helper: is this voice profile a premium (server-rendered) voice?
// NOTE: All profiles now use the browser engine. This returns false for all,
// which means use-tts.ts always uses the speechSynthesis path. Kept for backwards
// compatibility with any code that checks this flag.
export function isPremiumVoice(profile: VoiceProfile | undefined): boolean {
  return false
}

// Count of premium voices per plan (used in pricing UI)
export const PREMIUM_VOICE_COUNTS = {
  plus: VOICE_PROFILES.filter(v => v.plan === 'plus').length,   // 6
  pro: VOICE_PROFILES.filter(v => v.plan !== 'free').length,    // 10 (Pro sees all premium)
}
