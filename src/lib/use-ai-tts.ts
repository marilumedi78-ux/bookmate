'use client'

import { useEffect, useRef, useCallback, useState, useMemo } from 'react'
import { useBookMateStore } from './store'

// Split text into sentences for AI TTS playback
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
    const chunkSize = 300
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

export type AI_TTS_Status = 'idle' | 'loading' | 'playing' | 'paused' | 'error' | 'not-supported'

// Audio cache for preloaded sentences
interface CachedAudio {
  audio: HTMLAudioElement
  blob: Blob
}

export function useAITTS() {
  const {
    bookText,
    isPlaying,
    setIsPlaying,
    playbackSpeed,
    currentCharIndex,
    setCurrentCharIndex,
    selectedAIVoice,
  } = useBookMateStore()

  const sentencesRef = useRef<{ text: string; start: number; end: number }[]>([])
  const currentSentenceIndexRef = useRef(0)
  const isPlayingRef = useRef(false)
  const playbackSpeedRef = useRef(1)
  const currentCharIndexRef = useRef(0)
  const isPausedRef = useRef(false)
  const bookTextRef = useRef('')
  const audioCacheRef = useRef<Map<number, CachedAudio>>(new Map())
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)
  const preloadQueueRef = useRef<Set<number>>(new Set())
  const selectedAIVoiceRef = useRef<string>('tongtong')

  const [ttsStatus, setTtsStatus] = useState<AI_TTS_Status>('idle')
  const [ttsError, setTtsError] = useState<string | null>(null)
  const [iaHoursUsed, setIaHoursUsed] = useState(0)

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
    // Clear audio cache when text changes
    audioCacheRef.current.forEach((cached) => {
      try { URL.revokeObjectURL(cached.audio.src) } catch {}
    })
    audioCacheRef.current.clear()
  }, [bookText])

  // Stop all audio — defined BEFORE any effect/hook that uses it
  const stopAll = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current.currentTime = 0
      currentAudioRef.current = null
    }
  }, [])

  // Keep selected AI voice ref in sync, and clear cache + restart playback when voice changes
  useEffect(() => {
    if (selectedAIVoiceRef.current !== selectedAIVoice) {
      const wasPlaying = isPlayingRef.current
      const currentIdx = currentSentenceIndexRef.current

      selectedAIVoiceRef.current = selectedAIVoice

      // Stop current audio
      stopAll()

      // Clear cached audio since the voice changed
      audioCacheRef.current.forEach((cached) => {
        try { URL.revokeObjectURL(cached.audio.src) } catch {}
      })
      audioCacheRef.current.clear()

      // If was playing, restart from current sentence with new voice
      if (wasPlaying) {
        isPausedRef.current = false
        setTimeout(() => playSentenceRef.current(currentIdx), 200)
      }
    }
  }, [selectedAIVoice, stopAll])

  // Preload a sentence's audio from the server
  const preloadSentence = useCallback(async (idx: number) => {
    const sentences = sentencesRef.current
    if (idx >= sentences.length || idx < 0) return
    if (audioCacheRef.current.has(idx) || preloadQueueRef.current.has(idx)) return

    preloadQueueRef.current.add(idx)
    const sentence = sentences[idx]

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: sentence.text, voice: selectedAIVoiceRef.current }),
      })

      if (!res.ok) {
        // If we get a 403 (plan limit), we need to notify the user
        if (res.status === 403) {
          const data = await res.json()
          throw new Error(data.error || 'Límite de uso alcanzado')
        }
        throw new Error('Error del servidor')
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.playbackRate = playbackSpeedRef.current

      audioCacheRef.current.set(idx, { audio, blob })

      // Track usage from response headers
      const usedHours = res.headers.get('X-Ia-Hours-Used')
      if (usedHours) {
        setIaHoursUsed(parseFloat(usedHours))
      }
    } catch (err) {
      console.error(`AI TTS preload error for sentence ${idx}:`, err)
      // Remove from cache if it failed
      audioCacheRef.current.delete(idx)
    } finally {
      preloadQueueRef.current.delete(idx)
    }
  }, [])

  // Play a sentence by index
  const playSentenceRef = useRef<(idx: number) => void>(() => {})

  const playSentence = useCallback((sentenceIdx: number) => {
    const sentences = sentencesRef.current

    if (sentenceIdx >= sentences.length) {
      // End of book
      stopAll()
      setIsPlaying(false)
      isPlayingRef.current = false
      setTtsStatus('idle')
      return
    }

    currentSentenceIndexRef.current = sentenceIdx
    setCurrentCharIndex(sentences[sentenceIdx]?.start ?? 0)

    // Check if audio is cached
    const cached = audioCacheRef.current.get(sentenceIdx)

    if (cached) {
      // Play cached audio
      if (currentAudioRef.current && currentAudioRef.current !== cached.audio) {
        currentAudioRef.current.pause()
        currentAudioRef.current.currentTime = 0
      }

      currentAudioRef.current = cached.audio
      cached.audio.playbackRate = playbackSpeedRef.current
      cached.audio.currentTime = 0

      setTtsStatus('playing')
      setTtsError(null)

      cached.audio.onended = () => {
        if (isPlayingRef.current && !isPausedRef.current) {
          playSentenceRef.current(sentenceIdx + 1)
        }
      }

      cached.audio.onerror = () => {
        console.error('AI TTS playback error, falling back to next sentence')
        if (isPlayingRef.current && !isPausedRef.current) {
          setTimeout(() => playSentenceRef.current(sentenceIdx + 1), 300)
        }
      }

      cached.audio.play().catch((err) => {
        console.error('AI TTS play() error:', err)
        setTtsStatus('error')
        setTtsError('Error al reproducir audio IA')
        setIsPlaying(false)
        isPlayingRef.current = false
      })

      // Preload next 2 sentences
      for (let i = 1; i <= 2; i++) {
        preloadSentence(sentenceIdx + i)
      }
    } else {
      // Audio not cached yet — load it first, then play
      setTtsStatus('loading')

      const loadAndPlay = async () => {
        try {
          await preloadSentence(sentenceIdx)
          const nowCached = audioCacheRef.current.get(sentenceIdx)
          if (nowCached && isPlayingRef.current) {
            currentAudioRef.current = nowCached.audio
            nowCached.audio.playbackRate = playbackSpeedRef.current
            nowCached.audio.currentTime = 0

            setTtsStatus('playing')
            setTtsError(null)

            nowCached.audio.onended = () => {
              if (isPlayingRef.current && !isPausedRef.current) {
                playSentenceRef.current(sentenceIdx + 1)
              }
            }

            nowCached.audio.onerror = () => {
              if (isPlayingRef.current && !isPausedRef.current) {
                setTimeout(() => playSentenceRef.current(sentenceIdx + 1), 300)
              }
            }

            nowCached.audio.play().catch(() => {
              setTtsStatus('error')
              setTtsError('Error al reproducir')
              setIsPlaying(false)
              isPlayingRef.current = false
            })

            // Preload next sentences
            for (let i = 1; i <= 2; i++) {
              preloadSentence(sentenceIdx + i)
            }
          } else if (isPlayingRef.current) {
            // Preload failed but we're still playing — skip to next
            playSentenceRef.current(sentenceIdx + 1)
          }
        } catch (err: any) {
          // Check if it's a plan limit error
          if (err?.message?.includes('límite') || err?.message?.includes('Limit')) {
            setTtsStatus('error')
            setTtsError(err.message)
            setIsPlaying(false)
            isPlayingRef.current = false
          } else if (isPlayingRef.current) {
            // Skip to next sentence on error
            setTimeout(() => playSentenceRef.current(sentenceIdx + 1), 300)
          }
        }
      }

      loadAndPlay()
    }
  }, [stopAll, preloadSentence, setCurrentCharIndex, setIsPlaying])

  // Keep the ref updated
  useEffect(() => {
    playSentenceRef.current = playSentence
  }, [playSentence])

  // Find sentence index for a character position
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

  // Start playing from current position
  const play = useCallback(() => {
    if (!bookTextRef.current) {
      setTtsStatus('error')
      setTtsError('No hay texto para leer')
      return
    }

    setTtsStatus('loading')
    setTtsError(null)

    const sentenceIdx = findSentenceIndex(currentCharIndexRef.current)
    isPausedRef.current = false
    setIsPlaying(true)
    isPlayingRef.current = true
    playSentence(sentenceIdx)
  }, [findSentenceIndex, playSentence, setIsPlaying])

  // Pause playback
  const pause = useCallback(() => {
    isPausedRef.current = true
    isPlayingRef.current = false
    setIsPlaying(false)
    setTtsStatus('paused')

    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
    }
  }, [setIsPlaying])

  // Stop playback completely
  const stop = useCallback(() => {
    isPausedRef.current = false
    isPlayingRef.current = false
    setIsPlaying(false)
    setTtsStatus('idle')
    setTtsError(null)
    stopAll()
  }, [setIsPlaying, stopAll])

  // Skip forward by ~10 sentences
  const skipForward = useCallback(() => {
    const wasPlaying = isPlayingRef.current
    stopAll()

    const nextIdx = Math.min(
      currentSentenceIndexRef.current + 10,
      sentencesRef.current.length - 1
    )
    currentSentenceIndexRef.current = nextIdx
    setCurrentCharIndex(sentencesRef.current[nextIdx]?.start ?? currentCharIndexRef.current)

    if (wasPlaying) {
      isPausedRef.current = false
      setTimeout(() => playSentenceRef.current(nextIdx), 150)
    }
  }, [stopAll, setCurrentCharIndex])

  // Skip backward by ~10 sentences
  const skipBack = useCallback(() => {
    const wasPlaying = isPlayingRef.current
    stopAll()

    const prevIdx = Math.max(currentSentenceIndexRef.current - 10, 0)
    currentSentenceIndexRef.current = prevIdx
    setCurrentCharIndex(sentencesRef.current[prevIdx]?.start ?? 0)

    if (wasPlaying) {
      isPausedRef.current = false
      setTimeout(() => playSentenceRef.current(prevIdx), 150)
    }
  }, [stopAll, setCurrentCharIndex])

  // Jump to a specific character position
  const seekTo = useCallback((charIdx: number) => {
    const wasPlaying = isPlayingRef.current
    stopAll()

    const sentenceIdx = findSentenceIndex(charIdx)
    currentSentenceIndexRef.current = sentenceIdx
    setCurrentCharIndex(charIdx)

    if (wasPlaying) {
      isPausedRef.current = false
      setTimeout(() => playSentenceRef.current(sentenceIdx), 150)
    }
  }, [stopAll, findSentenceIndex, setCurrentCharIndex])

  // Handle speed changes while playing
  useEffect(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.playbackRate = playbackSpeed
    }
  }, [playbackSpeed])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAll()
      // Revoke all blob URLs
      audioCacheRef.current.forEach((cached) => {
        try { URL.revokeObjectURL(cached.audio.src) } catch {}
      })
      audioCacheRef.current.clear()
    }
  }, [stopAll])

  // Stop playing when book text changes
  useEffect(() => {
    if (bookText) {
      stopAll()
      isPlayingRef.current = false
      isPausedRef.current = false
      currentSentenceIndexRef.current = 0
      setIsPlaying(false)
      audioCacheRef.current.forEach((cached) => {
        try { URL.revokeObjectURL(cached.audio.src) } catch {}
      })
      audioCacheRef.current.clear()
    }
  }, [bookText, stopAll, setIsPlaying])

  // Memoize return object to prevent unnecessary re-renders
  return useMemo(() => ({
    play,
    pause,
    stop,
    skipForward,
    skipBack,
    seekTo,
    ttsStatus,
    ttsError,
    iaHoursUsed,
  }), [play, pause, stop, skipForward, skipBack, seekTo, ttsStatus, ttsError, iaHoursUsed])
}
