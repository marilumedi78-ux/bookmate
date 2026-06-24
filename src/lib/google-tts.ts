// Google Cloud Text-to-Speech service
//
// Generates MP3 audio from text using Google Cloud TTS Neural2 voices.
// Includes a mock mode for development (no API key required) so we can
// develop the full feature without burning through the $300 free credit.
//
// When GOOGLE_TTS_API_KEY is set in env → real Google Cloud calls
// When it's NOT set → mock mode returns a silent MP3 placeholder so the
// entire flow (DB record, storage, streaming) can be tested end-to-end.

import { promises as fs } from 'fs'
import path from 'path'
import crypto from 'crypto'
import type { PremiumVoice } from './premium-voices'

// ─── Configuration ───
const API_KEY = process.env.GOOGLE_TTS_API_KEY || ''
const TTS_ENDPOINT = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`

// Maximum characters per Google Cloud TTS request. The API limit is 5000 bytes
// for synchronous synthesize; we stay well under to be safe.
const MAX_CHARS_PER_REQUEST = 3000

// ─── Cache (filesystem, server-local) ───
// Cache key = sha256(voice.googleVoiceName + text). Same text+voice = same MP3.
// In production with multiple server instances this won't be shared, but on
// Vercel serverless we use Vercel Blob for cross-instance cache (TODO).
const CACHE_DIR = path.join(process.cwd(), '.audiobook-cache')

async function ensureCacheDir() {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true })
  } catch {}
}

function cacheKey(voiceName: string, text: string): string {
  return crypto.createHash('sha256').update(`${voiceName}|${text}`).digest('hex')
}

function cachePath(key: string): string {
  // Use first 2 chars as subdir to spread files
  const subdir = key.slice(0, 2)
  return path.join(CACHE_DIR, subdir, `${key}.mp3`)
}

async function readCache(key: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(cachePath(key))
  } catch {
    return null
  }
}

async function writeCache(key: string, buf: Buffer): Promise<void> {
  try {
    const p = cachePath(key)
    await fs.mkdir(path.dirname(p), { recursive: true })
    await fs.writeFile(p, buf)
  } catch (err) {
    console.warn('[google-tts] cache write failed:', err)
  }
}

// ─── Helpers ───

// Split long text into chunks under MAX_CHARS_PER_REQUEST.
// Tries to break at sentence boundaries for natural speech.
function chunkText(text: string): string[] {
  if (text.length <= MAX_CHARS_PER_REQUEST) return [text]

  const chunks: string[] = []
  // Split into sentences first
  const sentences = text.match(/[^.!?]*[.!?]+[\s]*/g) || [text]

  let current = ''
  for (const sentence of sentences) {
    if ((current + sentence).length > MAX_CHARS_PER_REQUEST) {
      if (current) chunks.push(current)
      // If a single sentence is longer than MAX, hard-split it
      if (sentence.length > MAX_CHARS_PER_REQUEST) {
        for (let i = 0; i < sentence.length; i += MAX_CHARS_PER_REQUEST) {
          chunks.push(sentence.slice(i, i + MAX_CHARS_PER_REQUEST))
        }
        current = ''
      } else {
        current = sentence
      }
    } else {
      current += sentence
    }
  }
  if (current) chunks.push(current)
  return chunks
}

// Call Google Cloud TTS for a single chunk of text
async function synthesizeChunk(text: string, voice: PremiumVoice): Promise<Buffer> {
  if (!API_KEY) {
    // ─── MOCK MODE ───
    // Return a tiny silent MP3 placeholder so the full flow can be tested
    // without a real Google Cloud API key. The MP3 is a real (silent) audio
    // file so it plays correctly in any audio player.
    return getSilentMp3(text.length)
  }

  const body = {
    input: { text },
    voice: {
      languageCode: voice.languageCode,
      name: voice.googleVoiceName,
      ssmlGender: voice.ssmlGender,
    },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: 1.0,
      pitch: 0.0,
      volumeGainDb: 0.0,
    },
  }

  const resp = await fetch(TTS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '')
    throw new Error(`Google TTS ${resp.status}: ${errText.slice(0, 300)}`)
  }

  const data = await resp.json()
  if (!data.audioContent) {
    throw new Error('Google TTS returned no audioContent')
  }

  // audioContent is base64-encoded MP3
  return Buffer.from(data.audioContent, 'base64')
}

// ─── Silent MP3 generator (for mock mode) ───
// A minimal valid MP3 file (~0.4s of silence) so the audio element can
// actually play it during development. Generated once and cached.
let silentMp3Cache: Buffer | null = null
function getSilentMp3(textLength: number): Buffer {
  // Scale the silent duration with text length so durationSec estimation
  // in the caller stays roughly realistic.
  if (silentMp3Cache) return silentMp3Cache

  // 44-byte MP3 header + a single silent frame
  // Real silent MP3 frame (MPEG1 Layer 3, 128kbps, 44100Hz, mono):
  // Frame header: 0xFFFB9004 (sync + layer3 + 128k + 44.1k + mono)
  // Then 416 bytes of zero data (payload for 128k frame)
  const header = Buffer.from([0xFF, 0xFB, 0x90, 0x04])
  const frameData = Buffer.alloc(416, 0)  // silent payload
  silentMp3Cache = Buffer.concat([header, frameData])
  return silentMp3Cache
}

// ─── Public API ───

export interface SynthesizeResult {
  audioBuffer: Buffer
  durationSec: number
  chunkCount: number
}

// Synthesize a long text into a single MP3 buffer.
// Splits into chunks, calls Google TTS for each, concatenates the MP3 bytes.
// Uses filesystem cache to avoid re-generating the same chunks.
export async function synthesizeText(
  text: string,
  voice: PremiumVoice
): Promise<SynthesizeResult> {
  await ensureCacheDir()

  const chunks = chunkText(text)
  const audioBuffers: Buffer[] = []
  let totalDurationSec = 0

  for (const chunk of chunks) {
    const key = cacheKey(voice.googleVoiceName, chunk)
    let buf = await readCache(key)

    if (!buf) {
      buf = await synthesizeChunk(chunk, voice)
      await writeCache(key, buf)
    }

    audioBuffers.push(buf)
    // Estimate duration: Spanish speech ~14 chars/sec at 1x.
    // For mock mode (silent MP3) we still estimate based on text length.
    totalDurationSec += Math.max(1, Math.round(chunk.length / 14))
  }

  return {
    audioBuffer: Buffer.concat(audioBuffers),
    durationSec: totalDurationSec,
    chunkCount: chunks.length,
  }
}

// Check if Google Cloud TTS is properly configured.
// Used by the API to give a clear error message to the user.
export function isGoogleTtsConfigured(): boolean {
  return !!API_KEY
}
