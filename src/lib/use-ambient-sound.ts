'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useBookMateStore } from './store'
import { AmbientEngine, type AmbientSoundType } from './ambient-engine'

// Valid ambient sound types (procedurally synthesized — no MP3 files needed)
const VALID_SOUNDS: AmbientSoundType[] = ['rain', 'cafe', 'fire', 'waves', 'forest']

function isAmbientSound(v: string | null): v is AmbientSoundType {
  return !!v && (VALID_SOUNDS as string[]).includes(v)
}

export function useAmbientSound() {
  const { ambientSound, setAmbientSound, ambientVolume } = useBookMateStore()
  const engineRef = useRef<AmbientEngine | null>(null)

  // Lazily create the engine (must be done on the client)
  const getEngine = useCallback((): AmbientEngine => {
    if (!engineRef.current) {
      engineRef.current = new AmbientEngine()
    }
    return engineRef.current
  }, [])

  // Update volume when ambientVolume changes
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setVolume(ambientVolume)
    }
  }, [ambientVolume])

  // Play/stop when ambientSound changes
  useEffect(() => {
    if (isAmbientSound(ambientSound)) {
      const engine = getEngine()
      engine.play(ambientSound).catch((err) => {
        console.warn('Ambient sound play failed:', err)
      })
    } else {
      if (engineRef.current) {
        engineRef.current.stop()
      }
    }
  }, [ambientSound, getEngine])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (engineRef.current) {
        engineRef.current.dispose()
        engineRef.current = null
      }
    }
  }, [])

  return {
    playAmbient: (type: AmbientSoundType) => setAmbientSound(type),
    stopAmbient: () => setAmbientSound(null),
    isAmbientPlaying: ambientSound !== null,
    currentSound: ambientSound,
  }
}
