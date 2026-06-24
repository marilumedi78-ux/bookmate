'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X, Smartphone, Headphones } from 'lucide-react'
import { Button } from '@/components/ui/button'

// ─── InstallPrompt: "Add to Home Screen" banner ───
//
// Shows a professional install banner when:
//   1. The browser fires 'beforeinstallprompt' (Chrome/Android/Edge desktop)
//   2. The user is on iOS Safari (no beforeinstallprompt event, but we can
//      detect iOS + standalone === false and show iOS-specific instructions)
//
// Dismissed state is persisted in localStorage so we don't pester the user
// every session. After 7 days we show it again.

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'bookmate:installPromptDismissedAt'
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000  // 7 days

function isDismissed(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const ts = parseInt(window.localStorage.getItem(DISMISS_KEY) || '0', 10)
    if (!ts) return false
    return Date.now() - ts < DISMISS_DURATION_MS
  } catch {
    return false
  }
}

function setDismissed() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()))
  } catch {}
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIOSInstructions, setShowIOSInstructions] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isDismissed()) return

    // Detect iOS Safari (which doesn't fire beforeinstallprompt)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as any).standalone === true

    if (isIOS && !isStandalone) {
      // Small delay so it doesn't show instantly on page load
      const timer = setTimeout(() => {
        setShowIOSInstructions(true)
        setIsVisible(true)
      }, 3000)
      return () => clearTimeout(timer)
    }

    // Android/Chrome/Edge: listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Small delay so it doesn't conflict with other toasts
      setTimeout(() => setIsVisible(true), 3000)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    try {
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      if (choice.outcome === 'accepted') {
        // Hide forever (or until 7 days pass)
        setDismissed()
      }
    } catch {}
    setDeferredPrompt(null)
    setIsVisible(false)
  }

  const handleDismiss = () => {
    setDismissed()
    setIsVisible(false)
  }

  // ─── iOS instructions (manual: Share → Add to Home Screen) ───
  if (showIOSInstructions && isVisible) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto"
        >
          <div className="bg-background border border-border rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-primary/10 p-4 flex items-start gap-3">
              <div className="size-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
                <Headphones className="size-5 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground">Instala Escucha Libros</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Escucha con pantalla apagada, como Spotify
                </p>
              </div>
              <button
                onClick={handleDismiss}
                className="text-muted-foreground hover:text-foreground shrink-0"
                aria-label="Cerrar"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-sm text-foreground font-medium">Cómo instalar:</p>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="font-bold text-primary shrink-0">1.</span>
                  <span>Toca el botón <strong className="text-foreground">Compartir</strong> <ShareIcon /> en Safari</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-primary shrink-0">2.</span>
                  <span>Selecciona <strong className="text-foreground">"Añadir a pantalla de inicio"</strong></span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-primary shrink-0">3.</span>
                  <span>Toca <strong className="text-foreground">"Añadir"</strong> — ¡listo!</span>
                </li>
              </ol>
              <Button onClick={handleDismiss} className="w-full" variant="outline">
                Entendido
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    )
  }

  // ─── Android/Chrome install prompt ───
  if (deferredPrompt && isVisible) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto"
        >
          <div className="bg-background border border-border rounded-2xl shadow-2xl p-4 flex items-center gap-3">
            <div className="size-12 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <Smartphone className="size-6 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-foreground">Instala Escucha Libros</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                Acceso rápido desde tu pantalla · Escucha con pantalla apagada
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                onClick={handleInstall}
                size="sm"
                className="gap-1.5"
              >
                <Download className="size-4" />
                Instalar
              </Button>
              <button
                onClick={handleDismiss}
                className="text-muted-foreground hover:text-foreground p-1"
                aria-label="Cerrar"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    )
  }

  return null
}

// iOS Safari "Share" icon (SVG) — used in the iOS instructions
function ShareIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="size-3.5 inline-block mx-0.5"
      aria-hidden
    >
      <path d="M17 8a3 3 0 1 0-2.83-4H14a3 3 0 0 0 3 4zm0 0v8m0-8l-10 5m10 3l-10-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
