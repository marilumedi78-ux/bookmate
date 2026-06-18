'use client'

// Voice Profile System
// Combines browser TTS voice + pitch + rate to create distinct "voice characters"
// Works on ALL devices (Web Speech API is universal) and costs $0 (no API calls)

export interface VoiceProfile {
  id: string
  name: string          // Friendly Spanish name (e.g., "Sofía")
  desc: string          // Short description (e.g., "Cálida y amigable")
  gender: 'female' | 'male'
  pitch: number         // 0.5 - 2.0 (1.0 = normal)
  rate: number          // 0.5 - 2.0 (1.0 = normal)
  voiceURI: string | null  // null = use best available Spanish voice of matching gender
  plan: 'free' | 'plus' | 'pro'  // Minimum plan required
  badge?: string        // Optional badge like "Premium" or "Pro"
  engine?: 'browser' | 'premium'  // 'browser' = Web Speech API (free); 'premium' = Deepgram via /api/tts-premium
  premiumVoiceId?: string  // When engine='premium', the Deepgram voice id (e.g. 'stella')
  previewUrl?: string   // When engine='premium', URL to a static preview MP3
}

// ─── Voice profiles organized by plan ───
// Free: 2 basic browser voices (just gender selection)
// Plus: 6 neural Deepgram voices (3F + 3M) — native Spanish
// Pro: 4 more neural Deepgram voices (2F + 2M) — most distinctive

export const VOICE_PROFILES: VoiceProfile[] = [
  // ─── FREE (2 basic browser voices via Web Speech API) ───
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

  // ─── PLUS (6 neural Deepgram voices: 3F + 3M) ───
  {
    id: 'pv-stella',
    name: 'Stella',
    desc: 'Cálida narrativa femenina',
    gender: 'female',
    pitch: 1.0,
    rate: 1.0,
    voiceURI: null,
    plan: 'plus',
    badge: 'Plus',
    engine: 'premium',
    premiumVoiceId: 'stella',
    previewUrl: '/samples/voice-stella.mp3',
  },
  {
    id: 'pv-luna',
    name: 'Luna',
    desc: 'Suave y dulce',
    gender: 'female',
    pitch: 1.0,
    rate: 1.0,
    voiceURI: null,
    plan: 'plus',
    badge: 'Plus',
    engine: 'premium',
    premiumVoiceId: 'luna',
    previewUrl: '/samples/voice-luna.mp3',
  },
  {
    id: 'pv-athena',
    name: 'Atenea',
    desc: 'Clara y profesional',
    gender: 'female',
    pitch: 1.0,
    rate: 1.0,
    voiceURI: null,
    plan: 'plus',
    badge: 'Plus',
    engine: 'premium',
    premiumVoiceId: 'athena',
    previewUrl: '/samples/voice-athena.mp3',
  },
  {
    id: 'pv-arcas',
    name: 'Arcas',
    desc: 'Cálida y amigable',
    gender: 'male',
    pitch: 1.0,
    rate: 1.0,
    voiceURI: null,
    plan: 'plus',
    badge: 'Plus',
    engine: 'premium',
    premiumVoiceId: 'arcas',
    previewUrl: '/samples/voice-arcas.mp3',
  },
  {
    id: 'pv-helios',
    name: 'Helios',
    desc: 'Clara y enérgica',
    gender: 'male',
    pitch: 1.0,
    rate: 1.0,
    voiceURI: null,
    plan: 'plus',
    badge: 'Plus',
    engine: 'premium',
    premiumVoiceId: 'helios',
    previewUrl: '/samples/voice-helios.mp3',
  },
  {
    id: 'pv-eros',
    name: 'Eros',
    desc: 'Suave y juvenil',
    gender: 'male',
    pitch: 1.0,
    rate: 1.0,
    voiceURI: null,
    plan: 'plus',
    badge: 'Plus',
    engine: 'premium',
    premiumVoiceId: 'eros',
    previewUrl: '/samples/voice-eros.mp3',
  },

  // ─── PRO (4 additional distinctive Deepgram voices: 2F + 2M) ───
  {
    id: 'pv-hera',
    name: 'Hera',
    desc: 'Profunda y elegante',
    gender: 'female',
    pitch: 1.0,
    rate: 1.0,
    voiceURI: null,
    plan: 'pro',
    badge: 'Pro',
    engine: 'premium',
    premiumVoiceId: 'hera',
    previewUrl: '/samples/voice-hera.mp3',
  },
  {
    id: 'pv-diana',
    name: 'Diana',
    desc: 'Joven y energética',
    gender: 'female',
    pitch: 1.0,
    rate: 1.0,
    voiceURI: null,
    plan: 'pro',
    badge: 'Pro',
    engine: 'premium',
    premiumVoiceId: 'diana',
    previewUrl: '/samples/voice-diana.mp3',
  },
  {
    id: 'pv-orion',
    name: 'Orión',
    desc: 'Grave y envolvente',
    gender: 'male',
    pitch: 1.0,
    rate: 1.0,
    voiceURI: null,
    plan: 'pro',
    badge: 'Pro',
    engine: 'premium',
    premiumVoiceId: 'orion',
    previewUrl: '/samples/voice-orion.mp3',
  },
  {
    id: 'pv-zeus',
    name: 'Zeus',
    desc: 'Profunda y autoritaria',
    gender: 'male',
    pitch: 1.0,
    rate: 1.0,
    voiceURI: null,
    plan: 'pro',
    badge: 'Pro',
    engine: 'premium',
    premiumVoiceId: 'zeus',
    previewUrl: '/samples/voice-zeus.mp3',
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
    'mónica', 'paula', 'esperanza', 'mujer español',
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
export function isPremiumVoice(profile: VoiceProfile | undefined): boolean {
  return !!profile && profile.engine === 'premium' && !!profile.premiumVoiceId
}
