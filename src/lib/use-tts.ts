'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useBookMateStore } from './store'

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

export type TTSStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error' | 'not-supported'

export function useTTS() {
  const {
    bookText,
    isPlaying,
    setIsPlaying,
    playbackSpeed,
    currentCharIndex,
    setCurrentCharIndex,
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
  const MAX_CONSECUTIVE_ERRORS = 3

  // Check if speech synthesis is supported (computed once, not in effect)
  const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

  const [ttsStatus, setTtsStatus] = useState<TTSStatus>(speechSupported ? 'idle' : 'not-supported')
  const [ttsError, setTtsError] = useState<string | null>(speechSupported ? null : 'Tu navegador no soporta lectura en voz alta')

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

  // Load voices - CRITICAL for Chrome and mobile browsers
  useEffect(() => {
    if (!speechSupported) return

    const checkVoices = () => {
      const voices = window.speechSynthesis.getVoices()
      if (voices.length > 0) {
        voicesLoadedRef.current = true
        console.log(`TTS: ${voices.length} voices loaded. Spanish:`,
          voices.filter(v => v.lang.startsWith('es')).map(v => `${v.name} (${v.lang})`))
      }
    }

    checkVoices()
    window.speechSynthesis.onvoiceschanged = checkVoices
    const timer1 = setTimeout(checkVoices, 100)
    const timer2 = setTimeout(checkVoices, 500)
    const timer3 = setTimeout(checkVoices, 2000)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
    }
  }, [speechSupported])

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

  // Speak a single sentence
  const speakSentence = useCallback((sentenceIdx: number) => {
    const sentences = sentencesRef.current

    if (!speechSupported) {
      setIsPlaying(false)
      isPlayingRef.current = false
      return
    }

    if (sentenceIdx >= sentences.length) {
      window.speechSynthesis.cancel()
      setIsPlaying(false)
      isPlayingRef.current = false
      setTtsStatus('idle')
      setTtsError(null)
      return
    }

    const sentence = sentences[sentenceIdx]
    currentSentenceIndexRef.current = sentenceIdx
    setCurrentCharIndex(sentence.start)

    const utterance = new SpeechSynthesisUtterance(sentence.text)
    utterance.rate = playbackSpeedRef.current

    // Try to find the best voice
    const voices = window.speechSynthesis.getVoices()
    let selectedVoice: SpeechSynthesisVoice | null = null

    if (voices.length > 0) {
      selectedVoice = voices.find(v => v.lang.startsWith('es') && v.localService) || null
      if (!selectedVoice) {
        selectedVoice = voices.find(v => v.lang.startsWith('es')) || null
      }
      if (!selectedVoice) {
        selectedVoice = voices.find(v => v.localService) || null
      }
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice
      utterance.lang = selectedVoice.lang
    } else {
      utterance.lang = 'es-ES'
    }

    console.log(`TTS: Speaking sentence ${sentenceIdx + 1}/${sentences.length}`,
      selectedVoice ? `(voice: ${selectedVoice.name})` : '(default voice)')

    utterance.onstart = () => {
      consecutiveErrorCountRef.current = 0
      setTtsStatus('playing')
      setTtsError(null)
    }

    utterance.onend = () => {
      if (isPlayingRef.current && !isPausedRef.current) {
        speakSentenceRef.current(sentenceIdx + 1)
      }
    }

    utterance.onerror = (event) => {
      if (event.error === 'interrupted' || event.error === 'canceled') {
        return
      }

      consecutiveErrorCountRef.current += 1
      console.error(`TTS error: ${event.error} (consecutive: ${consecutiveErrorCountRef.current})`)

      if (consecutiveErrorCountRef.current >= MAX_CONSECUTIVE_ERRORS) {
        const errorMsg = event.error === 'synthesis-failed'
          ? 'No se pudo reproducir audio. Intenta recargar la página.'
          : `Error de voz: ${event.error}`

        window.speechSynthesis.cancel()
        setIsPlaying(false)
        isPlayingRef.current = false
        isPausedRef.current = false
        setTtsStatus('error')
        setTtsError(errorMsg)
        return
      }

      if (isPlayingRef.current && !isPausedRef.current) {
        setTimeout(() => speakSentenceRef.current(sentenceIdx + 1), 200)
      }
    }

    window.speechSynthesis.cancel()

    const speakDelay = voicesLoadedRef.current ? 10 : 100
    setTimeout(() => {
      if (isPlayingRef.current || isPausedRef.current) {
        try {
          window.speechSynthesis.speak(utterance)
        } catch (err) {
          console.error('TTS speak() threw:', err)
          setTtsStatus('error')
          setTtsError('Error al iniciar la lectura. Intenta de nuevo.')
          setIsPlaying(false)
          isPlayingRef.current = false
        }
      }
    }, speakDelay)
  }, [speechSupported, setCurrentCharIndex, setIsPlaying])

  // Keep the ref updated
  useEffect(() => {
    speakSentenceRef.current = speakSentence
  }, [speakSentence])

  // Start playing from current position
  const play = useCallback(() => {
    if (!speechSupported) {
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
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume()
        isPausedRef.current = false
        setIsPlaying(true)
        isPlayingRef.current = true
        setTtsStatus('playing')
        return
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
    if (!speechSupported) return

    isPausedRef.current = true
    isPlayingRef.current = false
    setIsPlaying(false)
    setTtsStatus('paused')

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause()
      setTimeout(() => {
        if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
          window.speechSynthesis.cancel()
        }
      }, 300)
    }
  }, [speechSupported, setIsPlaying])

  // Stop playback completely
  const stop = useCallback(() => {
    if (!speechSupported) return
    isPausedRef.current = false
    isPlayingRef.current = false
    setIsPlaying(false)
    setTtsStatus('idle')
    setTtsError(null)
    window.speechSynthesis.cancel()
  }, [speechSupported, setIsPlaying])

  // Skip forward by ~10 sentences
  const skipForward = useCallback(() => {
    if (!speechSupported) return

    const wasPlaying = isPlayingRef.current
    window.speechSynthesis.cancel()

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
  }, [speechSupported, setCurrentCharIndex])

  // Skip backward by ~10 sentences
  const skipBack = useCallback(() => {
    if (!speechSupported) return

    const wasPlaying = isPlayingRef.current
    window.speechSynthesis.cancel()

    const prevIdx = Math.max(currentSentenceIndexRef.current - 10, 0)
    currentSentenceIndexRef.current = prevIdx
    setCurrentCharIndex(sentencesRef.current[prevIdx]?.start ?? 0)

    if (wasPlaying) {
      isPausedRef.current = false
      setTimeout(() => speakSentenceRef.current(prevIdx), 150)
    }
  }, [speechSupported, setCurrentCharIndex])

  // Jump to a specific character position
  const seekTo = useCallback((charIdx: number) => {
    if (!speechSupported) return

    const wasPlaying = isPlayingRef.current
    window.speechSynthesis.cancel()

    const sentenceIdx = findSentenceIndex(charIdx)
    currentSentenceIndexRef.current = sentenceIdx
    setCurrentCharIndex(charIdx)

    if (wasPlaying) {
      isPausedRef.current = false
      setTimeout(() => speakSentenceRef.current(sentenceIdx), 150)
    }
  }, [speechSupported, findSentenceIndex, setCurrentCharIndex])

  // Handle speed changes while playing
  useEffect(() => {
    if (isPlayingRef.current && speechSupported) {
      const currentIdx = currentSentenceIndexRef.current
      window.speechSynthesis.cancel()
      isPausedRef.current = false
      setTimeout(() => speakSentenceRef.current(currentIdx), 150)
    }
  }, [playbackSpeed, speechSupported])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  // Stop playing when book text changes (direct cancel, no setState in effect)
  useEffect(() => {
    if (bookText && speechSupported) {
      window.speechSynthesis.cancel()
      isPlayingRef.current = false
      isPausedRef.current = false
      currentSentenceIndexRef.current = 0
      // Use setIsPlaying directly - it's a zustand setter, not React setState
      setIsPlaying(false)
    }
  }, [bookText, speechSupported, setIsPlaying])

  return {
    play,
    pause,
    stop,
    skipForward,
    skipBack,
    seekTo,
    ttsStatus,
    ttsError,
  }
}
