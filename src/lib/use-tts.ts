'use client'

import { useEffect, useRef, useCallback, useState, useMemo } from 'react'
import { useBookMateStore } from './store'
import {
  getVoiceProfile,
  findBrowserVoiceForGender,
  isPremiumVoice,
  VOICE_PREVIEW_TEXT,
  type VoiceProfile,
} from './voice-profiles'
import { isSentenceSkipped, isNoiseSentence, type SkipRange } from './skip-utils'
import { useWakeLock } from './use-wake-lock'

// Split text into sentences for TTS playback
function splitIntoSentences(text: string): { text: string; start: number; end: number }[] {
  if (!text) return []

  const sentences: { text: string; start: number; end: number }[] = []
  const regex = /[^.!?]*[.!?]+[\s]*/g
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    const sentence = match[0].trim()
    if (sentence) {
      sentences.push({
        text: sentence,
        start: match.index,
        end: match.index + match[0].length,
      })
    }
  }

  const lastEnd = sentences.length > 0 ? sentences[sentences.length - 1].end : 0
  const remaining = text.slice(lastEnd).trim()
  if (remaining) {
    sentences.push({
      text: remaining,
      start: lastEnd,
      end: text.length,
    })
  }

  if (sentences.length === 0 && text.trim()) {
    const chunkSize = 200
    for (let i = 0; i < text.length; i += chunkSize) {
      const chunk = text.slice(i, i + chunkSize).trim()
      if (chunk) {
        sentences.push({
          text: chunk,
          start: i,
          end: Math.min(i + chunkSize, text.length),
        })
      }
    }
  }

  return sentences
}

// Safe wrapper for speechSynthesis calls
function safeCancel() {
  try { window.speechSynthesis.cancel() } catch {}
}

function safeGetVoices(): SpeechSynthesisVoice[] {
  try { return window.speechSynthesis.getVoices() } catch { return [] }
}

export type TTSStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error' | 'not-supported'

