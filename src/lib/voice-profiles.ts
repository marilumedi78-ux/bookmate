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
//
// MOBILE BEHAVIOR (the key issue we solve here):
// Most Android devices only ship with ONE Spanish voice ("Google español"),
// which is female. iOS ships "Mónica"/"Paulina" (also female). So when a user
// picks a male voice profile on mobile, there is literally no male voice
// installed — we have NO way to play a male voice.
//
// Our strategy:
//   1. Try to find a real gendered voice by name (works on desktop).
//   2. If none exists, fall back to ANY Spanish voice and let the caller
//      compensate by adjusting pitch (caller drops pitch dramatically for
//      male profiles so a female voice sounds deeper / more masculine).
//   3. Return { voice, isFallback } so the caller knows whether to apply
//      pitch compensation. This avoids the previous silent bug where every
//      male profile sounded female on mobile.
export interface VoiceMatchResult {
  voice: SpeechSynthesisVoice | null
  isFallback: boolean   // true = we couldn't find a real gendered voice
  availableGenders: ('female' | 'male')[]  // what the device actually has
}

export function findBrowserVoiceForGender(
  voices: SpeechSynthesisVoice[],
  gender: 'female' | 'male'
): SpeechSynthesisVoice | null {
  const result = findBrowserVoiceForGenderDetailed(voices, gender)
  return result.voice
}

// Detailed version — returns whether this is a real match or a fallback.
// Use this from use-tts.ts so we can apply pitch compensation on mobile.
export function findBrowserVoiceForGenderDetailed(
  voices: SpeechSynthesisVoice[],
  gender: 'female' | 'male'
): VoiceMatchResult {
  if (!voices || voices.length === 0) {
    return { voice: null, isFallback: false, availableGenders: [] }
  }

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

  // Detect what genders are actually available on this device
  const hasFemale = pool.some(v => femaleNames.some(p => v.name.toLowerCase().includes(p)))
  const hasMale = pool.some(v => maleNames.some(p => v.name.toLowerCase().includes(p)))
  const availableGenders: ('female' | 'male')[] = []
  if (hasFemale) availableGenders.push('female')
  if (hasMale) availableGenders.push('male')

  // Try exact gender match by name
  const names = gender === 'female' ? femaleNames : maleNames
  const match = pool.find(v => {
    const n = v.name.toLowerCase()
    return names.some(pattern => n.includes(pattern))
  })
  if (match) {
    return { voice: match, isFallback: false, availableGenders }
  }

  // Prefer a local Spanish voice whose name doesn't strongly suggest the opposite gender
  const localSpanish = pool.find(v => v.localService && v.lang?.toLowerCase().startsWith('es'))
  if (localSpanish) {
    const n = localSpanish.name.toLowerCase()
    const oppositeNames = gender === 'female' ? maleNames : femaleNames
    const stronglyOpposite = oppositeNames.some(p => n.includes(p))
    if (!stronglyOpposite) {
      // Name is gender-neutral (e.g. "Google español") — accept it as fallback.
      return { voice: localSpanish, isFallback: true, availableGenders }
    }
  }

  // Last resort: any Spanish voice at all (this is the mobile scenario where
  // only one female voice exists and the user wants male). The caller MUST
  // apply pitch compensation to make it sound more masculine.
  const anySpanish = pool.find(v => v.lang?.toLowerCase().startsWith('es')) || pool[0]
  return { voice: anySpanish || null, isFallback: true, availableGenders }
}

// Returns the pitch compensation needed when a male profile must use a
// female voice (mobile scenario). Drops the pitch dramatically so the
// female voice sounds deeper and more masculine. Not perfect, but
// distinguishable from the female voices.
export function compensatePitchForFallback(
  profile: VoiceProfile,
  isFallback: boolean
): number {
  if (!isFallback) return profile.pitch

  // Male profile using female voice → push pitch very low (0.6-0.8 range)
  if (profile.gender === 'male') {
    // Combine profile's intended pitch with a deep drop.
    // e.g. Zeus (0.65) → 0.55, Arcas (0.95) → 0.7, Helios (1.1) → 0.78
    return Math.max(0.5, Math.min(0.85, profile.pitch * 0.75))
  }

  // Female profile using male voice (rare) → push pitch up
  if (profile.gender === 'female' && isFallback) {
    return Math.max(1.0, Math.min(1.6, profile.pitch * 1.2))
  }

  return profile.pitch
}

// Returns the rate compensation for fallback scenarios. When we drop pitch
// a lot, we should slow down slightly so it doesn't sound robotic.
export function compensateRateForFallback(
  profile: VoiceProfile,
  isFallback: boolean
): number {
  if (!isFallback) return profile.rate
  // Slight slowdown for fallback voices to sound more natural
  return Math.max(0.7, profile.rate * 0.95)
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
