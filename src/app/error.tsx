'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to the console for debugging
    console.error('App error boundary caught:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-sm w-full text-center space-y-4">
        <div className="size-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
          <AlertTriangle className="size-8 text-destructive" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Algo salió mal</h2>
        <p className="text-sm text-muted-foreground">
          Ocurrió un error inesperado. Intenta recargar la página.
        </p>
        {error?.message && (
          <p className="text-xs text-muted-foreground/70 bg-muted p-2 rounded font-mono break-all">
            {error.message}
          </p>
        )}
        <div className="flex gap-2 justify-center">
          <Button variant="outline" onClick={() => window.location.href = '/'}>
            Inicio
          </Button>
          <Button onClick={reset}>
            <RefreshCw className="size-4 mr-1" />
            Reintentar
          </Button>
        </div>
      </div>
    </div>
  )
}
