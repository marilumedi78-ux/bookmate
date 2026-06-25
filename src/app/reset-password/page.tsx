'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Headphones, Eye, EyeOff, Loader2, Check, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // If no token in URL, show error
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-5">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="size-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="size-6 text-destructive" />
            </div>
            <h2 className="font-bold text-foreground mb-2">Enlace inválido</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Este enlace no contiene un token de recuperación válido.
              Solicita uno nuevo desde la pantalla de inicio de sesión.
            </p>
            <Button onClick={() => router.push('/')} className="w-full">
              Volver al inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!newPassword || !confirmPassword) {
      setError('Completa todos los campos')
      return
    }
    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Error al restablecer la contraseña')
        return
      }
      setSuccess(true)
      // Redirect to login after 3 seconds
      setTimeout(() => router.push('/'), 3000)
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-5">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Check className="size-6 text-primary" />
            </div>
            <h2 className="font-bold text-foreground mb-2">¡Contraseña restablecida!</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Tu contraseña fue actualizada correctamente. Te redirigiremos
              al inicio de sesión en unos segundos...
            </p>
            <Loader2 className="size-4 animate-spin text-muted-foreground mx-auto" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-5">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="size-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20 mx-auto mb-3">
            <Headphones className="size-7 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Escucha Libros</h1>
          <p className="text-sm text-muted-foreground mt-1">Restablece tu contraseña</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Nueva contraseña</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Nueva contraseña</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    aria-label={showPassword ? 'Ocultar' : 'Mostrar'}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Confirma la contraseña</label>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Repite la nueva contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <><Loader2 className="size-4 mr-2 animate-spin" /> Guardando...</>
                ) : (
                  'Restablecer contraseña'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <button
          onClick={() => router.push('/')}
          className="block mx-auto mt-6 text-sm text-muted-foreground hover:text-foreground"
        >
          ← Volver al inicio
        </button>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}
