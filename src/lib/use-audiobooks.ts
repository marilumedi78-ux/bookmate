'use client'

import { useState, useCallback, useEffect, useRef } from 'react'

// ─── Types ───
export interface Audiobook {
  id: string
  userId: string
  bookId: string
  voiceId: string
  status: 'pending' | 'ready' | 'failed'
  durationSec: number
  sizeBytes: number
  errorMessage: string | null
  createdAt: string
  updatedAt: string
  book?: {
    id: string
    title: string
    author: string
    coverColor: string
  }
}

export interface GenerateOptions {
  bookId: string
  voiceId: string
}

// ─── Hook ───
export function useAudiobooks() {
  const [audiobooks, setAudiobooks] = useState<Audiobook[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateProgress, setGenerateProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // ─── Fetch list of user's audiobooks ───
  const fetchAudiobooks = useCallback(async () => {
    try {
      const res = await fetch('/api/audiobooks/list')
      if (res.ok) {
        const data = await res.json()
        setAudiobooks(data.audiobooks || [])
      }
    } catch {
      // Silently fail — list is informational
    }
  }, [])

  // Load on mount
  useEffect(() => {
    fetchAudiobooks()
  }, [fetchAudiobooks])

  // ─── Generate a new audiobook ───
  const generateAudiobook = useCallback(async (opts: GenerateOptions): Promise<{ success: boolean; audiobook?: Audiobook; error?: string }> => {
    setIsGenerating(true)
    setGenerateProgress('Iniciando...')
    setError(null)

    try {
      setGenerateProgress('Generando audio... esto puede tardar varios minutos para un libro largo.')
      const res = await fetch('/api/audiobooks/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opts),
      })

      const data = await res.json()

      if (!res.ok) {
        const msg = data.error || `Error del servidor (${res.status})`
        setError(msg)
        return { success: false, error: msg }
      }

      // Refresh list
      await fetchAudiobooks()
      setGenerateProgress(null)
      return { success: true, audiobook: data.audiobook }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error de conexión'
      setError(msg)
      return { success: false, error: msg }
    } finally {
      setIsGenerating(false)
      setGenerateProgress(null)
    }
  }, [fetchAudiobooks])

  // ─── Delete an audiobook ───
  const deleteAudiobook = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/audiobooks/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setAudiobooks(prev => prev.filter(a => a.id !== id))
        return true
      }
      return false
    } catch {
      return false
    }
  }, [])

  // ─── Get audiobook for a specific book+voice (if exists) ───
  const getForBookAndVoice = useCallback((bookId: string, voiceId?: string): Audiobook | undefined => {
    if (voiceId) {
      return audiobooks.find(a => a.bookId === bookId && a.voiceId === voiceId && a.status === 'ready')
    }
    return audiobooks.find(a => a.bookId === bookId && a.status === 'ready')
  }, [audiobooks])

  return {
    audiobooks,
    isGenerating,
    generateProgress,
    error,
    generateAudiobook,
    deleteAudiobook,
    fetchAudiobooks,
    getForBookAndVoice,
  }
}

// ─── Audio player hook with Media Session API integration ───
// This is what makes the audio keep playing when the screen is off.
// Media Session API tells the OS "this app is playing audio" → the OS
// keeps the audio playing even when the screen turns off (just like Spotify).
export function useAudiobookPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  // ─── Initialize audio element + Media Session ───
  useEffect(() => {
    if (typeof window === 'undefined') return

    const audio = new Audio()
    audio.preload = 'metadata'
    audioRef.current = audio

    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onDurationChange = () => setDuration(audio.duration || 0)
    const onPlay = () => {
      setIsPlaying(true)
      updateMediaSessionPlaybackState('playing')
    }
    const onPause = () => {
      setIsPlaying(false)
      updateMediaSessionPlaybackState('paused')
    }
    const onWaiting = () => setIsLoading(true)
    const onPlaying = () => setIsLoading(false)
    const onEnded = () => {
      setIsPlaying(false)
      updateMediaSessionPlaybackState('none')
    }

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('durationchange', onDurationChange)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('waiting', onWaiting)
    audio.addEventListener('playing', onPlaying)
    audio.addEventListener('ended', onEnded)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('durationchange', onDurationChange)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('waiting', onWaiting)
      audio.removeEventListener('playing', onPlaying)
      audio.removeEventListener('ended', onEnded)
      audio.pause()
      audio.src = ''
    }
  }, [])

  const updateMediaSessionPlaybackState = (state: 'playing' | 'paused' | 'none') => {
    if (typeof navigator === 'undefined') return
    if (!('mediaSession' in navigator)) return
    try {
      navigator.mediaSession.playbackState = state
    } catch {}
  }

  // ─── Load + play an audiobook ───
  const playAudiobook = useCallback(async (audiobook: Audiobook, bookTitle?: string, voiceName?: string) => {
    if (!audioRef.current) return

    audioRef.current.src = `/api/audiobooks/${audiobook.id}/stream`
    audioRef.current.load()

    // ─── Set up Media Session metadata (lock screen controls) ───
    // This is the magic that makes audio keep playing with the screen off.
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: bookTitle || 'Audiolibro',
          artist: voiceName ? `Voz: ${voiceName}` : 'Escucha Libros',
          album: 'Escucha Libros',
        })

        // Set up action handlers so the lock-screen play/pause buttons work
        navigator.mediaSession.setActionHandler('play', () => {
          audioRef.current?.play()
        })
        navigator.mediaSession.setActionHandler('pause', () => {
          audioRef.current?.pause()
        })
        navigator.mediaSession.setActionHandler('seekbackward', () => {
          if (audioRef.current) {
            audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 15)
          }
        })
        navigator.mediaSession.setActionHandler('seekforward', () => {
          if (audioRef.current) {
            audioRef.current.currentTime = Math.min(
              audioRef.current.duration || 0,
              audioRef.current.currentTime + 30
            )
          }
        })
        navigator.mediaSession.setActionHandler('seekto', (details: any) => {
          if (audioRef.current && details.seekTime != null) {
            audioRef.current.currentTime = details.seekTime
          }
        })
      } catch {}
    }

    try {
      await audioRef.current.play()
    } catch (err) {
      // Autoplay may be blocked until user interacts with the page
      console.warn('Audiobook play blocked:', err)
    }
  }, [])

  const play = useCallback(() => {
    audioRef.current?.play()
  }, [])

  const pause = useCallback(() => {
    audioRef.current?.pause()
  }, [])

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time
    }
  }, [])

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current.src = ''
    }
    setIsPlaying(false)
    setCurrentTime(0)
  }, [])

  // ─── Set playback position (for resuming) ───
  const setPosition = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time
    }
  }, [])

  return {
    isPlaying,
    currentTime,
    duration,
    isLoading,
    playAudiobook,
    play,
    pause,
    seek,
    stop,
    setPosition,
  }
}
