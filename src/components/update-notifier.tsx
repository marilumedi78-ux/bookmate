'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, X, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

// ─── UpdateNotifier: muestra un banner cuando hay una nueva versión ───
//
// Este componente se renderiza a nivel global (en layout.tsx) para que
// detecte actualizaciones del Service Worker incluso en la landing page
// (sin sesión iniciada).
//
// Flujo:
//   1. Cada 5 minutos hace navigator.serviceWorker.ready → registration.update()
//   2. Si hay un SW nuevo instalado (estado 'installed' con controller existente),
//      mostramos el banner.
//   3. El usuario toca "Actualizar" → mandamos SKIP_WAITING al SW nuevo.
//   4. Cuando el SW toma control (controllerchange), recargamos la página.
//
// También escuchamos 'updatefound' para detectar nuevas versiones que se
// descarguen mientras la app está abierta.

export function UpdateNotifier() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [newWorker, setNewWorker] = useState<ServiceWorker | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    let refreshing = false

    const checkForUpdates = async () => {
      try {
        const reg = await navigator.serviceWorker.ready

        // Si ya hay un SW esperando, mostrar banner inmediatamente
        if (reg.waiting) {
          setNewWorker(reg.waiting)
          setUpdateAvailable(true)
        }

        // Escuchar nuevas versiones que se descarguen
        reg.addEventListener('updatefound', () => {
          const newSW = reg.installing
          if (!newSW) return

          newSW.addEventListener('statechange', () => {
            if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
              // Nueva versión instalada y esperando
              setNewWorker(newSW)
              setUpdateAvailable(true)
            }
          })
        })

        // Chequear manualmente cada 5 minutos si hay updates
        const interval = setInterval(() => {
          reg.update().catch(() => {})
        }, 5 * 60 * 1000)

        return () => clearInterval(interval)
      } catch {}
    }

    checkForUpdates()

    // Cuando el SW toma control, recargar la página (una sola vez)
    const onControllerChange = () => {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    }
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
    }
  }, [])

  // También chequear versión contra el servidor cada 5 min (para detectar
  // deploys nuevos aunque el SW no se haya actualizado)
  useEffect(() => {
    if (typeof window === 'undefined') return
    let currentVersion: string | null = null

    const checkVersion = async () => {
      try {
        const res = await fetch('/api/version', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          if (!currentVersion) {
            currentVersion = data.version
            return
          }
          if (data.version !== currentVersion) {
            // Nueva versión en el server — forzar check de SW
            if ('serviceWorker' in navigator) {
              const reg = await navigator.serviceWorker.getRegistration()
              if (reg) await reg.update()
            }
          }
        }
      } catch {}
    }

    checkVersion()
    const interval = setInterval(checkVersion, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const handleUpdate = useCallback(() => {
    if (!newWorker) {
      // Si por alguna razón no tenemos referencia al worker, hacer reload directo
      window.location.reload()
      return
    }
    // Mandar SKIP_WAITING al SW nuevo → tomará control → controllerchange → reload
    newWorker.postMessage({ type: 'SKIP_WAITING' })

    // Fallback: si después de 3 segundos no se recargó, forzar reload
    setTimeout(() => {
      window.location.reload()
    }, 3000)
  }, [newWorker])

  const handleDismiss = useCallback(() => {
    setUpdateAvailable(false)
  }, [])

  return (
    <AnimatePresence>
      {updateAvailable && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-[100] safe-area-top"
        >
          <div className="bg-emerald-500/95 backdrop-blur-md border-b border-emerald-600/30 px-4 py-3 flex items-center gap-3 shadow-lg">
            <div className="size-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <RefreshCw className="size-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">¡Nueva versión disponible!</p>
              <p className="text-xs text-emerald-50/90">
                Toca "Actualizar" para tener las últimas mejoras
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleUpdate}
              className="shrink-0 bg-white text-emerald-700 hover:bg-emerald-50 font-semibold"
            >
              <Download className="size-3.5 mr-1" />
              Actualizar
            </Button>
            <button
              onClick={handleDismiss}
              className="text-white/80 hover:text-white shrink-0 p-1"
              aria-label="Cerrar"
            >
              <X className="size-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
