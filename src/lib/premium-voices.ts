'use client'

// Premium Voice System — Google Cloud Text-to-Speech (Neural2 Spanish voices)
//
// These are SERVER-RENDERED voices used for the "Download MP3" feature
// (plan Pro). The user picks a premium voice, taps "Descargar audiolibro",
// and the server generates a full MP3 with that voice.
//
// On the client, these voices are NOT used for live reading — that stays
// on the browser Web Speech API (see voice-profiles.ts). Premium voices
// are exclusively for MP3 generation, which works with the screen off
// (just like Spotify).
//
// Google Cloud Neural2 Spanish voices we use:
//   - es-ES-Neural2-C  (Lucía, female, Spain)
//   - es-AR-Neural2-A  (Diego, male, Argentina — covers LATAM accent)
//   - es-MX-Neural2-C  (Valeria, female, Mexico — covers LATAM accent)
//
// Cost at Google Cloud (Oct 2025): $16 per 1M characters for Neural2.
// A typical 300-page book = ~150k words = ~900k chars = ~15h audio = ~$14.4.
// With cross-user cache, the second user who downloads the same book+voice
// costs $0.

export type PremiumGender = 'female' | 'male'

export interface PremiumVoice {
  id: string                 // voice id used in the API (e.g. 'lucia-es-ES')
  googleVoiceName: string    // actual Google Cloud TTS voice name (e.g. 'es-ES-Neural2-C')
  languageCode: string       // BCP-47 (e.g. 'es-ES')
  name: string               // friendly display name (Spanish)
  desc: string               // short description
  gender: PremiumGender
  accent: 'es-ES' | 'es-AR' | 'es-MX'
  accentLabel: string        // human-readable accent (e.g. "España")
  ssmlGender: 'FEMALE' | 'MALE'  // Google Cloud TTS ssmlGender enum value
}

// ─── Premium voices (all available to Pro users) ───
// We keep this list intentionally small (3 voices) to:
//   1. Limit Google Cloud TTS cost (each new voice × book = potentially new MP3)
//   2. Make the choice easier for the user
//   3. Cover the 3 main Spanish accents (Spain, Cono Sur, Mexico/Centroamerica)

export const PREMIUM_VOICES: PremiumVoice[] = [
  {
    id: 'lucia-es-ES',
    googleVoiceName: 'es-ES-Neural2-C',
    languageCode: 'es-ES',
    name: 'Lucía',
    desc: 'Cálida y clara, acento de España',
    gender: 'female',
    accent: 'es-ES',
    accentLabel: 'España',
    ssmlGender: 'FEMALE',
  },
  {
    id: 'diego-es-AR',
    googleVoiceName: 'es-AR-Neural2-A',
    languageCode: 'es-AR',
    name: 'Diego',
    desc: 'Grave y narrativa, acento rioplatense',
    gender: 'male',
    accent: 'es-AR',
    accentLabel: 'Argentina',
    ssmlGender: 'MALE',
  },
  {
    id: 'valeria-es-MX',
    googleVoiceName: 'es-MX-Neural2-C',
    languageCode: 'es-MX',
    name: 'Valeria',
    desc: 'Joven y expresiva, acento mexicano',
    gender: 'female',
    accent: 'es-MX',
    accentLabel: 'México',
    ssmlGender: 'FEMALE',
  },
]

// Get a premium voice by its id
export function getPremiumVoiceById(id: string): PremiumVoice | undefined {
  return PREMIUM_VOICES.find(v => v.id === id)
}

// Get all premium voices available for a given plan.
// Currently all premium voices require Pro (because MP3 download is Pro-only).
export function getPremiumVoicesForPlan(plan: 'free' | 'plus' | 'pro'): PremiumVoice[] {
  if (plan === 'pro') return PREMIUM_VOICES
  return []
}

// Count of premium voices per plan (used in pricing UI)
export const PREMIUM_VOICE_COUNTS = {
  plus: 0,                 // Plus doesn't get premium MP3 voices
  pro: PREMIUM_VOICES.length,  // 3
}

// Preview text used for the dropdown "test voice" buttons.
// Played via /api/tts-premium which generates a short sample MP3.
export const PREMIUM_VOICE_PREVIEW_TEXT = 'Hola, soy una de las voces premium de Escucha Libros. Así sonaré cuando genere el audiolibro MP3 de tu libro favorito.'