export function useTTS() {
  const {
    bookText,
    isPlaying,
    setIsPlaying,
    playbackSpeed,
    currentCharIndex,
    setCurrentCharIndex,
    selectedVoiceProfileId,
    currentBook,
    skipRanges,
    autoSkipEnabled,
  } = useBookMateStore()

  const sentencesRef = useRef<{ text: string; start: number; end: number }[]>([])
  const currentSentenceIndexRef = useRef(0)
  const isPlayingRef = useRef(false)
  const playbackSpeedRef = useRef(1)
  const currentCharIndexRef = useRef(0)
  const isPausedRef = useRef(false)
  const bookTextRef = useRef('')
  const consecutiveErrorCountRef = useRef(0)
  const voicesLoadedRef = useRef(false)
  const currentProfileRef = useRef<VoiceProfile | undefined>(undefined)
  const skipRangesRef = useRef<SkipRange[]>([])
  const autoSkipRef = useRef(false)
  const MAX_CONSECUTIVE_ERRORS = 3

  // ─── Premium TTS engine (HTML5 Audio via /api/tts-premium) ───
  // Used when currentProfile.engine === 'premium'. We keep a single Audio element
  // and reuse it across sentences.
  const premiumAudioRef = useRef<HTMLAudioElement | null>(null)
  const premiumSentenceIdxRef = useRef<number>(-1)
  const premiumAbortRef = useRef<boolean>(false)

  // Get (or lazily create) the shared premium audio element
  const getPremiumAudio = useCallback((): HTMLAudioElement | null => {
    if (typeof window === 'undefined') return null
    if (!premiumAudioRef.current) {
      const audio = new Audio()
      audio.preload = 'auto'
      // Apply playback speed (HTML5 Audio supports playbackRate 0.5–2.0)
      audio.playbackRate = playbackSpeedRef.current || 1
      premiumAudioRef.current = audio
    }
    return premiumAudioRef.current
  }, [])

  // Stop premium playback and abort any pending fetch
  const stopPremium = useCallback(() => {
    premiumAbortRef.current = true
    const audio = premiumAudioRef.current
    if (audio) {
      try {
        audio.pause()
        audio.removeAttribute('src')
        audio.load() // releases any pending fetch
      } catch {}
    }
  }, [])

  // Keep skip refs in sync — used by speakSentence to skip omitted parts
  useEffect(() => {
    skipRangesRef.current = currentBook?.id ? skipRanges[currentBook.id] || [] : []
  }, [currentBook?.id, skipRanges])

  useEffect(() => {
    autoSkipRef.current = autoSkipEnabled
  }, [autoSkipEnabled])

  // Check if speech synthesis is supported
  const [speechSupported, setSpeechSupported] = useState(false)
  const [ttsStatus, setTtsStatus] = useState<TTSStatus>('idle')
  const [ttsError, setTtsError] = useState<string | null>(null)

  const speakSentenceRef = useRef<(idx: number) => void>(() => {})

  // Keep refs in sync with state
  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  useEffect(() => {
    playbackSpeedRef.current = playbackSpeed
  }, [playbackSpeed])

  useEffect(() => {
    currentCharIndexRef.current = currentCharIndex
  }, [currentCharIndex])

  useEffect(() => {
    bookTextRef.current = bookText
    sentencesRef.current = splitIntoSentences(bookText)
    currentSentenceIndexRef.current = 0
  }, [bookText])

  // Detect speech support on client-side only (avoids hydration mismatch)
  useEffect(() => {
    const supported = typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: detect browser feature on client only
    setSpeechSupported(supported)
    if (!supported) {
      setTtsStatus('not-supported')
      setTtsError('Tu navegador no soporta lectura en voz alta')
    }
  }, [])

  // Load voices - CRITICAL for Chrome and mobile browsers
  useEffect(() => {
    if (!speechSupported) return

    const checkVoices = () => {
      const voices = safeGetVoices()
      if (voices.length > 0) {
        voicesLoadedRef.current = true
      }
    }

    checkVoices()
    try {
      window.speechSynthesis.addEventListener('voiceschanged', checkVoices)
    } catch {
      window.speechSynthesis.onvoiceschanged = checkVoices
    }
    const timer1 = setTimeout(checkVoices, 100)
    const timer2 = setTimeout(checkVoices, 500)
    const timer3 = setTimeout(checkVoices, 2000)

    return () => {
      try {
        window.speechSynthesis.removeEventListener('voiceschanged', checkVoices)
      } catch {}
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
    }
  }, [speechSupported])

  // ─── KEY FIX: React to voice profile changes ───
  // When user selects a new voice profile, immediately stop current playback
  // and restart with the new voice so the change is audible.
  useEffect(() => {
    const newProfile = getVoiceProfile(selectedVoiceProfileId)
    const profileChanged = currentProfileRef.current?.id !== newProfile?.id
    currentProfileRef.current = newProfile

    if (profileChanged && isPlayingRef.current && speechSupported) {
      // Stop and restart with new voice from current sentence
      const currentIdx = currentSentenceIndexRef.current
      safeCancel()
      isPausedRef.current = false
      // Small delay to let cancel() complete before re-speaking
      setTimeout(() => {
        if (isPlayingRef.current) {
          speakSentenceRef.current(currentIdx)
        }
      }, 150)
    }
  }, [selectedVoiceProfileId, speechSupported])

  // Find the sentence index for a given character position
  const findSentenceIndex = useCallback((charIdx: number): number => {
    const sentences = sentencesRef.current
    if (sentences.length === 0) return 0

    for (let i = 0; i < sentences.length; i++) {
      if (charIdx >= sentences[i].start && charIdx < sentences[i].end) {
        return i
      }
    }

    if (charIdx >= sentences[sentences.length - 1].end) {
      return sentences.length - 1
    }

    return 0
  }, [])

  // ─── Premium engine: play one sentence via /api/tts-premium ───
  const speakSentencePremium = useCallback((idx: number, text: string, voiceId: string) => {
    const audio = getPremiumAudio()
    if (!audio) {
      setTtsStatus('error')
      setTtsError('Tu navegador no soporta audio HTML5.')
      setIsPlaying(false)
      isPlayingRef.current = false
      return
    }

    // Cancel any pending browser TTS so the two engines don't overlap
    safeCancel()

    // Mark this sentence as the "currently playing" premium one
    premiumSentenceIdxRef.current = idx
    premiumAbortRef.current = false

    // Reset error count on a fresh play
    consecutiveErrorCountRef.current = 0

    // Build URL. Same text+voice = same audio = cacheable on the server.
    const url = `/api/tts-premium?voice=${encodeURIComponent(voiceId)}&text=${encodeURIComponent(text)}`

    // Set up event handlers (on* props overwrite previous handlers)
    audio.onplaying = () => {
      setTtsStatus('playing')
      setTtsError(null)
    }
    audio.onended = () => {
      if (premiumAbortRef.current) return
      if (isPlayingRef.current && !isPausedRef.current) {
        // Advance to next sentence
        const nextIdx = premiumSentenceIdxRef.current + 1
        speakSentenceRef.current(nextIdx)
      }
    }
    audio.onerror = () => {
      if (premiumAbortRef.current) return
      consecutiveErrorCountRef.current += 1
      if (consecutiveErrorCountRef.current >= MAX_CONSECUTIVE_ERRORS) {
        setTtsStatus('error')
        setTtsError('No se pudo generar el audio premium. Intenta de nuevo.')
        setIsPlaying(false)
        isPlayingRef.current = false
        isPausedRef.current = false
        return
      }
      // Skip to next sentence on error
      if (isPlayingRef.current && !isPausedRef.current) {
        setTimeout(() => {
          const nextIdx = premiumSentenceIdxRef.current + 1
          speakSentenceRef.current(nextIdx)
        }, 200)
      }
    }

    // Apply current playback speed (in case it changed)
    audio.playbackRate = playbackSpeedRef.current || 1

    // Load the new URL and play
    audio.src = url
    audio.load()

    // Show loading state until audio starts playing
    setTtsStatus('loading')
    setTtsError(null)

    // play() returns a promise that rejects if autoplay is blocked.
    // We rely on user having clicked play already, so this should be allowed.
    audio.play().catch((err) => {
      if (premiumAbortRef.current) return
      console.warn('[premium-tts] play() rejected:', err)
      setTtsStatus('error')
      setTtsError('No se pudo iniciar la reproducción. Toca play de nuevo.')
      setIsPlaying(false)
      isPlayingRef.current = false
    })
  }, [getPremiumAudio, setIsPlaying])

  // Speak a single sentence — wrapped in try-catch to prevent client-side crash
  const speakSentence = useCallback((sentenceIdx: number) => {
    const sentences = sentencesRef.current

    // Note: premium voices use HTML5 Audio, not speechSynthesis, so they work even
    // when speechSupported is false. We only bail here if there's no text to read.
    const profile = currentProfileRef.current
    const isPremium = isPremiumVoice(profile)

    if (!speechSupported && !isPremium) {
      setIsPlaying(false)
      isPlayingRef.current = false
      return
    }

    if (sentenceIdx >= sentences.length) {
      safeCancel()
      stopPremium()
      setIsPlaying(false)
      isPlayingRef.current = false
      setTtsStatus('idle')
      setTtsError(null)
      return
    }

    // ─── Skip omitted sentences (manual "No leer" ranges + auto noise detection) ───
    let idx = sentenceIdx
    while (idx < sentences.length) {
      const s = sentences[idx]
      const manuallySkipped = isSentenceSkipped(s.start, s.end, skipRangesRef.current)
      const autoSkipped = autoSkipRef.current && isNoiseSentence(s.text)
      if (!manuallySkipped && !autoSkipped) break
      idx++
    }

    if (idx >= sentences.length) {
      // Everything from here to the end is omitted — stop playback
      safeCancel()
      stopPremium()
      setIsPlaying(false)
      isPlayingRef.current = false
      setTtsStatus('idle')
      setTtsError(null)
      return
    }

    const sentence = sentences[idx]
    currentSentenceIndexRef.current = idx
    setCurrentCharIndex(sentence.start)

    // ─── Dispatch to premium engine if the current profile is a Deepgram voice ───
    if (isPremium && profile?.premiumVoiceId) {
      // Premium engine uses HTML5 Audio via /api/tts-premium (no speechSynthesis).
      // We do NOT require speechSupported here — only an audio element.
      speakSentencePremium(idx, sentence.text, profile.premiumVoiceId)
      return
    }

    // Browser engine requires speechSynthesis support
    if (!speechSupported) {
      setIsPlaying(false)
      isPlayingRef.current = false
      return
    }

    try {
      const utterance = new SpeechSynthesisUtterance(sentence.text)
      // Combine playback speed with profile rate
      const profileRate = profile?.rate ?? 1.0
      utterance.rate = Math.min(2.0, Math.max(0.5, playbackSpeedRef.current * profileRate))
      utterance.pitch = profile?.pitch ?? 1.0

      // Find the best matching browser voice for this profile's gender
      const voices = safeGetVoices()
      let selectedVoice: SpeechSynthesisVoice | null = null

      if (profile?.voiceURI) {
        // Profile specifies a specific voice URI
        selectedVoice = voices.find(v => v.voiceURI === profile.voiceURI) || null
      } else if (profile) {
        // Profile wants best voice for its gender
        selectedVoice = findBrowserVoiceForGender(voices, profile.gender)
      }

      // Fallback to best Spanish voice if nothing matched
      if (!selectedVoice && voices.length > 0) {
        selectedVoice = voices.find(v => v.lang.startsWith('es') && v.localService) || null
        if (!selectedVoice) {
          selectedVoice = voices.find(v => v.lang.startsWith('es')) || null
        }
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice
        utterance.lang = selectedVoice.lang
      } else {
        utterance.lang = 'es-ES'
      }

      utterance.onstart = () => {
        consecutiveErrorCountRef.current = 0
        setTtsStatus('playing')
        setTtsError(null)
      }

      utterance.onend = () => {
        if (isPlayingRef.current && !isPausedRef.current) {
          speakSentenceRef.current(idx + 1)
        }
      }

      utterance.onerror = (event) => {
        if (event.error === 'interrupted' || event.error === 'canceled') {
          return
        }

        consecutiveErrorCountRef.current += 1

        if (consecutiveErrorCountRef.current >= MAX_CONSECUTIVE_ERRORS) {
          const errorMsg = event.error === 'synthesis-failed'
            ? 'No se pudo reproducir audio. Intenta recargar la página.'
            : `Error de voz: ${event.error}`

          safeCancel()
          setIsPlaying(false)
          isPlayingRef.current = false
          isPausedRef.current = false
          setTtsStatus('error')
          setTtsError(errorMsg)
          return
        }

        if (isPlayingRef.current && !isPausedRef.current) {
          setTimeout(() => speakSentenceRef.current(idx + 1), 200)
        }
      }

      safeCancel()

      const speakDelay = voicesLoadedRef.current ? 10 : 100
      setTimeout(() => {
        if (isPlayingRef.current || isPausedRef.current) {
          try {
            window.speechSynthesis.speak(utterance)
          } catch (err) {
            setTtsStatus('error')
            setTtsError('Error al iniciar la lectura. Intenta de nuevo.')
            setIsPlaying(false)
            isPlayingRef.current = false
          }
        }
      }, speakDelay)
    } catch (err) {
      setTtsStatus('error')
      setTtsError('Error de síntesis de voz. Intenta recargar la página.')
      setIsPlaying(false)
      isPlayingRef.current = false
    }
  }, [speechSupported, setCurrentCharIndex, setIsPlaying, speakSentencePremium, stopPremium])

  // Keep the ref updated
  useEffect(() => {
    speakSentenceRef.current = speakSentence
  }, [speakSentence])

  // ─── Preview a voice profile (play sample text without affecting playback) ───
  const previewVoice = useCallback((profileId: string) => {
    const profile = getVoiceProfile(profileId)
    if (!profile) return

    // Stop any current playback first (both engines)
    safeCancel()
    stopPremium()

    // ─── Premium voice: play the static preview MP3 via HTML5 Audio ───
    if (isPremiumVoice(profile) && profile.previewUrl) {
      const audio = getPremiumAudio()
      if (!audio) {
        setTtsError('Tu navegador no soporta audio HTML5.')
        return
      }
      premiumAbortRef.current = false
      audio.onplaying = () => { setTtsError(null) }
      audio.onended = () => { /* preview ends — no auto-advance */ }
      audio.onerror = () => { setTtsError('No se pudo cargar la muestra de voz.') }
      audio.playbackRate = 1
      audio.src = profile.previewUrl
      audio.load()
      audio.play().catch(() => {
        setTtsError('Toca de nuevo para reproducir la muestra.')
      })
      return
    }

    // ─── Browser voice: use speechSynthesis ───
    if (!speechSupported) {
      setTtsStatus('not-supported')
      setTtsError('Tu navegador no soporta lectura en voz alta')
      return
    }

    try {
      const utterance = new SpeechSynthesisUtterance(VOICE_PREVIEW_TEXT)
      utterance.rate = profile.rate
      utterance.pitch = profile.pitch

      const voices = safeGetVoices()
      let selectedVoice: SpeechSynthesisVoice | null = null

      if (profile.voiceURI) {
        selectedVoice = voices.find(v => v.voiceURI === profile.voiceURI) || null
      } else {
        selectedVoice = findBrowserVoiceForGender(voices, profile.gender)
      }

      if (!selectedVoice && voices.length > 0) {
        selectedVoice = voices.find(v => v.lang.startsWith('es')) || voices[0]
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice
        utterance.lang = selectedVoice.lang
      } else {
        utterance.lang = 'es-ES'
      }

      window.speechSynthesis.speak(utterance)
    } catch (err) {
      setTtsError('No se pudo reproducir la muestra de voz')
    }
  }, [speechSupported, getPremiumAudio, stopPremium])

  // Stop any voice preview (or playback)
  const stopPreview = useCallback(() => {
    safeCancel()
    stopPremium()
  }, [stopPremium])

  // Start playing from current position
  const play = useCallback(() => {
    const profile = currentProfileRef.current
    const isPremium = isPremiumVoice(profile)

    // Premium voices don't require speechSupported — they use HTML5 Audio
    if (!speechSupported && !isPremium) {
      setTtsStatus('not-supported')
      setTtsError('Tu navegador no soporta lectura en voz alta')
      return
    }

    if (!bookTextRef.current) {
      setTtsStatus('error')
      setTtsError('No hay texto para leer')
      return
    }

    // If paused, resume
    if (isPausedRef.current) {
      // Premium resume: just call audio.play() on the existing element
      if (isPremium) {
        const audio = premiumAudioRef.current
        if (audio && audio.src) {
          isPausedRef.current = false
          setIsPlaying(true)
          isPlayingRef.current = true
          setTtsStatus('playing')
          audio.play().catch(() => {})
          return
        }
        // No existing audio — fall through to fresh start
      } else {
        try {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume()
            isPausedRef.current = false
            setIsPlaying(true)
            isPlayingRef.current = true
            setTtsStatus('playing')
            return
          }
        } catch {
          // Speech API unavailable, fall through to restart
        }
      }
      isPausedRef.current = false
    }

    setTtsStatus('loading')
    setTtsError(null)

    const sentenceIdx = findSentenceIndex(currentCharIndexRef.current)
    isPausedRef.current = false
    consecutiveErrorCountRef.current = 0
    setIsPlaying(true)
    isPlayingRef.current = true
    speakSentence(sentenceIdx)
  }, [speechSupported, findSentenceIndex, speakSentence, setIsPlaying])

  // Pause playback
  const pause = useCallback(() => {
    const profile = currentProfileRef.current
    const isPremium = isPremiumVoice(profile)

    if (!speechSupported && !isPremium) return

    isPausedRef.current = true
    isPlayingRef.current = false
    setIsPlaying(false)
    setTtsStatus('paused')

    if (isPremium) {
      const audio = premiumAudioRef.current
      if (audio) {
        try { audio.pause() } catch {}
      }
      return
    }

    try {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.pause()
        setTimeout(() => {
          try {
            if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
              safeCancel()
            }
          } catch {}
        }, 300)
      }
    } catch {}
  }, [speechSupported, setIsPlaying])

  // Stop playback completely
  const stop = useCallback(() => {
    const profile = currentProfileRef.current
    const isPremium = isPremiumVoice(profile)

    if (!speechSupported && !isPremium) return
    isPausedRef.current = false
    isPlayingRef.current = false
    setIsPlaying(false)
    setTtsStatus('idle')
    setTtsError(null)
    safeCancel()
    stopPremium()
  }, [speechSupported, setIsPlaying, stopPremium])

  // Skip forward by ~10 sentences
  const skipForward = useCallback(() => {
    const profile = currentProfileRef.current
    const isPremium = isPremiumVoice(profile)
    if (!speechSupported && !isPremium) return

    const wasPlaying = isPlayingRef.current
    safeCancel()
    stopPremium()

    const nextIdx = Math.min(
      currentSentenceIndexRef.current + 10,
      sentencesRef.current.length - 1
    )
    currentSentenceIndexRef.current = nextIdx
    setCurrentCharIndex(sentencesRef.current[nextIdx]?.start ?? currentCharIndexRef.current)

    if (wasPlaying) {
      isPausedRef.current = false
      setTimeout(() => speakSentenceRef.current(nextIdx), 150)
    }
  }, [speechSupported, setCurrentCharIndex, stopPremium])

  // Skip backward by ~10 sentences
  const skipBack = useCallback(() => {
    const profile = currentProfileRef.current
    const isPremium = isPremiumVoice(profile)
    if (!speechSupported && !isPremium) return

    const wasPlaying = isPlayingRef.current
    safeCancel()
    stopPremium()

    const prevIdx = Math.max(currentSentenceIndexRef.current - 10, 0)
    currentSentenceIndexRef.current = prevIdx
    setCurrentCharIndex(sentencesRef.current[prevIdx]?.start ?? 0)

    if (wasPlaying) {
      isPausedRef.current = false
      setTimeout(() => speakSentenceRef.current(prevIdx), 150)
    }
  }, [speechSupported, setCurrentCharIndex, stopPremium])

  // Jump to a specific character position
  const seekTo = useCallback((charIdx: number) => {
    const profile = currentProfileRef.current
    const isPremium = isPremiumVoice(profile)
    if (!speechSupported && !isPremium) return

    const wasPlaying = isPlayingRef.current
    safeCancel()
    stopPremium()

    const sentenceIdx = findSentenceIndex(charIdx)
    currentSentenceIndexRef.current = sentenceIdx
    setCurrentCharIndex(charIdx)

    if (wasPlaying) {
      isPausedRef.current = false
      setTimeout(() => speakSentenceRef.current(sentenceIdx), 150)
    }
  }, [speechSupported, findSentenceIndex, setCurrentCharIndex, stopPremium])

  // Handle speed changes while playing
  useEffect(() => {
    // Update premium audio playbackRate immediately
    const audio = premiumAudioRef.current
    if (audio) {
      audio.playbackRate = playbackSpeed || 1
    }
    // Restart browser TTS with new speed if currently playing
    if (isPlayingRef.current && speechSupported) {
      const profile = currentProfileRef.current
      if (!isPremiumVoice(profile)) {
        const currentIdx = currentSentenceIndexRef.current
        safeCancel()
        isPausedRef.current = false
        setTimeout(() => speakSentenceRef.current(currentIdx), 150)
      }
      // Premium audio playbackRate is already updated above — no restart needed
    }
  }, [playbackSpeed, speechSupported])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      safeCancel()
      stopPremium()
    }
  }, [stopPremium])

  // Stop playing when book text changes (direct cancel, no setState in effect)
  useEffect(() => {
    if (bookText && speechSupported) {
      safeCancel()
      stopPremium()
      isPlayingRef.current = false
      isPausedRef.current = false
      currentSentenceIndexRef.current = 0
      setIsPlaying(false)
    }
  }, [bookText, speechSupported, setIsPlaying, stopPremium])

  // ─── Wake Lock: keep screen on while TTS is actively playing ───
  // This is what allows the app to keep reading when the phone screen turns off.
  // Activated only when ttsStatus === 'playing' (not when paused/idle/error).
  const isActivelyPlaying = ttsStatus === 'playing'
  const isPaused = ttsStatus === 'paused'
  useWakeLock(isActivelyPlaying, isPaused)

  // Memoize return object to prevent unnecessary re-renders
  return useMemo(() => ({
    play,
    pause,
    stop,
    skipForward,
    skipBack,
    seekTo,
    previewVoice,
    stopPreview,
    ttsStatus,
    ttsError,
  }), [play, pause, stop, skipForward, skipBack, seekTo, previewVoice, stopPreview, ttsStatus, ttsError])
}
