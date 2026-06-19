'use client'

import { useEffect, useRef, useCallback } from 'react'

// Wake Lock API — keeps the screen on while TTS is playing.
// This is CRITICAL for an audiobook app: without it, mobile browsers
// (Chrome/Safari on Android/iOS) pause the Web Speech API when the screen
// turns off, so the user has to keep tapping the screen to continue listening.
//
// The Wake Lock API requests the OS to keep the display active. It's released
// automatically when:
//   - The tab becomes invisible (user switches apps)
//   - We explicitly call release()
//   - The page is unloaded
//
// We re-acquire it on visibilitychange when the tab becomes visible again
// AND TTS is still supposed to be playing.

interface WakeLockSentinel {
  released: boolean
  release: () => Promise<void>
  addEventListener: (type: 'release', listener: () => void) => void
}

interface NavigatorWithWakeLock extends Navigator {
  wakeLock?: {
    request: (type: 'screen') => Promise<WakeLockSentinel>
  }
}

export function useWakeLock(isPlaying: boolean, isPaused: boolean) {
  const sentinelRef = useRef<WakeLockSentinel | null>(null)
  // Use a ref to track "should be active" so the visibilitychange handler
  // always sees the latest value without re-subscribing.
  const shouldHoldRef = useRef(false)

  useEffect(() => {
    shouldHoldRef.current = isPlaying && !isPaused
  }, [isPlaying, isPaused])

  const acquire = useCallback(async () => {
    if (typeof navigator === 'undefined') return
    const nav = navigator as NavigatorWithWakeLock
    if (!nav.wakeLock?.request) return // Wake Lock API not supported (e.g. desktop Firefox)

    // Don't acquire if we already have an active sentinel
    if (sentinelRef.current && !sentinelRef.current.released) return

    // Wake Lock can only be acquired when the page is visible
    if (document.hidden) return

    try {
      const sentinel = await nav.wakeLock.request('screen')
      sentinelRef.current = sentinel
      sentinel.addEventListener('release', () => {
        sentinelRef.current = null
      })
    } catch {
      // User denied, or browser blocked it (e.g. low battery mode on some devices)
      // Non-fatal: audio will still play, but screen may turn off.
    }
  }, [])

  const release = useCallback(async () => {
    if (sentinelRef.current && !sentinelRef.current.released) {
      try {
        await sentinelRef.current.release()
      } catch {}
    }
    sentinelRef.current = null
  }, [])

  // Acquire/release based on playback state
  useEffect(() => {
    if (isPlaying && !isPaused) {
      acquire()
    } else {
      release()
    }
  }, [isPlaying, isPaused, acquire, release])

  // Re-acquire when tab becomes visible again (e.g. user returns from another app)
  // AND playback is supposed to be active.
  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden && shouldHoldRef.current) {
        acquire()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [acquire])

  // Release on unmount
  useEffect(() => {
    return () => {
      release()
    }
  }, [release])
}
