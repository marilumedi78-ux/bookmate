'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useBookMateStore } from './store'

type SoundType = 'rain' | 'cafe' | 'fire' | 'waves' | 'forest'

// Map sound IDs to their MP3 file paths
const SOUND_FILES: Record<SoundType, string> = {
  rain: '/sounds/rain.mp3',
  cafe: '/sounds/cafe.mp3',
  fire: '/sounds/fire.mp3',
  waves: '/sounds/waves.mp3',
  forest: '/sounds/forest.mp3',
}

export function useAmbientSound() {
  const { ambientSound, setAmbientSound, ambientVolume } = useBookMateStore()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const currentSoundRef = useRef<SoundType | null>(null)

  // Stop the current ambient sound
  const stopAmbient = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }
    currentSoundRef.current = null
  }, [])

  // Play a specific ambient sound
  const playAmbient = useCallback((type: SoundType) => {
    // If same sound is already playing, do nothing
    if (currentSoundRef.current === type && audioRef.current) {
      return
    }

    // Stop any existing sound
    stopAmbient()

    // Create new Audio element
    const audio = new Audio(SOUND_FILES[type])
    audio.loop = true
    audio.volume = 0.5 // Will be adjusted by volume control
    audio.preload = 'auto'

    audioRef.current = audio
    currentSoundRef.current = type

    // Play with error handling
    audio.play().catch((err) => {
      console.warn('Ambient sound play failed:', err)
      // Browser might block autoplay - user needs to interact first
    })
  }, [stopAmbient])

  // Update volume when ambientVolume changes
  useEffect(() => {
    if (audioRef.current) {
      // Scale volume: store value 0-1, audio expects 0-1
      // But we want 50% store volume to be a comfortable listening level
      audioRef.current.volume = Math.min(1, ambientVolume * 0.8)
    }
  }, [ambientVolume])

  // Play/stop when ambientSound changes
  useEffect(() => {
    if (ambientSound && ambientSound in SOUND_FILES) {
      playAmbient(ambientSound as SoundType)
    } else {
      stopAmbient()
    }

    return () => {
      stopAmbient()
    }
  }, [ambientSound, playAmbient, stopAmbient])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  return {
    playAmbient: (type: SoundType) => setAmbientSound(type),
    stopAmbient: () => setAmbientSound(null),
    isAmbientPlaying: ambientSound !== null,
  }
}
