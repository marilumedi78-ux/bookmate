'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useBookMateStore } from './store'

// Split text into sentences for TTS playback
function splitIntoSentences(text: string): { text: string; start: number; end: number }[] {
  if (!text) return []

  const sentences: { text: string; start: number; end: number }[] = []
  // Match sentences ending with .!? followed by space or end of string
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

  // Catch any remaining text that doesn't end with punctuation
  const lastEnd = sentences.length > 0 ? sentences[sentences.length - 1].end : 0
  const remaining = text.slice(lastEnd).trim()
  if (remaining) {
    sentences.push({
      text: remaining,
      start: lastEnd,
      end: text.length,
    })
  }

  // If no sentences were found (text without punctuation), split by chunks of ~200 chars
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
  const MAX_CONSECUTIVE_ERRORS = 3

  // Use a ref for the speakSentence function to avoid circular dependency
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
    // Re-compute sentences when text changes
    sentencesRef.current = splitIntoSentences(bookText)
    currentSentenceIndexRef.current = 0
  }, [bookText])

  // Find the sentence index for a given character position
  const findSentenceIndex = useCallback((charIdx: number): number => {
    const sentences = sentencesRef.current
    if (sentences.length === 0) return 0

    for (let i = 0; i < sentences.length; i++) {
      if (charIdx >= sentences[i].start && charIdx < sentences[i].end) {
        return i
      }
    }

    // If past the end, return last sentence
    if (charIdx >= sentences[sentences.length - 1].end) {
      return sentences.length - 1
    }

    return 0
  }, [])

  // Speak a single sentence - assigned to ref to avoid circular dependency
  const speakSentence = useCallback((sentenceIdx: number) => {
    const sentences = sentencesRef.current
    if (!window.speechSynthesis) return
    if (sentenceIdx >= sentences.length) {
      // Finished reading
      window.speechSynthesis.cancel()
      setIsPlaying(false)
      isPlayingRef.current = false
      return
    }

    const sentence = sentences[sentenceIdx]
    currentSentenceIndexRef.current = sentenceIdx

    // Update char index to current sentence position
    setCurrentCharIndex(sentence.start)

    const utterance = new SpeechSynthesisUtterance(sentence.text)

    // Set rate from playback speed
    utterance.rate = playbackSpeedRef.current

    // Reset consecutive error count on successful speak call
    consecutiveErrorCountRef.current = 0

    // Try to use a Spanish voice if available
    const voices = window.speechSynthesis.getVoices()
    const spanishVoice = voices.find(
      (v) => v.lang.startsWith('es') && v.localService
    ) || voices.find(
      (v) => v.lang.startsWith('es')
    )
    if (spanishVoice) {
      utterance.voice = spanishVoice
    }
    utterance.lang = 'es-ES'

    utterance.onend = () => {
      // Move to next sentence if still playing
      if (isPlayingRef.current && !isPausedRef.current) {
        speakSentenceRef.current(sentenceIdx + 1)
      }
    }

    utterance.onerror = (event) => {
      // "interrupted" or "canceled" are expected when we stop/skip
      if (event.error !== 'interrupted' && event.error !== 'canceled') {
        consecutiveErrorCountRef.current += 1
        console.error(`TTS error: ${event.error} (consecutive: ${consecutiveErrorCountRef.current})`)

        // Stop trying after too many consecutive errors (e.g., no voices available)
        if (consecutiveErrorCountRef.current >= MAX_CONSECUTIVE_ERRORS) {
          console.warn(`TTS: Stopping after ${MAX_CONSECUTIVE_ERRORS} consecutive errors. Speech synthesis may not be available.`)
          window.speechSynthesis.cancel()
          setIsPlaying(false)
          isPlayingRef.current = false
          isPausedRef.current = false
          return
        }

        // Try next sentence on error
        if (isPlayingRef.current && !isPausedRef.current) {
          setTimeout(() => speakSentenceRef.current(sentenceIdx + 1), 100)
        }
      }
    }

    // Mobile fix: Cancel any existing speech before starting new one
    window.speechSynthesis.cancel()

    // Small delay after cancel for mobile browsers
    setTimeout(() => {
      if (isPlayingRef.current || isPausedRef.current) {
        window.speechSynthesis.speak(utterance)
      }
    }, 50)
  }, [setCurrentCharIndex, setIsPlaying])

  // Keep the ref updated
  useEffect(() => {
    speakSentenceRef.current = speakSentence
  }, [speakSentence])

  // Start playing from current position
  const play = useCallback(() => {
    if (!window.speechSynthesis) {
      console.warn('Speech synthesis not supported')
      return
    }

    if (!bookTextRef.current) return

    // If paused, resume
    if (isPausedRef.current && window.speechSynthesis.paused) {
      window.speechSynthesis.resume()
      isPausedRef.current = false
      setIsPlaying(true)
      isPlayingRef.current = true
      return
    }

    // Find which sentence to start from based on currentCharIndex
    const sentenceIdx = findSentenceIndex(currentCharIndexRef.current)
    isPausedRef.current = false
    consecutiveErrorCountRef.current = 0
    setIsPlaying(true)
    isPlayingRef.current = true
    speakSentence(sentenceIdx)
  }, [findSentenceIndex, speakSentence, setIsPlaying])

  // Pause playback
  const pause = useCallback(() => {
    if (!window.speechSynthesis) return

    isPausedRef.current = true
    isPlayingRef.current = false
    setIsPlaying(false)

    // On some mobile browsers, pause() doesn't work well
    // We cancel and will re-start from the current position
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause()
      // Fallback: if pause doesn't work after a short time, cancel
      setTimeout(() => {
        if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
          window.speechSynthesis.cancel()
        }
      }, 200)
    }
  }, [setIsPlaying])

  // Stop playback completely
  const stop = useCallback(() => {
    if (!window.speechSynthesis) return
    isPausedRef.current = false
    isPlayingRef.current = false
    setIsPlaying(false)
    window.speechSynthesis.cancel()
  }, [setIsPlaying])

  // Skip forward by ~10 sentences
  const skipForward = useCallback(() => {
    if (!window.speechSynthesis) return

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
      setTimeout(() => speakSentenceRef.current(nextIdx), 100)
    }
  }, [setCurrentCharIndex])

  // Skip backward by ~10 sentences
  const skipBack = useCallback(() => {
    if (!window.speechSynthesis) return

    const wasPlaying = isPlayingRef.current
    window.speechSynthesis.cancel()

    const prevIdx = Math.max(currentSentenceIndexRef.current - 10, 0)
    currentSentenceIndexRef.current = prevIdx
    setCurrentCharIndex(sentencesRef.current[prevIdx]?.start ?? 0)

    if (wasPlaying) {
      isPausedRef.current = false
      setTimeout(() => speakSentenceRef.current(prevIdx), 100)
    }
  }, [setCurrentCharIndex])

  // Jump to a specific character position
  const seekTo = useCallback((charIdx: number) => {
    if (!window.speechSynthesis) return

    const wasPlaying = isPlayingRef.current
    window.speechSynthesis.cancel()

    const sentenceIdx = findSentenceIndex(charIdx)
    currentSentenceIndexRef.current = sentenceIdx
    setCurrentCharIndex(charIdx)

    if (wasPlaying) {
      isPausedRef.current = false
      setTimeout(() => speakSentenceRef.current(sentenceIdx), 100)
    }
  }, [findSentenceIndex, setCurrentCharIndex])

  // Handle speed changes while playing
  useEffect(() => {
    if (isPlayingRef.current) {
      // Need to restart with new speed
      const currentIdx = currentSentenceIndexRef.current
      window.speechSynthesis.cancel()
      isPausedRef.current = false
      setTimeout(() => speakSentenceRef.current(currentIdx), 100)
    }
  }, [playbackSpeed])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  // iOS workaround: Load voices (they load asynchronously on iOS)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const loadVoices = () => {
        window.speechSynthesis.getVoices()
      }
      loadVoices()
      window.speechSynthesis.onvoiceschanged = loadVoices
    }
  }, [])

  // Stop playing when book changes or text changes
  useEffect(() => {
    stop()
    currentSentenceIndexRef.current = 0
  }, [bookText, stop])

  return {
    play,
    pause,
    stop,
    skipForward,
    skipBack,
    seekTo,
  }
}
