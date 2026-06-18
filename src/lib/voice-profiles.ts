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
}

// ─── Voice profiles organized by plan ───
// Free: 2 basic voices (just gender selection, normal pitch/rate)
// Plus: 6 voice characters with distinct pitch/rate combos
// Pro: 8 voice characters including extreme/expression options

export const VOICE_PROFILES: VoiceProfile[] = [
  // ─── FREE (2 basic voices) ───
  {
    id: 'free-female',
    name: 'Mujer',
    desc: 'Voz femenina del navegador',
    gender: 'female',
    pitch: 1.0,
    rate: 1.0,
    voiceURI: null,
    plan: 'free',
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
  },

  // ─── PLUS (6 voice characters with distinct personalities) ───
  {
    id: 'sofia',
    name: 'Sofía',
    desc: 'Cálida y amigable',
    gender: 'female',
    pitch: 1.1,
    rate: 0.95,
    voiceURI: null,
    plan: 'plus',
    badge: 'Plus',
  },
  {
    id: 'mateo',
    name: 'Mateo',
    desc: 'Profesional y claro',
    gender: 'male',
    pitch: 0.9,
    rate: 1.0,
    voiceURI: null,
    plan: 'plus',
    badge: 'Plus',
  },
  {
    id: 'lucia',
    name: 'Lucía',
    desc: 'Joven y natural',
    gender: 'female',
    pitch: 1.3,
    rate: 1.05,
    voiceURI: null,
    plan: 'plus',
    badge: 'Plus',
  },
  {
    id: 'daniel',
    name: 'Daniel',
    desc: 'Grave y envolvente',
    gender: 'male',
    pitch: 0.7,
    rate: 0.9,
    voiceURI: null,
    plan: 'plus',
    badge: 'Plus',
  },
  {
    id: 'valeria',
    name: 'Valeria',
    desc: 'Energética y alegre',
    gender: 'female',
    pitch: 1.5,
    rate: 1.1,
    voiceURI: null,
    plan: 'plus',
    badge: 'Plus',
  },
  {
    id: 'andres',
    name: 'Andrés',
    desc: 'Sereno y pausado',
    gender: 'male',
    pitch: 0.85,
    rate: 0.85,
    voiceURI: null,
    plan: 'plus',
    badge: 'Plus',
  },

  // ─── PRO (2 additional expressive voices) ───
  {
    id: 'isabela',
    name: 'Isabela',
    desc: 'Narradora de audiolibros',
    gender: 'female',
    pitch: 1.0,
    rate: 0.92,
    voiceURI: null,
    plan: 'pro',
    badge: 'Pro',
  },
  {
    id: 'alejandro',
    name: 'Alejandro',
    desc: 'Voz teatral y profunda',
    gender: 'male',
    pitch: 0.6,
    rate: 0.88,
    voiceURI: null,
    plan: 'pro',
    badge: 'Pro',
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

// Find the best matching browser voice for a profile's gender
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
    'mónica', 'paula', 'esperanza',
  ]
  // Known male voice name patterns
  const maleNames = [
    'pablo', 'jorge', 'miguel', 'enrique', 'carlos', 'diego', 'juan',
    'mateo', 'daniel', 'andres', 'andrés', 'alejandro', 'male', 'hombre',
    'masculino', 'javier', 'raúl', 'raul',
  ]

  const names = gender === 'female' ? femaleNames : maleNames
  const match = pool.find(v => {
    const n = v.name.toLowerCase()
    return names.some(pattern => n.includes(pattern))
  })

  if (match) return match

  // Fallback: prefer local Spanish voices
  const localSpanish = pool.find(v => v.localService && v.lang?.toLowerCase().startsWith('es'))
  if (localSpanish) return localSpanish

  // Final fallback: first available voice
  return pool[0] || null
}
