'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from 'next-themes'
import { useSession, signIn, signOut } from 'next-auth/react'
import {
  BookOpen,
  Headphones,
  BarChart3,
  Gem,
  Sun,
  Moon,
  Plus,
  Search,
  Check,
  Clock,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Sparkles,
  Volume2,
  CloudRain,
  Coffee,
  Flame,
  Waves,
  TreePine,
  Timer,
  Eye,
  Ear,
  Layers,
  ChevronRight,
  X,
  BookMarked,
  Flame as FlameIcon,
  Trophy,
  Zap,
  Globe,
  Star,
  CheckCircle2,
  Lock,
  Crown,
  Trash2,
  Loader2,
  AlertTriangle,
  User,
  Settings,
  Mail,
  Shield,
  Copy,
  LayoutGrid,
  Users,
  RefreshCw,
  Download,
  LogOut,
  Mail as MailIcon,
  Lock as LockIcon,
  Eye as EyeIcon,
  EyeOff,
  Target,
  Quote,
  Activity,
  ArrowDownUp,
  BookText,
  CalendarCheck,
  Pencil,
  TrendingUp,
  Smile,
  Filter,
  Library,
  Share2,
} from 'lucide-react'

import { useBookMateStore, type BookItem, type TabType, type HighlightItem } from '@/lib/store'
import { useTTS } from '@/lib/use-tts'
import { VOICE_PROFILES } from '@/lib/voice-profiles'
import { isSentenceSkipped, isNoiseSentence, previewRange } from '@/lib/skip-utils'
import {
  shareContent,
  buildHighlightShareText,
  buildAchievementsShareText,
  buildWeeklyStatsShareText,
  buildSummaryShareText,
  type SharePlan,
} from '@/lib/share-utils'
import { useAmbientSound } from '@/lib/use-ambient-sound'
import { BookMateLogo } from '@/components/bookmate-logo'
import { ComponentErrorBoundary } from '@/components/component-error-boundary'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'
import { Skeleton } from '@/components/ui/skeleton'

// ──────────────────────────────────────────────
// Login / Register Screen
// ──────────────────────────────────────────────
function LoginScreen() {
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password.trim()) {
      setError('Email y contraseña son requeridos')
      return
    }

    if (isRegister && password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)

    try {
      if (isRegister) {
        // Register first
        const regRes = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password, name: name.trim() || undefined }),
        })
        let regData: any
        try {
          regData = await regRes.json()
        } catch {
          setError('Error del servidor. Inténtalo de nuevo.')
          setLoading(false)
          return
        }

        if (!regRes.ok) {
          setError(regData.error || 'Error al crear la cuenta')
          setLoading(false)
          return
        }
      }

      // Then sign in
      const result = await signIn('credentials', {
        email: email.trim(),
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Email o contraseña incorrectos')
      }
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <BookMateLogo size={64} />
          </div>
          <h1 className="text-2xl font-bold text-foreground">BookMate</h1>
          <p className="text-muted-foreground text-sm mt-1">Tu Compañero de Libros</p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-center">
              {isRegister ? 'Crear cuenta' : 'Iniciar sesión'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Nombre</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Tu nombre (opcional)"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Email</label>
                <div className="relative">
                  <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Contraseña</label>
                <div className="relative">
                  <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-9"
                    autoComplete={isRegister ? 'new-password' : 'current-password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <EyeIcon className="size-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2"
                >
                  {error}
                </motion.p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <Loader2 className="size-4 animate-spin mr-2" />
                ) : null}
                {isRegister ? 'Crear cuenta' : 'Iniciar sesión'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center pb-4">
            <button
              onClick={() => { setIsRegister(!isRegister); setError('') }}
              className="text-sm text-primary hover:underline"
            >
              {isRegister ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
            </button>
          </CardFooter>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Al registrarte aceptas nuestros términos de servicio
        </p>
      </motion.div>
    </div>
  )
}

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────
const AMBIENT_SOUNDS = [
  { id: 'rain', name: 'Lluvia', icon: CloudRain },
  { id: 'cafe', name: 'Café', icon: Coffee },
  { id: 'fire', name: 'Fogata', icon: Flame },
  { id: 'waves', name: 'Olas', icon: Waves },
  { id: 'forest', name: 'Bosque', icon: TreePine },
]

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2]
const SPEED_OPTIONS_FREE = [1] // Free plan: only 1x speed
const SLEEP_OPTIONS = [15, 30, 45, 60]

const EXPLICA_OPTIONS = [
  { id: 'simple', label: 'Explícamelo simple', icon: Eye, mode: 'simple' },
  { id: 'kids', label: 'Como si tuviera 10 años', icon: Star, mode: 'kid10' },
  { id: 'example', label: 'Dame un ejemplo', icon: Layers, mode: 'example' },
  { id: 'author', label: '¿Qué quiere decir el autor?', icon: Sparkles, mode: 'author_intent' },
]

const ACHIEVEMENT_ICONS: Record<string, typeof BookOpen> = {
  'first-book': BookMarked,
  'ten-books': BookOpen,
  'hundred-hours': Clock,
  'streak-7': FlameIcon,
  'streak-30': Trophy,
  'nocturnal': Moon,
  'speedster': Zap,
  'explorer': Globe,
  'finisher': CheckCircle2,
  'bookworm': BookOpen,
}

// ──────────────────────────────────────────────
// Helper: darken a hex color by 30%
// ──────────────────────────────────────────────
function darkenHex(hex: string, amount = 0.3): string {
  if (!hex || !hex.startsWith('#')) return '#1a5c54'
  const num = parseInt(hex.slice(1), 16)
  const r = Math.max(0, Math.round(((num >> 16) & 0xff) * (1 - amount)))
  const g = Math.max(0, Math.round(((num >> 8) & 0xff) * (1 - amount)))
  const b = Math.max(0, Math.round((num & 0xff) * (1 - amount)))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

// ──────────────────────────────────────────────
// Main Page Component
// ──────────────────────────────────────────────
export default function Home() {
  const { data: session, status: authStatus } = useSession()
  const {
    activeTab,
    setActiveTab,
    isDarkMode,
    setIsDarkMode,
    setUserPlan,
    setIsVip,
  } = useBookMateStore()

  const { setTheme } = useTheme()
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)

  // ── CRITICAL: Load user plan from /api/auth/me on login ──
  // This ensures isVip/userPlan are set globally, not just in Stats/Pricing tabs
  // Without this, ReaderTab shows "Voz IA (Plus/Pro)" locked even for Pro/VIP users
  useEffect(() => {
    if (authStatus !== 'authenticated' || !session?.user) return

    // First, set from session (available immediately from JWT)
    if (session.user.plan) setUserPlan(session.user.plan as 'free' | 'plus' | 'pro')
    if (session.user.isVip) setIsVip(session.user.isVip)

    // Then fetch fresh data from /api/auth/me for latest DB values
    const loadPlan = async () => {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          if (data.user) {
            setUserPlan(data.user.plan || 'free')
            setIsVip(data.user.isVip || false)
          }
        }
      } catch {
        // silently fail
      }
    }
    loadPlan()
  }, [authStatus, session, setUserPlan, setIsVip])

  // Handle checkout success/cancel from Stripe redirect
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('checkout') === 'success') {
      // Clean URL
      window.history.replaceState({}, '/', '/')
      // Force session refresh to get updated plan
      // The session will automatically update via NextAuth
    }
    if (params.get('checkout') === 'cancel') {
      window.history.replaceState({}, '/', '/')
    }
  }, [])

  // Capture the beforeinstallprompt event
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
      // Show banner after a short delay if not dismissed
      const dismissed = localStorage.getItem('bookmate-install-dismissed')
      if (!dismissed) {
        setTimeout(() => setShowInstallBanner(true), 3000)
      }
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = useCallback(async () => {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') {
      setShowInstallBanner(false)
    }
    setInstallPrompt(null)
  }, [installPrompt])

  const handleDismissInstall = useCallback(() => {
    setShowInstallBanner(false)
    localStorage.setItem('bookmate-install-dismissed', 'true')
  }, [])

  // ── Update Detection ──
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [newWorker, setNewWorker] = useState<ServiceWorker | null>(null)

  // ── Premium Voice Preview (Cloudflare Workers AI) ──
  const [showVoicePreview, setShowVoicePreview] = useState(false)
  const [voicePreviewDismissed, setVoicePreviewDismissed] = useState(false)
  // Load dismissal state from localStorage so banner doesn't nag after closing
  useEffect(() => {
    if (typeof window === 'undefined') return
    const dismissed = localStorage.getItem('bookmate-voice-preview-dismissed') === 'true'
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration of localStorage value
    setVoicePreviewDismissed(dismissed)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    // Check if there's already a waiting service worker on load
    const checkExistingWorker = () => {
      const reg = navigator.serviceWorker.controller
      // If there's no controller, this is the first load
    }

    // Listen for service worker updates
    navigator.serviceWorker.ready.then((registration) => {
      // Check if there's already a waiting worker
      if (registration.waiting) {
        setNewWorker(registration.waiting)
        setUpdateAvailable(true)
      }

      // Listen for new service workers
      registration.addEventListener('updatefound', () => {
        const newSW = registration.installing
        if (!newSW) return

        newSW.addEventListener('statechange', () => {
          if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
            // New version installed and waiting!
            setNewWorker(newSW)
            setUpdateAvailable(true)
          }
        })
      })

      // Periodically check for updates every 5 minutes
      const interval = setInterval(() => {
        registration.update().catch(() => {})
      }, 5 * 60 * 1000)

      return () => clearInterval(interval)
    })

    // Also listen for controller change (SW took over)
    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    })

    checkExistingWorker()
  }, [])

  // Also poll the /api/version endpoint every 5 minutes to detect deploys
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
            // New version detected on server — force SW update check
            if ('serviceWorker' in navigator) {
              const reg = await navigator.serviceWorker.getRegistration()
              if (reg) {
                await reg.update()
              }
            }
          }
        }
      } catch {
        // Silently fail — no internet or similar
      }
    }

    checkVersion()
    const interval = setInterval(checkVersion, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const handleUpdate = useCallback(() => {
    if (!newWorker) return
    // Tell the waiting service worker to skip waiting and activate
    newWorker.postMessage({ type: 'SKIP_WAITING' })
    // The controllerchange event will reload the page
  }, [newWorker])

  const handleDismissUpdate = useCallback(() => {
    setUpdateAvailable(false)
  }, [])

  const handleDarkToggle = useCallback(() => {
    const newDark = !isDarkMode
    setIsDarkMode(newDark)
    setTheme(newDark ? 'dark' : 'light')
  }, [isDarkMode, setIsDarkMode, setTheme])

  const tabs: { id: TabType; label: string; icon: typeof BookOpen }[] = [
    { id: 'library', label: 'Biblioteca', icon: BookOpen },
    { id: 'reader', label: 'Lector', icon: Headphones },
    { id: 'stats', label: 'Stats', icon: BarChart3 },
    { id: 'pricing', label: 'Pro', icon: Gem },
  ]

  // Show login screen if not authenticated
  // Dev bypass: skip login when ?dev=1 query param is present
  const [devBypass, setDevBypass] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: detect query param on client only
    setDevBypass(new URLSearchParams(window.location.search).get('dev') === '1')
  }, [])
  if (authStatus === 'loading' && !devBypass) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <BookMateLogo size={64} />
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (!session && !devBypass) {
    return <LoginScreen />
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Main app container - responsive: full width on mobile, centered on desktop */}
      <div className="w-full max-w-2xl mx-auto min-h-screen flex flex-col relative">

        {/* Install Banner */}
        <AnimatePresence>
          {showInstallBanner && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-primary/10 border-b px-4 py-3 flex items-center gap-3">
                <BookMateLogo size={28} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Instalar BookMate</p>
                  <p className="text-xs text-muted-foreground">Acceso rápido desde tu pantalla de inicio</p>
                </div>
                <Button size="sm" onClick={handleInstall} className="shrink-0">
                  Instalar
                </Button>
                <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={handleDismissInstall}>
                  <X className="size-3.5" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Update Available Banner */}
        <AnimatePresence>
          {updateAvailable && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-4 py-3 flex items-center gap-3">
                <div className="size-9 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <RefreshCw className="size-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Nueva versión disponible</p>
                  <p className="text-xs text-muted-foreground">Actualiza para disfrutar las últimas mejoras</p>
                </div>
                <Button size="sm" onClick={handleUpdate} className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Download className="size-3.5 mr-1" />
                  Actualizar
                </Button>
                <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={handleDismissUpdate}>
                  <X className="size-3.5" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Premium Voice Preview Banner (Cloudflare Workers AI) ── */}
        <AnimatePresence>
          {!voicePreviewDismissed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-gradient-to-r from-amber-500/10 to-rose-500/10 border-b border-amber-500/20 px-4 py-3 flex items-center gap-3">
                <div className="size-9 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                  <Sparkles className="size-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Voces Premium disponibles</p>
                  <p className="text-xs text-muted-foreground">Escucha la calidad audiolibro real</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setShowVoicePreview(true)}
                  className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <Play className="size-3.5 mr-1" />
                  Escuchar
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0"
                  onClick={() => {
                    setVoicePreviewDismissed(true)
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('bookmate-voice-preview-dismissed', 'true')
                    }
                  }}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── HEADER ── */}
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
          <div className="flex items-center justify-between px-4 h-14">
            <div className="flex items-center gap-2">
              <BookMateLogo size={32} />
              <span className="font-bold text-lg text-foreground">BookMate</span>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDarkToggle}
                  aria-label={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                >
                  {isDarkMode ? <Sun className="size-5" /> : <Moon className="size-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isDarkMode ? 'Modo claro' : 'Modo oscuro'}
              </TooltipContent>
            </Tooltip>
          </div>
        </header>

        {/* ── MAIN CONTENT ── */}
        <main className={`flex-1 ${activeTab === 'reader' ? 'overflow-hidden' : 'pb-20 overflow-y-auto'}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className={activeTab === 'reader' ? 'h-full' : ''}
            >
              {activeTab === 'library' && <LibraryTab />}
              {activeTab === 'reader' && (
                <ComponentErrorBoundary name="ReaderTab">
                  <ReaderTab />
                </ComponentErrorBoundary>
              )}
              {activeTab === 'stats' && <StatsTab isLoggedIn={!!session?.user} />}
              {activeTab === 'pricing' && <PricingTab />}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* ── FOOTER / TAB NAV ── */}
        <footer className="sticky bottom-0 z-50 bg-background/80 backdrop-blur-md border-t mt-auto">
          <nav className="flex" aria-label="Navegación principal">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex flex-col items-center justify-center py-2.5 transition-colors ${
                    isActive
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={tab.label}
                >
                  <Icon className="size-5 mb-0.5" />
                  <span className="text-[11px] font-medium">{tab.label}</span>
                </button>
              )
            })}
          </nav>
        </footer>
      </div>

      {/* ── PREMIUM VOICE PREVIEW DIALOG (Cloudflare Workers AI — Deepgram Aura Spanish) ── */}
      <Dialog open={showVoicePreview} onOpenChange={setShowVoicePreview}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-amber-500" />
              Voces Premium en Español
            </DialogTitle>
            <DialogDescription>
              10 voces neuronales nativas en español (Deepgram Aura). Estas son las voces que tendrán los planes Plus y Pro.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Female voices section */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <span className="text-rose-500">♀</span> Voces Femeninas
              </p>
              <div className="rounded-lg border bg-card p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Stella — Presentación</p>
                    <p className="text-xs text-muted-foreground truncate">
                      "Hola, soy tu voz de lectura premium..."
                    </p>
                  </div>
                  <Badge variant="secondary" className="ml-2 shrink-0 text-[10px]">Premium</Badge>
                </div>
                <audio controls className="w-full h-9" preload="metadata">
                  <source src="/samples/dg-stella-intro.mp3" type="audio/mpeg" />
                  Tu navegador no soporta audio.
                </audio>
              </div>

              <div className="rounded-lg border bg-card p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Stella — Literatura (El Alquimista)</p>
                    <p className="text-xs text-muted-foreground truncate">
                      "El alquimista cogió un vaso lleno de líquido..."
                    </p>
                  </div>
                  <Badge variant="secondary" className="ml-2 shrink-0 text-[10px]">Premium</Badge>
                </div>
                <audio controls className="w-full h-9" preload="metadata">
                  <source src="/samples/dg-stella-literature.mp3" type="audio/mpeg" />
                  Tu navegador no soporta audio.
                </audio>
              </div>
            </div>

            {/* Male voices section */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <span className="text-blue-500">♂</span> Voces Masculinas
              </p>
              <div className="rounded-lg border bg-card p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Zeus — Presentación</p>
                    <p className="text-xs text-muted-foreground truncate">
                      "Hola, soy tu voz de lectura premium..."
                    </p>
                  </div>
                  <Badge variant="secondary" className="ml-2 shrink-0 text-[10px]">Premium</Badge>
                </div>
                <audio controls className="w-full h-9" preload="metadata">
                  <source src="/samples/dg-zeus-intro.mp3" type="audio/mpeg" />
                  Tu navegador no soporta audio.
                </audio>
              </div>

              <div className="rounded-lg border bg-card p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Zeus — Literatura (El Alquimista)</p>
                    <p className="text-xs text-muted-foreground truncate">
                      "El alquimista cogió un vaso lleno de líquido..."
                    </p>
                  </div>
                  <Badge variant="secondary" className="ml-2 shrink-0 text-[10px]">Premium</Badge>
                </div>
                <audio controls className="w-full h-9" preload="metadata">
                  <source src="/samples/dg-zeus-literature.mp3" type="audio/mpeg" />
                  Tu navegador no soporta audio.
                </audio>
              </div>
            </div>

            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-700 dark:text-amber-300 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <Sparkles className="size-3.5" />
                ¿Qué opinas?
              </p>
              <p>
                Estas son 2 de las 10 voces disponibles. Si te gusta la calidad, las integro en toda la app para tus libros.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowVoicePreview(false)
                setVoicePreviewDismissed(true)
                if (typeof window !== 'undefined') {
                  localStorage.setItem('bookmate-voice-preview-dismissed', 'true')
                }
              }}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ──────────────────────────────────────────────
// LIBRARY TAB
// ──────────────────────────────────────────────
function LibraryTab() {
  const {
    books,
    setBooks,
    addBook,
    removeBook,
    setCurrentBook,
    setBookText,
    setActiveTab,
    isUploading,
    setIsUploading,
    duplicateInfo,
    setDuplicateInfo,
  } = useBookMateStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [loadingBooks, setLoadingBooks] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<BookItem | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'author'>('grid')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [progressFilter, setProgressFilter] = useState<'all' | 'reading' | 'unread' | 'finished'>('all')
  const [sortBy, setSortBy] = useState<'recent' | 'title' | 'progress'>('recent')
  const [wordOfDay, setWordOfDay] = useState<{ word: string; type: string; meaning: string; example: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch Word of the Day (free for everyone, no auth required)
  useEffect(() => {
    let cancelled = false
    const fetchWord = async () => {
      try {
        const res = await fetch('/api/word-of-day')
        if (res.ok && !cancelled) {
          const data = await res.json()
          setWordOfDay(data)
        }
      } catch {
        // silently fail
      }
    }
    fetchWord()
    return () => { cancelled = true }
  }, [])

  // Fetch books on mount
  useEffect(() => {
    let cancelled = false
    const fetchBooks = async () => {
      setLoadingBooks(true)
      try {
        const res = await fetch('/api/books')
        if (res.ok && !cancelled) {
          const data = await res.json()
          setBooks(data.books || [])
        }
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoadingBooks(false)
      }
    }
    fetchBooks()
    return () => { cancelled = true }
  }, [setBooks])

  const fetchBooks = useCallback(async () => {
    try {
      const res = await fetch('/api/books')
      if (res.ok) {
        const data = await res.json()
        setBooks(data.books || [])
      }
    } catch {
      // silently fail
    }
  }, [setBooks])

  const filteredBooks = useMemo(() => {
    // 1. Search filter (title / author)
    let result = books.filter(
      (b) =>
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.author.toLowerCase().includes(searchQuery.toLowerCase())
    )
    // 2. Progress filter
    if (progressFilter !== 'all') {
      result = result.filter((b) => {
        const pct = b.totalChars > 0 ? b.readChars / b.totalChars : 0
        if (progressFilter === 'finished') return b.isFinished
        if (progressFilter === 'reading') return !b.isFinished && pct > 0
        if (progressFilter === 'unread') return pct === 0 && !b.isFinished
        return true
      })
    }
    // 3. Sort
    result = [...result].sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title, 'es', { sensitivity: 'base' })
      if (sortBy === 'progress') {
        const pa = a.totalChars > 0 ? a.readChars / a.totalChars : 0
        const pb = b.totalChars > 0 ? b.readChars / b.totalChars : 0
        return pb - pa
      }
      // recent: by createdAt desc
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
    return result
  }, [books, searchQuery, progressFilter, sortBy])

  const handleOpenBook = useCallback(
    async (book: BookItem) => {
      setCurrentBook(book)
      try {
        const res = await fetch(`/api/books/${book.id}/text`)
        if (res.ok) {
          const data = await res.json()
          setBookText(data.text || '')
        } else {
          setBookText('')
        }
      } catch {
        setBookText('')
      }
      setActiveTab('reader')
    },
    [setCurrentBook, setBookText, setActiveTab]
  )

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      setIsUploading(true)
      setDuplicateInfo(null)
      setUploadError(null)

      try {
        // Load PDF.js from CDN using script tag (most compatible approach)
        const loadPdfJs = (): Promise<any> => {
          if ((window as any).pdfjsLib) return Promise.resolve((window as any).pdfjsLib)
          return new Promise((resolve, reject) => {
            const script = document.createElement('script')
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
            script.onload = () => {
              const lib = (window as any).pdfjsLib
              if (lib) {
                lib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
                resolve(lib)
              } else {
                reject(new Error('PDF.js no se cargó correctamente'))
              }
            }
            script.onerror = () => reject(new Error('Error al cargar PDF.js desde CDN'))
            document.head.appendChild(script)
          })
        }

        const pdfjsLib = await loadPdfJs()
        const arrayBuffer = await file.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise
        
        // Extract text from all pages
        const textParts: string[] = []
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const content = await page.getTextContent()
          const pageText = content.items.map((item: any) => item.str).join(' ')
          textParts.push(pageText)
        }
        const text = textParts.join('\n\n')

        if (!text.trim()) {
          throw new Error('No se pudo extraer texto del PDF. Puede ser un PDF escaneado (imagen).')
        }

        // Get PDF metadata
        const metadata = await pdf.getMetadata().catch(() => null) as any
        const info = metadata?.info || {}
        const title = info?.Title || file.name.replace(/\.pdf$/i, '') || 'Sin título'
        const author = info?.Author || 'Desconocido'

        // Compute file hash
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

        // Send extracted data to API
        const res = await fetch('/api/books/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            author,
            fileName: file.name,
            fileHash,
            text,
            totalPages: pdf.numPages,
          }),
        })

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          if (errorData.code === 'PLAN_LIMIT') {
            setShowUpgradeModal('books')
            throw new Error(errorData.error || 'Límite de libros alcanzado')
          }
          throw new Error(errorData.error || `Error del servidor (${res.status})`)
        }

        const data = await res.json()

        if (data.duplicate) {
          setDuplicateInfo({
            duplicate: true,
            matchType: data.matchType,
            existingBook: data.existingBook,
            message: data.message,
          })
        } else {
          addBook(data.book)
          setUploadOpen(false)
        }
      } catch (err) {
        console.error('Upload error:', err)
        setUploadError(err instanceof Error ? err.message : 'Error al subir el PDF')
      } finally {
        setIsUploading(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    },
    [setIsUploading, setDuplicateInfo, addBook]
  )

  const handleDuplicateReplace = useCallback(async () => {
    if (!duplicateInfo?.existingBook) return
    // Delete existing and re-upload
    try {
      await fetch(`/api/books/${duplicateInfo.existingBook.id}`, { method: 'DELETE' })
      removeBook(duplicateInfo.existingBook.id)
    } catch {
      // continue
    }
    setDuplicateInfo(null)
    setUploadOpen(false)
    // Re-trigger file selection
    setTimeout(() => {
      fileInputRef.current?.click()
    }, 300)
  }, [duplicateInfo, removeBook, setDuplicateInfo])

  const handleDuplicateKeepBoth = useCallback(async () => {
    // Re-upload with force flag - need to re-parse the file
    const fileInput = fileInputRef.current
    if (!fileInput?.files?.[0]) {
      setDuplicateInfo(null)
      return
    }

    setIsUploading(true)

    try {
      const file = fileInput.files[0]
      // Use already-loaded PDF.js from window
      const pdfjsLib = (window as any).pdfjsLib
      if (!pdfjsLib) throw new Error('PDF.js no disponible')

      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise
      
      const textParts: string[] = []
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        const pageText = content.items.map((item: any) => item.str).join(' ')
        textParts.push(pageText)
      }
      const text = textParts.join('\n\n')

      const metadata = await pdf.getMetadata().catch(() => null) as any
      const info = metadata?.info || {}
      const title = info?.Title || file.name.replace(/\.pdf$/i, '') || 'Sin título'
      const author = info?.Author || 'Desconocido'

      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

      const res = await fetch('/api/books/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          author,
          fileName: file.name,
          fileHash,
          text,
          totalPages: pdf.numPages,
          force: 'true',
        }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.book) {
          addBook(data.book)
        }
      }
    } catch {
      // silently fail
    } finally {
      setIsUploading(false)
      setDuplicateInfo(null)
      setUploadOpen(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [setIsUploading, setDuplicateInfo, addBook])

  const handleDeleteBook = useCallback(
    async (book: BookItem) => {
      try {
        const res = await fetch(`/api/books/${book.id}`, { method: 'DELETE' })
        if (res.ok) {
          removeBook(book.id)
        }
      } catch {
        // silently fail
      }
      setDeleteTarget(null)
    },
    [removeBook]
  )

  return (
    <div className="px-4 pt-6">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-foreground">Mi Biblioteca</h1>
        <p className="text-muted-foreground text-sm mt-1">Tus libros, tu ritmo</p>
      </div>

      {/* Word of the Day — free for everyone */}
      {wordOfDay && (
        <Card className="mb-4 py-0 overflow-hidden border-primary/20">
          <div className="flex items-stretch">
            <div className="w-1.5 bg-primary shrink-0" />
            <CardContent className="flex-1 py-3 px-4 space-y-1">
              <div className="flex items-center gap-2">
                <BookText className="size-4 text-primary shrink-0" />
                <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">Palabra del día</span>
              </div>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-lg font-bold text-foreground">{wordOfDay.word}</span>
                <span className="text-xs text-muted-foreground italic">{wordOfDay.type}</span>
              </div>
              <p className="text-sm text-muted-foreground leading-snug">{wordOfDay.meaning}</p>
              <p className="text-xs text-foreground/70 italic leading-snug">“{wordOfDay.example}”</p>
            </CardContent>
          </div>
        </Card>
      )}

      {/* Search + View Toggle */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar libro o autor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="size-10 shrink-0" aria-label="Ordenar">
              <ArrowDownUp className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setSortBy('recent')}>
              <Clock className="size-4 mr-2" /> Recientes {sortBy === 'recent' && <Check className="size-3.5 ml-auto" />}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy('title')}>
              <BookOpen className="size-4 mr-2" /> Título {sortBy === 'title' && <Check className="size-3.5 ml-auto" />}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy('progress')}>
              <TrendingUp className="size-4 mr-2" /> Progreso {sortBy === 'progress' && <Check className="size-3.5 ml-auto" />}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={viewMode === 'author' ? 'default' : 'outline'}
              size="icon"
              className="size-10 shrink-0"
              onClick={() => setViewMode(viewMode === 'grid' ? 'author' : 'grid')}
              aria-label={viewMode === 'grid' ? 'Agrupar por autor' : 'Vista de cuadrícula'}
            >
              {viewMode === 'grid' ? <Users className="size-4" /> : <LayoutGrid className="size-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {viewMode === 'grid' ? 'Agrupar por autor' : 'Vista cuadrícula'}
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Progress filter chips */}
      <div className="flex items-center gap-1.5 mb-6 overflow-x-auto pb-1 -mx-1 px-1">
        {([
          { id: 'all', label: 'Todos' },
          { id: 'reading', label: 'Leyendo' },
          { id: 'unread', label: 'Sin empezar' },
          { id: 'finished', label: 'Terminados' },
        ] as const).map((f) => (
          <button
            key={f.id}
            onClick={() => setProgressFilter(f.id)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              progressFilter === f.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/70'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loadingBooks && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="overflow-hidden py-0 gap-3">
              <Skeleton className="h-36 w-full" />
              <div className="px-3 pb-3 space-y-2">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-1.5 w-full" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loadingBooks && filteredBooks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BookOpen className="size-16 text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground text-lg font-medium">Sube tu primer libro para empezar</p>
          <p className="text-muted-foreground/70 text-sm mt-1">
            Toca el botón + para agregar un PDF
          </p>
        </div>
      )}

      {/* Book Grid - Normal view */}
      {!loadingBooks && viewMode === 'grid' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredBooks.map((book, i) => (
            <BookCard
              key={book.id}
              book={book}
              index={i}
              onOpen={handleOpenBook}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      {/* Book Grid - Grouped by author */}
      {!loadingBooks && viewMode === 'author' && filteredBooks.length > 0 && (() => {
        const grouped = filteredBooks.reduce<Record<string, BookItem[]>>((acc, book) => {
          const author = book.author || 'Desconocido'
          if (!acc[author]) acc[author] = []
          acc[author].push(book)
          return acc
        }, {})
        const sortedAuthors = Object.keys(grouped).sort((a, b) =>
          a.localeCompare(b, 'es', { sensitivity: 'base' })
        )
        return sortedAuthors.map(author => (
          <div key={author} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <User className="size-4 text-primary" />
              <h3 className="font-semibold text-foreground text-sm">{author}</h3>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {grouped[author].length}
              </Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {grouped[author].map((book, i) => (
                <BookCard
                  key={book.id}
                  book={book}
                  index={i}
                  onOpen={handleOpenBook}
                  onDelete={setDeleteTarget}
                />
              ))}
            </div>
          </div>
        ))
      })()}

      {/* Upload FAB */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogTrigger asChild>
          <Button
            className="fixed bottom-24 right-5 z-40 size-14 rounded-full shadow-lg"
            size="icon"
            aria-label="Subir libro"
          >
            <Plus className="size-6" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subir Libro</DialogTitle>
            <DialogDescription>
              Selecciona un archivo PDF para agregarlo a tu biblioteca.
            </DialogDescription>
          </DialogHeader>
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="size-10 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Subiendo libro...</p>
              </div>
            ) : (
              <>
                <BookOpen className="size-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  Toca para seleccionar un archivo PDF
                </p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
          {uploadError && (
            <div className="mt-3 p-3 bg-destructive/10 text-destructive text-sm rounded-lg">
              ⚠️ {uploadError}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Duplicate Alert */}
      <AlertDialog open={!!duplicateInfo} onOpenChange={(open) => { if (!open) setDuplicateInfo(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-accent" />
              ¡Ya tienes este libro!
            </AlertDialogTitle>
            <AlertDialogDescription>
              {duplicateInfo?.message || 'Se encontró un libro duplicado en tu biblioteca.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={() => { setDuplicateInfo(null); setUploadOpen(false) }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDuplicateKeepBoth} className="bg-secondary text-secondary-foreground hover:bg-secondary/80">
              Guardar ambos
            </AlertDialogAction>
            <AlertDialogAction onClick={handleDuplicateReplace} className="bg-primary text-primary-foreground hover:bg-primary/90">
              Reemplazar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar libro?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres eliminar &ldquo;{deleteTarget?.title}&rdquo;? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && handleDeleteBook(deleteTarget)}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ──────────────────────────────────────────────
// BOOK CARD
// ──────────────────────────────────────────────
function BookCard({
  book,
  index,
  onOpen,
  onDelete,
}: {
  book: BookItem
  index: number
  onOpen: (book: BookItem) => void
  onDelete: (book: BookItem) => void
}) {
  const progress = book.totalChars > 0 ? Math.round((book.readChars / book.totalChars) * 100) : 0

  // Use hex coverColor directly with inline style gradient
  const coverBg = book.coverColor || '#2A9D8F'
  const coverDark = darkenHex(coverBg, 0.3)

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      onDelete(book)
    },
    [book, onDelete]
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card
        className="cursor-pointer overflow-hidden py-0 gap-3 transition-shadow hover:shadow-md group relative"
        onClick={() => onOpen(book)}
        onContextMenu={handleContextMenu}
      >
        {/* Cover */}
        <div
          className="h-36 flex items-end p-3 relative"
          style={{
            background: `linear-gradient(135deg, ${coverBg} 0%, ${coverDark} 100%)`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          <p className="text-white font-semibold text-sm leading-tight line-clamp-2 relative z-10 drop-shadow-sm">
            {book.title}
          </p>
          {book.isFinished && (
            <Badge className="absolute top-2 right-2 bg-green-500 text-white border-0 z-10 gap-1">
              <Check className="size-3" />
            </Badge>
          )}
          {/* Delete button on hover */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 left-2 size-7 opacity-0 group-hover:opacity-100 transition-opacity z-10 text-white/80 hover:text-white hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(book)
            }}
            aria-label="Eliminar libro"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>

        <div className="px-3 pb-3 space-y-2">
          <p className="text-xs text-muted-foreground truncate">{book.author}</p>
          <Progress value={progress} className="h-1.5" />
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{progress}%</span>
            {book.isFinished ? (
              <span className="text-green-600 font-medium">Completado</span>
            ) : book.estimatedMin > 0 ? (
              <span className="flex items-center gap-0.5">
                <Clock className="size-3" />
                ~{book.estimatedMin} min
              </span>
            ) : null}
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

// ──────────────────────────────────────────────
// READER TAB
// ──────────────────────────────────────────────
function ReaderTab() {
  const store = useBookMateStore()
  const {
    currentBook,
    bookText,
    isPlaying,
    setIsPlaying,
    playbackSpeed,
    setPlaybackSpeed,
    currentCharIndex,
    setCurrentCharIndex,
    readingMode,
    setReadingMode,
    ambientSound,
    setAmbientSound,
    ambientVolume,
    setAmbientVolume,
    selectedVoiceProfileId,
    setSelectedVoiceProfileId,
    skipRanges,
    autoSkipEnabled,
    addSkipRange,
    removeSkipRangeAt,
    clearSkipRangesForBook,
    setAutoSkipEnabled,
    sleepTimer,
    setSleepTimer,
    showExplica,
    setShowExplica,
    explicaText,
    setExplicaText,
    highlights,
    setHighlights,
    addHighlight,
    removeHighlight,
    isExplaining,
    setIsExplaining,
    isLoadingBook,
    setIsLoadingBook,
    userPlan,
    isVip,
  } = store

  // Plan-based feature access
  const plan = isVip ? 'pro' : userPlan
  const canUseAmbientSounds = true // Ambient sounds are free for everyone
  const canUseSleepTimer = plan !== 'free'
  const canUseAllSpeeds = plan !== 'free'
  const maxHighlightsPerBook = plan === 'free' ? 5 : Infinity
  const maxExplicaPerMonth = plan === 'free' ? 5 : plan === 'plus' ? 10 : Infinity

  // State declarations - MUST be before effects that use them
  const [explicaResult, setExplicaResult] = useState<string | null>(null)
  const [selectedText, setSelectedText] = useState('')
  const [sleepTimeLeft, setSleepTimeLeft] = useState<number | null>(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState<string | null>(null) // feature name
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sleepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sleepEndTimeRef = useRef<number | null>(null)

  // Single TTS engine — uses voice profiles (browser TTS + pitch + rate variations)
  // Works on ALL devices and ALL deployments (sandbox + Vercel). Costs $0 in API calls.
  const tts = useTTS()
  const { previewVoice, stopPreview } = tts

  // Ambient sound engine
  useAmbientSound()

  // ─── Reading time tracking ───
  // Tracks reading time whenever a book is open (not just when TTS is playing).
  // Uses document visibility to pause when the user switches tabs/apps.
  const readingStartRef = useRef<number | null>(null)
  const readingMinutesAccumRef = useRef(0)
  const readingLogTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const currentBookIdRef = useRef<string | null>(null)
  const isVisibleRef = useRef(true)
  const lastActivityRef = useRef<number>(Date.now())
  const ACTIVITY_TIMEOUT = 120000 // 2 min without activity → pause tracking

  // Keep currentBookId ref in sync
  useEffect(() => {
    currentBookIdRef.current = currentBook?.id ?? null
  }, [currentBook])

  // Track user activity (scroll, click, touch, keypress) to detect active reading
  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now()
    }
    const events = ['scroll', 'click', 'touchstart', 'keydown', 'mousedown']
    events.forEach(e => window.addEventListener(e, updateActivity, { passive: true }))
    return () => {
      events.forEach(e => window.removeEventListener(e, updateActivity))
    }
  }, [])

  // Track document visibility
  useEffect(() => {
    const handleVisibility = () => {
      isVisibleRef.current = !document.hidden
      // When page becomes hidden, flush accumulated time
      if (document.hidden && readingStartRef.current && currentBookIdRef.current) {
        const elapsedMin = (Date.now() - readingStartRef.current) / 60000
        readingMinutesAccumRef.current += elapsedMin
        readingStartRef.current = null
        // Send if we have at least 1 minute
        if (readingMinutesAccumRef.current >= 1) {
          const minutesToSend = Math.round(readingMinutesAccumRef.current)
          readingMinutesAccumRef.current = 0
          fetch('/api/reading-logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookId: currentBookIdRef.current, minutes: minutesToSend }),
          }).catch(() => {})
        }
      }
      // When page becomes visible again, restart tracking
      if (!document.hidden && currentBookIdRef.current) {
        readingStartRef.current = Date.now()
        lastActivityRef.current = Date.now()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  // Flush accumulated reading time to server
  const flushReadingTime = useCallback((bookId: string) => {
    if (readingStartRef.current) {
      const elapsedMin = (Date.now() - readingStartRef.current) / 60000
      readingMinutesAccumRef.current += elapsedMin
      readingStartRef.current = null
    }
    if (readingMinutesAccumRef.current >= 1) {
      const minutesToSend = Math.round(readingMinutesAccumRef.current)
      readingMinutesAccumRef.current = 0
      fetch('/api/reading-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId, minutes: minutesToSend }),
      }).catch(() => {})
    }
  }, [])

  // Main reading time tracker: runs whenever a book is open
  useEffect(() => {
    if (currentBook) {
      readingStartRef.current = Date.now()
      lastActivityRef.current = Date.now()
      // Accumulate reading time every 30 seconds and send to server every 2 minutes
      readingLogTimerRef.current = setInterval(() => {
        // Check if user is active (had activity in last 2 minutes)
        const timeSinceActivity = Date.now() - lastActivityRef.current
        if (!isVisibleRef.current || timeSinceActivity > ACTIVITY_TIMEOUT) {
          // User is inactive or page is hidden — pause tracking
          if (readingStartRef.current) {
            const elapsedMin = (Date.now() - readingStartRef.current) / 60000
            readingMinutesAccumRef.current += elapsedMin
            readingStartRef.current = null
          }
          return
        }
        // User is active — accumulate time
        const now = Date.now()
        if (readingStartRef.current) {
          const elapsedMin = (now - readingStartRef.current) / 60000
          readingMinutesAccumRef.current += elapsedMin
          readingStartRef.current = now
        } else {
          // Resume tracking after inactivity
          readingStartRef.current = now
        }
        // Send to server every ~2 minutes of accumulated time
        if (readingMinutesAccumRef.current >= 2 && currentBookIdRef.current) {
          const minutesToSend = Math.round(readingMinutesAccumRef.current)
          readingMinutesAccumRef.current = 0
          fetch('/api/reading-logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookId: currentBookIdRef.current, minutes: minutesToSend }),
          }).catch(() => {})
        }
      }, 30000) // check every 30s
    } else {
      // No book open — flush and stop
      if (currentBookIdRef.current) {
        flushReadingTime(currentBookIdRef.current)
      }
      if (readingLogTimerRef.current) {
        clearInterval(readingLogTimerRef.current)
        readingLogTimerRef.current = null
      }
    }
    return () => {
      if (readingLogTimerRef.current) {
        clearInterval(readingLogTimerRef.current)
        readingLogTimerRef.current = null
      }
      // Flush on unmount
      if (currentBookIdRef.current) {
        if (readingStartRef.current) {
          const elapsedMin = (Date.now() - readingStartRef.current) / 60000
          readingMinutesAccumRef.current += elapsedMin
          readingStartRef.current = null
        }
        if (readingMinutesAccumRef.current >= 1) {
          const minutesToSend = Math.round(readingMinutesAccumRef.current)
          readingMinutesAccumRef.current = 0
          // Use fetch with keepalive for reliability on unmount (sends cookies/auth)
          fetch('/api/reading-logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookId: currentBookIdRef.current, minutes: minutesToSend }),
            keepalive: true,
          }).catch(() => {})
        }
      }
    }
  }, [currentBook, flushReadingTime])

  // Fetch highlights when book changes
  useEffect(() => {
    if (!currentBook) return
    let cancelled = false
    const fetchHighlights = async () => {
      try {
        const res = await fetch(`/api/highlights?bookId=${currentBook.id}`)
        if (res.ok && !cancelled) {
          const data = await res.json()
          setHighlights(data.highlights || [])
        }
      } catch {
        // silently fail
      }
    }
    fetchHighlights()
    return () => { cancelled = true }
  }, [currentBook, setHighlights])

  // Stop TTS when leaving the reader tab
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  // Debounced save progress
  const saveProgress = useCallback(
    (charIdx: number) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(async () => {
        if (!currentBook) return
        try {
          const readChars = Math.max(charIdx, currentBook.readChars)
          const isFinished = readChars >= currentBook.totalChars && currentBook.totalChars > 0
          await fetch(`/api/books/${currentBook.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              currentCharIdx: charIdx,
              readChars,
              isFinished,
            }),
          })
        } catch {
          // silently fail
        }
      }, 1500)
    },
    [currentBook]
  )

  // Save progress when charIndex changes
  useEffect(() => {
    if (currentBook && currentCharIndex > 0) {
      saveProgress(currentCharIndex)
    }
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [currentCharIndex, currentBook, saveProgress])

  // Auto-scroll to active sentence when TTS is playing
  useEffect(() => {
    if (!isPlaying || currentCharIndex === 0) return
    const activeEl = document.getElementById('tts-active-sentence')
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [currentCharIndex, isPlaying])

  // Sleep Timer: stop TTS after X minutes
  useEffect(() => {
    if (sleepTimerRef.current) {
      clearInterval(sleepTimerRef.current)
      sleepTimerRef.current = null
    }

    if (sleepTimer === null || sleepTimer === -1) {
      setSleepTimeLeft(null)
      sleepEndTimeRef.current = null
      return
    }

    // Set end time
    const endTime = Date.now() + sleepTimer * 60 * 1000
    sleepEndTimeRef.current = endTime
    setSleepTimeLeft(sleepTimer * 60) // seconds left

    sleepTimerRef.current = setInterval(() => {
      const now = Date.now()
      const remaining = Math.max(0, Math.round((endTime - now) / 1000))
      setSleepTimeLeft(remaining)

      if (remaining <= 0) {
        // Time's up - stop TTS and ambient sound
        if (sleepTimerRef.current) {
          clearInterval(sleepTimerRef.current)
          sleepTimerRef.current = null
        }
        tts.pause()
        setAmbientSound(null)
        setSleepTimer(null)
        setSleepTimeLeft(null)
        sleepEndTimeRef.current = null
      }
    }, 1000)

    return () => {
      if (sleepTimerRef.current) {
        clearInterval(sleepTimerRef.current)
        sleepTimerRef.current = null
      }
    }
  }, [sleepTimer, tts, setAmbientSound, setSleepTimer])

  // Check if speech synthesis is available
  // Use state to avoid hydration mismatch (server doesn't have window)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [hasVoices, setHasVoices] = useState(false)

  useEffect(() => {
    const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
    setSpeechSupported(supported)
    if (!supported) return
    const checkVoices = () => {
      try {
        const voices = window.speechSynthesis.getVoices()
        setHasVoices(voices.length > 0)
      } catch {}
    }
    checkVoices()
    // Use addEventListener instead of overwriting onvoiceschanged
    try {
      window.speechSynthesis.addEventListener('voiceschanged', checkVoices)
    } catch {
      window.speechSynthesis.onvoiceschanged = checkVoices
    }
    const timer = setTimeout(checkVoices, 1000)
    return () => {
      try { window.speechSynthesis.removeEventListener('voiceschanged', checkVoices) } catch {}
      clearTimeout(timer)
    }
  }, [])

  // ─── AI Summary & Emotion Graph state (must be before early return) ───
  const [summaryData, setSummaryData] = useState<{
    keyPoints: string[]
    quotes: string[]
    targetReader: string
  } | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [showSummarySheet, setShowSummarySheet] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [summarySharing, setSummarySharing] = useState(false)
  const [readerToast, setReaderToast] = useState<string | null>(null)
  const [showHighlightsSheet, setShowHighlightsSheet] = useState(false)
  const [highlightSharing, setHighlightSharing] = useState(false)

  // Share a single highlight quote
  const handleShareHighlight = async (text: string) => {
    if (!currentBook || highlightSharing) return
    setHighlightSharing(true)
    const result = await shareContent(buildHighlightShareText(
      text,
      currentBook.title,
      currentBook.author,
      plan as SharePlan
    ))
    setHighlightSharing(false)
    const msg = result === 'copied' ? '¡Copiado al portapapeles!' : result === 'error' ? 'No se pudo compartir' : null
    if (msg) {
      setReaderToast(msg)
      setTimeout(() => setReaderToast(null), 2500)
    }
  }

  const [emotionsData, setEmotionsData] = useState<{
    emotions: Array<{ segmentIdx: number; charStart: number; charEnd: number; emotion: string; intensity: number; label: string }>
    totalChars: number
  } | null>(null)
  const [emotionsLoading, setEmotionsLoading] = useState(false)
  const [showEmotionsSheet, setShowEmotionsSheet] = useState(false)
  const [emotionsError, setEmotionsError] = useState<string | null>(null)

  // Reset cached AI data when switching books
  useEffect(() => {
    setSummaryData(null)
    setEmotionsData(null)
    setSummaryError(null)
    setEmotionsError(null)
  }, [currentBook?.id])

  // Empty state
  if (!currentBook) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <Headphones className="size-16 text-muted-foreground/40 mb-4" />
        <p className="text-muted-foreground text-lg font-medium">
          Selecciona un libro de tu biblioteca
        </p>
        <p className="text-muted-foreground/70 text-sm mt-1">
          Ve a la pestaña Biblioteca y elige un libro para empezar a leer
        </p>
      </div>
    )
  }

  const totalChars = bookText?.length || 0
  const progressPercent = totalChars > 0 ? ((currentCharIndex || 0) / totalChars) * 100 : 0

  // Skip ranges for the current book (manual "no leer" selections)
  const currentSkipRanges = currentBook?.id ? (skipRanges[currentBook.id] || []) : []
  const skipCount = currentSkipRanges.length

  const handlePlayPause = () => {
    try {
      if (isPlaying) {
        tts.pause()
      } else {
        tts.play()
      }
    } catch (err) {
      console.error('TTS control error:', err)
      setIsPlaying(false)
    }
  }

  const handleSkipForward = () => {
    tts.skipForward()
  }

  const handleSkipBack = () => {
    tts.skipBack()
  }

  const handleProgressChange = (value: number[]) => {
    if (!totalChars || !value?.[0]) return
    const newIdx = Math.floor((value[0] / 100) * totalChars)
    tts.seekTo(newIdx)
  }

  const handleTextSelect = () => {
    const selection = window.getSelection()
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString().trim())
    }
  }

  const handleHighlight = async () => {
    if (!selectedText || !currentBook) return

    // Check plan-based highlight limit
    if (highlights.length >= maxHighlightsPerBook) {
      setShowUpgradeModal('highlights')
      return
    }

    const charStart = bookText.indexOf(selectedText, currentCharIndex > 100 ? currentCharIndex - 100 : 0)
    const actualStart = charStart >= 0 ? charStart : 0

    try {
      const res = await fetch('/api/highlights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: currentBook.id,
          text: selectedText,
          color: 'yellow',
          charStart: actualStart,
          charEnd: actualStart + selectedText.length,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        addHighlight(data.highlight)
      } else if (res.status === 403) {
        // Plan limit reached
        const data = await res.json()
        if (data.code === 'PLAN_LIMIT') {
          setShowUpgradeModal('highlights')
        }
      }
    } catch {
      // Fallback to local
      addHighlight({
        id: `hl-${Date.now()}`,
        bookId: currentBook.id,
        text: selectedText,
        note: '',
        color: 'yellow',
        charStart: actualStart,
        charEnd: actualStart + selectedText.length,
      })
    }
    setSelectedText('')
  }

  // Mark the currently-selected text as "no leer" — TTS will skip this range
  const handleSkipSelection = () => {
    if (!selectedText || !currentBook) return

    const charStart = bookText.indexOf(selectedText, currentCharIndex > 100 ? currentCharIndex - 100 : 0)
    const actualStart = charStart >= 0 ? charStart : 0

    addSkipRange(currentBook.id, {
      start: actualStart,
      end: actualStart + selectedText.length,
    })
    setSelectedText('')
    try { window.getSelection()?.removeAllRanges() } catch {}
  }

  const handleExplica = () => {
    // Check plan-based Explica limit (we track this loosely on frontend)
    // The real limit is enforced on the server via explicaUsed counter
    if (selectedText) {
      setExplicaText(selectedText)
    }
    setExplicaResult(null)
    setShowExplica(true)
  }

  const handleExplicaOption = async (option: typeof EXPLICA_OPTIONS[number]) => {
    const textToExplain = explicaText || selectedText
    if (!textToExplain) return

    setIsExplaining(true)
    setExplicaResult(null)

    try {
      const res = await fetch('/api/explica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToExplain,
          mode: option.mode,
          bookTitle: currentBook?.title,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setExplicaResult(data.explanation || 'No se pudo generar una explicación.')
      } else if (res.status === 403) {
        // Plan limit reached for Explica
        const data = await res.json()
        if (data.code === 'USAGE_LIMIT') {
          setShowExplica(false)
          setShowUpgradeModal('explica')
        } else {
          setExplicaResult(data.error || 'Error al obtener la explicación.')
        }
      } else {
        setExplicaResult('Error al obtener la explicación. Inténtalo de nuevo.')
      }
    } catch {
      setExplicaResult('Error de conexión. Inténtalo de nuevo.')
    } finally {
      setIsExplaining(false)
    }
  }

  // Render text efficiently - only split around current position for highlighting
  // Instead of splitting entire text into spans (crashes on large books),
  // render plain text with a highlighted window around currentCharIndex
  const renderText = () => {
    if (!bookText) return null

    // If no active reading position, just show plain text (fast)
    if (currentCharIndex === 0) {
      return <span>{bookText}</span>
    }

    // Find sentence boundaries around current position
    const windowSize = 500 // chars around current position to check for highlighting
    const before = Math.max(0, currentCharIndex - windowSize)
    const after = Math.min(bookText.length, currentCharIndex + windowSize)
    
    // Split only the window area into sentences for highlighting
    const beforeText = bookText.slice(0, before)
    const windowText = bookText.slice(before, after)
    const afterText = bookText.slice(after)
    
    const sentences = windowText.split(/(?<=[.!?])\s+/)
    let charPos = before

    return (
      <>
        {beforeText}
        {sentences.map((sentence, i) => {
          const start = charPos
          const end = charPos + sentence.length
          charPos = end + 1

          const isActive = currentCharIndex >= start && currentCharIndex < end
          const isSkipped =
            isSentenceSkipped(start, end, currentSkipRanges) ||
            (autoSkipEnabled && isNoiseSentence(sentence))

          return (
            <span
              key={i}
              id={isActive ? 'tts-active-sentence' : undefined}
              className={`${isActive ? 'highlight-active' : ''} ${isSkipped ? 'line-through opacity-40' : ''}`}
            >
              {sentence}{' '}
            </span>
          )
        })}
        {afterText}
      </>
    )
  }

  // Reusable "Omitir partes" dropdown — used in both reading-mode control bars
  const renderSkipControl = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`size-8 ${skipCount > 0 || autoSkipEnabled ? 'text-primary' : ''}`}
          aria-label="Omitir partes"
        >
          <EyeOff className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Omitir partes</span>
          {(skipCount > 0 || autoSkipEnabled) && (
            <span className="text-[10px] font-normal text-primary">
              {skipCount} manual{skipCount !== 1 ? 'es' : ''}
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {/* Auto-skip toggle — detects copyright, ISBN, page numbers, etc. */}
        <DropdownMenuItem
          onClick={() => setAutoSkipEnabled(!autoSkipEnabled)}
          className={autoSkipEnabled ? 'bg-primary/10' : ''}
        >
          <EyeOff className="size-4 mr-2 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm">Omitir texto legal</div>
            <div className="text-[10px] text-muted-foreground">Copyright, ISBN, números de página…</div>
          </div>
          {autoSkipEnabled && <Check className="size-3.5 ml-auto shrink-0" />}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {skipCount === 0 ? (
          <div className="px-2 py-3 text-center">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Selecciona texto y toca{' '}
              <span className="font-medium text-foreground">No leer</span> para omitirlo al escuchar.
            </p>
          </div>
        ) : (
          <>
            <div className="max-h-48 overflow-y-auto">
              {currentSkipRanges.map((r, i) => (
                <DropdownMenuItem key={i} className="items-start">
                  <EyeOff className="size-3.5 mr-1.5 mt-0.5 shrink-0 text-muted-foreground" />
                  <span className="flex-1 text-xs text-muted-foreground line-clamp-2">
                    {previewRange(bookText, r, 50)}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (currentBook) removeSkipRangeAt(currentBook.id, i)
                    }}
                    className="size-5 rounded flex items-center justify-center hover:bg-destructive/15 text-muted-foreground hover:text-destructive shrink-0"
                    aria-label="Quitar omisión"
                  >
                    <X className="size-3" />
                  </button>
                </DropdownMenuItem>
              ))}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => currentBook && clearSkipRangesForBook(currentBook.id)}
            >
              <Trash2 className="size-4 mr-2" />
              Limpiar todo
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const readingModeIcon = readingMode === 'visual' ? Eye : readingMode === 'audio' ? Ear : Layers
  const ReadingModeIcon = readingModeIcon

  // ─── AI Summary & Emotion Graph (Pro features) — handlers (state declared above early return) ───
  const canUseAISummary = plan === 'pro'
  const handleSummary = async () => {
    if (!currentBook) return
    if (!canUseAISummary) {
      setShowUpgradeModal('summary')
      return
    }
    setShowSummarySheet(true)
    if (summaryData) return // already loaded
    setSummaryLoading(true)
    setSummaryError(null)
    try {
      const res = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: currentBook.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.code === 'PLAN_LIMIT') {
          setShowSummarySheet(false)
          setShowUpgradeModal('summary')
          return
        }
        throw new Error(data.error || 'Error al generar el resumen')
      }
      setSummaryData(data)
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : 'Error al generar el resumen')
    } finally {
      setSummaryLoading(false)
    }
  }

  // Share the AI summary — only when summaryData is loaded
  const handleShareSummary = async () => {
    if (!summaryData || !currentBook || summarySharing) return
    setSummarySharing(true)
    const result = await shareContent(buildSummaryShareText(
      currentBook.title,
      summaryData.keyPoints,
      summaryData.quotes,
      summaryData.targetReader,
      plan as SharePlan
    ))
    setSummarySharing(false)
    const msg = result === 'copied' ? '¡Copiado al portapapeles!' : result === 'error' ? 'No se pudo compartir' : null
    if (msg) {
      setReaderToast(msg)
      setTimeout(() => setReaderToast(null), 2500)
    }
  }

  const handleEmotions = async () => {
    if (!currentBook) return
    if (!canUseAISummary) {
      setShowUpgradeModal('emotions')
      return
    }
    setShowEmotionsSheet(true)
    if (emotionsData) return
    setEmotionsLoading(true)
    setEmotionsError(null)
    try {
      const res = await fetch('/api/emotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: currentBook.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.code === 'PLAN_LIMIT') {
          setShowEmotionsSheet(false)
          setShowUpgradeModal('emotions')
          return
        }
        throw new Error(data.error || 'Error al generar el gráfico de emociones')
      }
      setEmotionsData(data)
    } catch (err) {
      setEmotionsError(err instanceof Error ? err.message : 'Error al generar el gráfico')
    } finally {
      setEmotionsLoading(false)
    }
  }

  // Calculate the bottom offset for the fixed player bar (tab bar height)
  // Tab bar is approximately 60px (py-2.5 + icon + text + border)
  const TAB_BAR_HEIGHT = 60

  return (
    <div className="flex flex-col min-h-0 h-full">
      {/* Book title + AI actions */}
      <div className="px-4 py-3 border-b shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="font-semibold text-foreground truncate">{currentBook.title}</h2>
            <p className="text-xs text-muted-foreground">{currentBook.author}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={handleSummary}
                  aria-label="Resumen IA"
                >
                  {canUseAISummary ? <BookText className="size-4" /> : <Lock className="size-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Resumen IA</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={handleEmotions}
                  aria-label="Gráfico de emociones"
                >
                  {canUseAISummary ? <Activity className="size-4" /> : <Lock className="size-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Gráfico de emociones</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* TTS Status indicators */}
      {tts.ttsStatus === 'playing' && (
        <div className="px-4 py-1.5 bg-primary/10 border-b flex items-center gap-2 shrink-0">
          <Volume2 className="size-3.5 text-primary animate-pulse" />
          <span className="text-xs text-primary font-medium">
            Leyendo en voz alta...
          </span>
          <span className="text-[10px] text-muted-foreground ml-auto">Sube el volumen 🔊</span>
        </div>
      )}

      {tts.ttsStatus === 'loading' && (
        <div className="px-4 py-1.5 bg-primary/10 border-b flex items-center gap-2 shrink-0">
          <Loader2 className="size-3.5 text-primary animate-spin" />
          <span className="text-xs text-primary font-medium">Cargando voz...</span>
        </div>
      )}

      {tts.ttsStatus === 'paused' && (
        <div className="px-4 py-1.5 bg-muted/50 border-b flex items-center gap-2 shrink-0">
          <Pause className="size-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Pausado</span>
        </div>
      )}

      {/* Sleep Timer indicator */}
      {sleepTimeLeft !== null && sleepTimer && sleepTimer > 0 && (
        <div className="px-4 py-1.5 bg-primary/5 border-b flex items-center gap-2 shrink-0">
          <Timer className="size-3.5 text-primary" />
          <span className="text-xs text-primary font-medium">
            Durmiendo en {Math.floor(sleepTimeLeft / 60)}:{(sleepTimeLeft % 60).toString().padStart(2, '0')}
          </span>
        </div>
      )}

      {/* TTS Error */}
      {tts.ttsStatus === 'error' && tts.ttsError && (
        <div className="px-4 py-2 bg-destructive/10 border-b flex items-start gap-2 shrink-0">
          <AlertTriangle className="size-3.5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="text-xs text-destructive font-medium">{tts.ttsError}</span>
            <button
              className="text-[10px] text-muted-foreground underline ml-2"
              onClick={() => { tts.stop(); tts.play(); }}
            >
              Reintentar
            </button>
          </div>
        </div>
      )}

      {/* Speech not supported warning */}
      {tts.ttsStatus === 'not-supported' && (
        <div className="px-4 py-2 bg-accent/10 border-b flex items-center gap-2 shrink-0">
          <AlertTriangle className="size-3.5 text-accent" />
          <span className="text-xs text-accent-foreground">Tu navegador no soporta lectura en voz alta</span>
        </div>
      )}

      {/* No voices available warning */}
      {speechSupported && !hasVoices && tts.ttsStatus !== 'playing' && tts.ttsStatus !== 'loading' && (
        <div className="px-4 py-2 bg-accent/10 border-b flex items-center gap-2 shrink-0">
          <AlertTriangle className="size-3.5 text-accent" />
          <span className="text-xs text-accent-foreground">Cargando voces... Si no funciona, recarga la página</span>
        </div>
      )}

      {/* Text area - fills remaining space, scrolls independently */}
      {/* Extra bottom padding to account for the fixed player bar */}
      <ScrollArea className="flex-1 min-h-0 px-4 py-4">
        {isLoadingBook ? (
          <div className="space-y-3 max-w-2xl mx-auto">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        ) : readingMode === 'audio' ? (
          /* Audio-only mode: show minimal info, no text */
          <div className="flex flex-col items-center justify-center py-20 text-center max-w-2xl mx-auto">
            <Headphones className="size-16 text-primary/30 mb-6" />
            <p className="text-muted-foreground text-lg font-medium mb-2">Modo audio</p>
            <p className="text-muted-foreground/70 text-sm mb-8">
              Toca play para escuchar{currentBook ? ` "${currentBook.title}"` : ''}
            </p>
            {currentBook && (
              <div className="text-center space-y-1">
                <p className="text-foreground font-medium">{currentBook.title}</p>
                <p className="text-sm text-muted-foreground">{currentBook.author}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {Math.floor(progressPercent)}% completado
                </p>
              </div>
            )}
          </div>
        ) : (
          <div
            className={`text-base leading-relaxed max-w-2xl mx-auto select-text ${readingMode === 'visual' ? 'pb-6' : 'pb-40'}`}
            onMouseUp={handleTextSelect}
            onTouchEnd={handleTextSelect}
          >
            {renderText()}
          </div>
        )}
      </ScrollArea>

      {/* Fixed bottom controls - always visible above tab bar */}
      <div
        className="fixed left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-t"
        style={{ bottom: `${TAB_BAR_HEIGHT}px` }}
      >
        <div className="max-w-2xl mx-auto">
          {/* Selection actions */}
          {selectedText && readingMode !== 'audio' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 px-4 py-2 border-b bg-muted/50"
            >
              <Button size="sm" variant="outline" onClick={handleHighlight}>
                <BookMarked className="size-3.5 mr-1" />
                Subrayar
              </Button>
              <Button size="sm" variant="outline" onClick={handleSkipSelection}>
                <EyeOff className="size-3.5 mr-1" />
                No leer
              </Button>
              <Button size="sm" variant="outline" onClick={handleExplica}>
                <Sparkles className="size-3.5 mr-1" />
                Explica
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto"
                onClick={() => setSelectedText('')}
              >
                <X className="size-3.5" />
              </Button>
            </motion.div>
          )}

          {/* Highlights count — clickable to open the highlights list sheet */}
          {highlights.length > 0 && (
            <button
              type="button"
              onClick={() => setShowHighlightsSheet(true)}
              className="w-full text-left px-4 py-1.5 border-b bg-muted/30 hover:bg-muted/60 transition-colors flex items-center gap-2"
            >
              <BookMarked className="size-3.5 text-primary" />
              <p className="text-xs text-muted-foreground">
                {highlights.length} subrayado{highlights.length !== 1 ? 's' : ''} en este libro
              </p>
              <ChevronRight className="size-3 text-muted-foreground ml-auto" />
            </button>
          )}

          {/* Visual mode: simplified controls (no TTS player) */}
          {readingMode === 'visual' && (
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8">
                      <ReadingModeIcon className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuLabel>Modo de lectura</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setReadingMode('visual')}>
                      <Eye className="size-4 mr-2" />
                      Visual
                      {readingMode === 'visual' && <Check className="size-3.5 ml-auto" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setReadingMode('audio')}>
                      <Ear className="size-4 mr-2" />
                      Audio
                      {readingMode === 'audio' && <Check className="size-3.5 ml-auto" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setReadingMode('both')}>
                      <Layers className="size-4 mr-2" />
                      Ambos
                      {readingMode === 'both' && <Check className="size-3.5 ml-auto" />}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {Math.floor(progressPercent)}% leído
                </span>
              </div>
              <div className="flex items-center gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`size-8 ${ambientSound ? 'text-primary' : ''}`}
                    >
                      <Volume2 className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuLabel>Sonido ambiental</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {AMBIENT_SOUNDS.map((sound) => {
                      const SoundIcon = sound.icon
                      return (
                        <DropdownMenuItem
                          key={sound.id}
                          onClick={() => setAmbientSound(sound.id)}
                          className={ambientSound === sound.id ? 'bg-primary/10' : ''}
                        >
                          <SoundIcon className="size-4 mr-2" />
                          {sound.name}
                          {ambientSound === sound.id && <Check className="size-3.5 ml-auto" />}
                        </DropdownMenuItem>
                      )
                    })}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setAmbientSound(null)}>
                      Silencio
                      {ambientSound === null && <Check className="size-3.5 ml-auto" />}
                    </DropdownMenuItem>
                    {ambientSound && (
                      <>
                        <DropdownMenuSeparator />
                        <div className="px-2 py-2">
                          <div className="flex items-center gap-2">
                            <Volume2 className="size-3.5 text-muted-foreground shrink-0" />
                            <Slider
                              value={[ambientVolume * 100]}
                              max={100}
                              step={5}
                              onValueChange={(v) => setAmbientVolume(v[0] / 100)}
                              className="flex-1"
                            />
                            <span className="text-xs text-muted-foreground w-7 text-right">
                              {Math.round(ambientVolume * 100)}%
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                {renderSkipControl()}
              </div>
            </div>
          )}

          {/* Audio/Both mode: full player controls */}
          {readingMode !== 'visual' && (
          <div className="px-4 py-3 space-y-2">
        {/* Progress slider */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-muted-foreground w-8 text-right">
            {Math.floor(progressPercent)}%
          </span>
          <Slider
            value={[progressPercent]}
            max={100}
            step={0.1}
            onValueChange={handleProgressChange}
            className="flex-1"
          />
          <span className="text-[11px] text-muted-foreground w-8">100%</span>
        </div>

        {/* Main controls - compact row */}
        <div className="flex items-center justify-between">
          {/* Left: Speed + Mode */}
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs font-mono h-8">
                  {playbackSpeed}x
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Velocidad</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(canUseAllSpeeds ? SPEED_OPTIONS : SPEED_OPTIONS_FREE).map((speed) => (
                  <DropdownMenuItem
                    key={speed}
                    onClick={() => setPlaybackSpeed(speed)}
                    className={speed === playbackSpeed ? 'bg-primary/10' : ''}
                  >
                    {speed}x
                    {speed === playbackSpeed && <Check className="size-3.5 ml-auto" />}
                  </DropdownMenuItem>
                ))}
                {!canUseAllSpeeds && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-primary"
                      onClick={() => setShowUpgradeModal('speed')}
                    >
                      <Lock className="size-3.5 mr-2" />
                      Desbloquear más velocidades
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8">
                  <ReadingModeIcon className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Modo de lectura</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setReadingMode('visual')}>
                  <Eye className="size-4 mr-2" />
                  Visual
                  {readingMode === 'visual' && <Check className="size-3.5 ml-auto" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setReadingMode('audio')}>
                  <Ear className="size-4 mr-2" />
                  Audio
                  {readingMode === 'audio' && <Check className="size-3.5 ml-auto" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setReadingMode('both')}>
                  <Layers className="size-4 mr-2" />
                  Ambos
                  {readingMode === 'both' && <Check className="size-3.5 ml-auto" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Voice profile selector — premium voice characters with preview */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label="Seleccionar voz"
                >
                  <Volume2 className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-72">
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span>Voces</span>
                  <span className="text-[10px] font-normal text-muted-foreground">
                    Plan {plan === 'free' ? 'Gratis' : plan === 'plus' ? 'Plus' : 'Pro'}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {/* Voice profile list — show profiles available for current plan + locked premium ones */}
                {VOICE_PROFILES.map((v) => {
                  const planLevel = { free: 0, plus: 1, pro: 2 }
                  const userLevel = planLevel[plan as 'free' | 'plus' | 'pro']
                  const voiceLevel = planLevel[v.plan]
                  const isLocked = voiceLevel > userLevel
                  const isSelected = selectedVoiceProfileId === v.id
                  const genderIcon = v.gender === 'female' ? '♀' : '♂'

                  if (isLocked) {
                    return (
                      <DropdownMenuItem
                        key={v.id}
                        className="text-muted-foreground"
                        onClick={(e) => {
                          e.preventDefault()
                          stopPreview()
                          setShowUpgradeModal('ia-voice')
                        }}
                      >
                        <Lock className="size-3.5 mr-1.5 shrink-0" />
                        <span className="mr-1 text-xs">{genderIcon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm flex items-center gap-1.5">
                            {v.name}
                            {v.badge && (
                              <span className="text-[9px] px-1 py-0.5 rounded bg-primary/15 text-primary font-medium">
                                {v.badge}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">{v.desc}</div>
                        </div>
                      </DropdownMenuItem>
                    )
                  }

                  return (
                    <DropdownMenuItem
                      key={v.id}
                      onClick={() => {
                        stopPreview()
                        setSelectedVoiceProfileId(v.id)
                      }}
                      className={isSelected ? 'bg-primary/10' : ''}
                    >
                      <span className="mr-1.5 text-xs shrink-0">{genderIcon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm flex items-center gap-1.5">
                          {v.name}
                          {v.badge && (
                            <span className="text-[9px] px-1 py-0.5 rounded bg-primary/15 text-primary font-medium">
                              {v.badge}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">{v.desc}</div>
                      </div>
                      {/* Preview play button — stops propagation so it doesn't close the dropdown */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          previewVoice(v.id)
                        }}
                        className="size-6 rounded-full flex items-center justify-center hover:bg-primary/20 transition-colors mr-1"
                        aria-label={`Probar voz de ${v.name}`}
                      >
                        <Play className="size-3" />
                      </button>
                      {isSelected && <Check className="size-3.5 shrink-0" />}
                    </DropdownMenuItem>
                  )
                })}

                <DropdownMenuSeparator />
                <div className="px-2 py-1.5 text-[10px] text-muted-foreground flex items-center gap-1.5">
                  <Play className="size-3" />
                  <span>Toca ▶ para probar cada voz</span>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Center: Skip Back + Play/Pause + Skip Forward */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="size-9" onClick={handleSkipBack}>
              <SkipBack className="size-4" />
            </Button>
            <Button
              size="icon"
              className="size-12 rounded-full"
              onClick={handlePlayPause}
            >
              {isPlaying ? (
                <Pause className="size-5" />
              ) : (
                <Play className="size-5 ml-0.5" />
              )}
            </Button>
            <Button variant="ghost" size="icon" className="size-9" onClick={handleSkipForward}>
              <SkipForward className="size-4" />
            </Button>
          </div>

          {/* Right: Timer + Ambient + Explica */}
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`size-8 ${sleepTimer ? 'text-primary' : ''}`}
                >
                  <Timer className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Temporizador de sueño</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {!canUseSleepTimer ? (
                  <DropdownMenuItem
                    className="text-primary"
                    onClick={() => setShowUpgradeModal('sleep')}
                  >
                    <Lock className="size-4 mr-2" />
                    Disponible en Plus y Pro
                  </DropdownMenuItem>
                ) : (<>
                {sleepTimeLeft !== null && sleepTimer && sleepTimer > 0 && (
                  <>
                    <div className="px-2 py-2 text-center">
                      <span className="text-lg font-mono font-bold text-primary">
                        {Math.floor(sleepTimeLeft / 60)}:{(sleepTimeLeft % 60).toString().padStart(2, '0')}
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">restantes</p>
                    </div>
                    <DropdownMenuSeparator />
                  </>
                )}
                {SLEEP_OPTIONS.map((min) => (
                  <DropdownMenuItem
                    key={min}
                    onClick={() => setSleepTimer(min)}
                    className={sleepTimer === min ? 'bg-primary/10' : ''}
                  >
                    {min} min
                    {sleepTimer === min && <Check className="size-3.5 ml-auto" />}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSleepTimer(null)}>
                  Desactivar
                  {sleepTimer === null && <Check className="size-3.5 ml-auto" />}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSleepTimer(-1)}
                  className={sleepTimer === -1 ? 'bg-primary/10' : ''}
                >
                  Fin de capítulo
                  {sleepTimer === -1 && <Check className="size-3.5 ml-auto" />}
                </DropdownMenuItem>
                </>)}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`size-8 ${ambientSound ? 'text-primary' : ''}`}
                >
                  <Volume2 className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>Sonido ambiental</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {AMBIENT_SOUNDS.map((sound) => {
                  const SoundIcon = sound.icon
                  return (
                    <DropdownMenuItem
                      key={sound.id}
                      onClick={() => setAmbientSound(sound.id)}
                      className={ambientSound === sound.id ? 'bg-primary/10' : ''}
                    >
                      <SoundIcon className="size-4 mr-2" />
                      {sound.name}
                      {ambientSound === sound.id && <Check className="size-3.5 ml-auto" />}
                    </DropdownMenuItem>
                  )
                })}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setAmbientSound(null)}>
                  Silencio
                  {ambientSound === null && <Check className="size-3.5 ml-auto" />}
                </DropdownMenuItem>
                {ambientSound && (
                  <>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-2">
                      <div className="flex items-center gap-2">
                        <Volume2 className="size-3.5 text-muted-foreground shrink-0" />
                        <Slider
                          value={[ambientVolume * 100]}
                          max={100}
                          step={5}
                          onValueChange={(v) => setAmbientVolume(v[0] / 100)}
                          className="flex-1"
                        />
                        <span className="text-xs text-muted-foreground w-7 text-right">
                          {Math.round(ambientVolume * 100)}%
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {renderSkipControl()}

            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => { setExplicaResult(null); setShowExplica(true) }}
            >
              <Sparkles className="size-4" />
            </Button>
          </div>
        </div>
        </div>
          )}
        </div>
      </div>

      {/* Explica Sheet */}
      <Sheet open={showExplica} onOpenChange={setShowExplica}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>BookMate Explica</SheetTitle>
            <SheetDescription>
              Selecciona una opción para entender mejor el texto
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 px-4 py-4 space-y-4">
            {/* Text input - show selected text or allow manual input */}
            {(explicaText || selectedText) ? (
              <div className="bg-muted rounded-lg p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Texto seleccionado:</p>
                <p className="text-sm text-foreground italic">
                  &ldquo;{explicaText || selectedText}&rdquo;
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Selecciona texto en el libro o escríbelo aquí:
                </p>
                <textarea
                  className="w-full h-28 rounded-lg border bg-background p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Pega o escribe el texto que quieres entender..."
                  value={explicaText}
                  onChange={(e) => setExplicaText(e.target.value)}
                />
              </div>
            )}

            {/* Explica options */}
            <div className="space-y-2">
              {EXPLICA_OPTIONS.map((option) => {
                const OptionIcon = option.icon
                const hasText = !!(explicaText || selectedText)
                return (
                  <Button
                    key={option.id}
                    variant="outline"
                    className="w-full justify-start text-left"
                    onClick={() => handleExplicaOption(option)}
                    disabled={isExplaining || !hasText}
                  >
                    <OptionIcon className="size-4 mr-2 shrink-0" />
                    {option.label}
                    <ChevronRight className="size-4 ml-auto shrink-0 text-muted-foreground" />
                  </Button>
                )
              })}
            </div>

            {/* Loading */}
            {isExplaining && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="size-6 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">Generando explicación...</span>
              </div>
            )}

            {/* Result */}
            {explicaResult && !isExplaining && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3"
              >
                <p className="text-sm text-foreground whitespace-pre-wrap">{explicaResult}</p>
              </motion.div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* ─── AI Summary Sheet ─── */}
      <Sheet open={showSummarySheet} onOpenChange={setShowSummarySheet}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <BookText className="size-4 text-primary" />
              Resumen IA
              {summaryData && !summaryLoading && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto size-8 p-0 text-muted-foreground hover:text-primary"
                  onClick={handleShareSummary}
                  disabled={summarySharing}
                  aria-label="Compartir resumen"
                >
                  {summarySharing ? <Loader2 className="size-4 animate-spin" /> : <Share2 className="size-4" />}
                </Button>
              )}
            </SheetTitle>
            <SheetDescription>
              {currentBook?.title}
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-8 space-y-5">
            {summaryLoading && (
              <div className="flex flex-col items-center gap-3 py-12">
                <Loader2 className="size-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Analizando tu libro con IA...</p>
                <p className="text-xs text-muted-foreground/70">Esto puede tardar unos segundos</p>
              </div>
            )}
            {summaryError && !summaryLoading && (
              <div className="py-8 text-center">
                <AlertTriangle className="size-8 text-accent mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">{summaryError}</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => { setSummaryData(null); handleSummary() }}>
                  Reintentar
                </Button>
              </div>
            )}
            {summaryData && !summaryLoading && (
              <>
                {/* Key points */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Zap className="size-4 text-primary" />
                    3 Ideas Clave
                  </h4>
                  <ol className="space-y-2">
                    {summaryData.keyPoints.map((point, i) => (
                      <li key={i} className="flex gap-2 text-sm text-foreground/90">
                        <span className="size-5 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span className="leading-relaxed">{point}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                {/* Quotes */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Quote className="size-4 text-primary" />
                    5 Citas Memorables
                  </h4>
                  <div className="space-y-2">
                    {summaryData.quotes.map((q, i) => (
                      <blockquote key={i} className="border-l-2 border-primary/40 pl-3 py-1 text-sm italic text-foreground/80 leading-relaxed">
                        “{q}”
                      </blockquote>
                    ))}
                  </div>
                </div>
                {/* Target reader */}
                <div className="space-y-2 p-3 rounded-lg bg-primary/5 border border-primary/15">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Smile className="size-4 text-primary" />
                    ¿Para quién es este libro?
                  </h4>
                  <p className="text-sm text-foreground/85 leading-relaxed">{summaryData.targetReader}</p>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* ─── Highlights list Sheet (with per-highlight share + delete) ─── */}
      <Sheet open={showHighlightsSheet} onOpenChange={setShowHighlightsSheet}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <BookMarked className="size-4 text-primary" />
              Subrayados
              <span className="text-xs font-normal text-muted-foreground ml-1">
                ({highlights.length})
              </span>
            </SheetTitle>
            <SheetDescription>
              {currentBook?.title}
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 px-4 pb-8 space-y-3">
            {highlights.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aún no tienes subrayados en este libro.
              </p>
            ) : (
              highlights.map((h) => (
                <div
                  key={h.id}
                  className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/40 rounded-lg p-3 space-y-2"
                >
                  <blockquote className="text-sm text-foreground/90 italic leading-relaxed">
                    &ldquo;{h.text}&rdquo;
                  </blockquote>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-primary"
                      onClick={() => handleShareHighlight(h.text)}
                      disabled={highlightSharing}
                    >
                      <Share2 className="size-3.5 mr-1" />
                      Compartir
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 ml-auto text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => removeHighlight(h.id)}
                    >
                      <Trash2 className="size-3.5 mr-1" />
                      Borrar
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* ─── Emotion Graph Sheet ─── */}
      <Sheet open={showEmotionsSheet} onOpenChange={setShowEmotionsSheet}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Activity className="size-4 text-primary" />
              Arco Emocional
            </SheetTitle>
            <SheetDescription>
              {currentBook?.title}
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-8 space-y-4">
            {emotionsLoading && (
              <div className="flex flex-col items-center gap-3 py-12">
                <Loader2 className="size-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Mapeando las emociones del libro...</p>
                <p className="text-xs text-muted-foreground/70">Esto puede tardar unos segundos</p>
              </div>
            )}
            {emotionsError && !emotionsLoading && (
              <div className="py-8 text-center">
                <AlertTriangle className="size-8 text-accent mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">{emotionsError}</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => { setEmotionsData(null); handleEmotions() }}>
                  Reintentar
                </Button>
              </div>
            )}
            {emotionsData && !emotionsLoading && (
              <EmotionGraphView emotions={emotionsData.emotions} currentCharIndex={currentCharIndex} />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* ─── Reader share feedback toast ─── */}
      <AnimatePresence>
        {readerToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed left-1/2 -translate-x-1/2 bottom-20 z-[60] bg-foreground text-background text-sm px-4 py-2 rounded-full shadow-lg"
          >
            {readerToast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Upgrade Modal ─── */}
      <AnimatePresence>
        {showUpgradeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowUpgradeModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-background rounded-2xl p-6 max-w-sm w-full shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Crown className="size-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">Mejora tu plan</h3>
                  <p className="text-sm text-muted-foreground">
                    {showUpgradeModal === 'highlights' && 'Límite de subrayados alcanzado'}
                    {showUpgradeModal === 'ambient' && 'Sonidos ambientales'}
                    {showUpgradeModal === 'sleep' && 'Temporizador de sueño'}
                    {showUpgradeModal === 'speed' && 'Velocidades avanzadas'}
                    {showUpgradeModal === 'ia-voice' && 'Voces premium'}
                    {showUpgradeModal === 'explica' && 'Límite de Explica alcanzado'}
                    {showUpgradeModal === 'books' && 'Límite de libros alcanzado'}
                    {showUpgradeModal === 'summary' && 'Resumen IA'}
                    {showUpgradeModal === 'emotions' && 'Gráfico de emociones'}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {showUpgradeModal === 'highlights' && 'Con Plus o Pro puedes hacer subrayados ilimitados en todos tus libros.'}
                {showUpgradeModal === 'ambient' && 'Relájate con lluvia, café, fogata, olas y bosque mientras lees.'}
                {showUpgradeModal === 'sleep' && 'Programa que la lectura se detenga automáticamente tras 15, 30, 45 o 60 minutos.'}
                {showUpgradeModal === 'speed' && 'Ajusta la velocidad de lectura entre 0.5x y 2x para ir a tu ritmo.'}
                {showUpgradeModal === 'ia-voice' && 'Desbloquea 6 voces premium con personalidades únicas: Sofía (cálida), Mateo (profesional), Lucía (joven), Daniel (grave), Valeria (alegre) y Andrés (pausado). Cada voz combina tono y velocidad para una experiencia de audiolibro.'}
                {showUpgradeModal === 'explica' && 'Con Plus tienes 10 Explica/mes, y con Pro son ilimitados. Explica te ayuda a entender cualquier texto.'}
                {showUpgradeModal === 'books' && 'Con Plus puedes tener hasta 20 libros, y con Pro son ilimitados. Sube todos los libros que quieras.'}
                {showUpgradeModal === 'summary' && 'Con Pro obtienes un resumen IA de cada libro: 3 ideas clave, 5 citas memorables y para quién es el libro.'}
                {showUpgradeModal === 'emotions' && 'Con Pro visualiza el arco emocional del libro: un gráfico que muestra cómo cambian las emociones capítulo a capítulo.'}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowUpgradeModal(null)}
                >
                  Después
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    setShowUpgradeModal(null)
                    store.setActiveTab('pricing')
                  }}
                >
                  <Gem className="size-4 mr-1" />
                  Ver planes
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ──────────────────────────────────────────────
// EMOTION GRAPH VIEW (used inside ReaderTab's Emotion Sheet)
// ──────────────────────────────────────────────
const EMOTION_COLORS: Record<string, string> = {
  alegría: '#10b981',
  tristeza: '#3b82f6',
  tensión: '#ef4444',
  misterio: '#8b5cf6',
  esperanza: '#f59e0b',
  miedo: '#6366f1',
  amor: '#ec4899',
  reflexión: '#14b8a6',
  acción: '#f97316',
  calma: '#22c55e',
}

function EmotionGraphView({
  emotions,
  currentCharIndex,
}: {
  emotions: Array<{ segmentIdx: number; charStart: number; charEnd: number; emotion: string; intensity: number; label: string }>
  currentCharIndex: number
}) {
  if (!emotions || emotions.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No se pudo mapear el arco emocional.</p>
  }

  const maxIntensity = 10
  const barWidth = `${100 / emotions.length}%`
  // Find the segment the user is currently reading
  const activeIdx = emotions.findIndex((e) => currentCharIndex >= e.charStart && currentCharIndex < e.charEnd)

  return (
    <div className="space-y-4">
      {/* Graph */}
      <div className="flex items-end gap-0.5 h-40 px-1">
        {emotions.map((e, i) => {
          const heightPct = (e.intensity / maxIntensity) * 100
          const color = EMOTION_COLORS[e.emotion] || '#888'
          const isActive = i === activeIdx
          return (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <div
                  className="relative rounded-t-sm transition-all cursor-pointer hover:opacity-80"
                  style={{
                    width: barWidth,
                    height: `${heightPct}%`,
                    backgroundColor: color,
                    opacity: isActive ? 1 : 0.55,
                    outline: isActive ? '2px solid currentColor' : 'none',
                  }}
                />
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <p className="font-semibold capitalize">{e.emotion}</p>
                <p className="opacity-80">{e.label}</p>
                <p className="opacity-60">Intensidad: {e.intensity}/10</p>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
      {/* X-axis hint */}
      <p className="text-[10px] text-muted-foreground text-center -mt-2">Inicio del libro → Final del libro</p>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
        {Array.from(new Set(emotions.map((e) => e.emotion))).map((emotion) => (
          <div key={emotion} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: EMOTION_COLORS[emotion] || '#888' }} />
            <span className="text-xs text-muted-foreground capitalize">{emotion}</span>
          </div>
        ))}
      </div>

      {/* Active segment detail */}
      {activeIdx >= 0 && (
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/15">
          <p className="text-xs text-muted-foreground mb-1">Estás aquí</p>
          <p className="text-sm font-medium text-foreground capitalize flex items-center gap-2">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: EMOTION_COLORS[emotions[activeIdx].emotion] || '#888' }} />
            {emotions[activeIdx].emotion} · {emotions[activeIdx].label}
          </p>
        </div>
      )}

      {/* Full list */}
      <div className="space-y-1.5">
        <h4 className="text-sm font-semibold text-foreground">Recorrido emocional</h4>
        <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
          {emotions.map((e, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 p-2 rounded-lg text-sm ${i === activeIdx ? 'bg-primary/10' : 'bg-muted/40'}`}
            >
              <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: EMOTION_COLORS[e.emotion] || '#888' }} />
              <span className="font-medium text-foreground capitalize shrink-0 w-20">{e.emotion}</span>
              <span className="text-muted-foreground truncate flex-1">{e.label}</span>
              <span className="text-xs text-muted-foreground shrink-0">{e.intensity}/10</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
// STATS TAB
// ──────────────────────────────────────────────
interface PlanLimitsData {
  plan: string
  maxBooks: number | null
  maxHighlightsPerBook: number | null
  maxExplicaPerMonth: number | null
  maxIaVoiceHoursPerMonth: number
  canUseIAVoice: boolean
  canUseAmbientSounds: boolean
  canUseSleepTimer: boolean
  canUseAllSpeeds: boolean
}

interface UsageData {
  explicaUsed: number
  iaHoursUsed: number
  ocrUsed: number
}

interface StatsData {
  totalBooks: number
  finishedBooks: number
  totalHours: number
  totalReadMin: number
  streakDays: number
  bestStreak: number
  lastReadDate: string | null
  weeklyData: { day: string; minutes: number; date: string }[]
  plan: string
  isVip: boolean
}

interface AchievementData {
  id: string
  userId: string
  type: string
  unlockedAt: string
}

function StatsTab({ isLoggedIn }: { isLoggedIn: boolean }) {
  const { streakDays, setIsVip, setUserPlan, userPlan, isVip } = useBookMateStore()
  const plan: SharePlan = isVip ? 'pro' : userPlan
  const [stats, setStats] = useState<StatsData | null>(null)
  const [achievements, setAchievements] = useState<AchievementData[]>([])
  const [newAchievements, setNewAchievements] = useState<string[]>([])
  const [planLimits, setPlanLimits] = useState<PlanLimitsData | null>(null)
  const [usageData, setUsageData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  // Reading goals state
  const [goals, setGoals] = useState<{
    dailyGoalMin: number
    weeklyGoalDays: number
    todayMinutes: number
    weekDaysRead: number
    dailyProgress: number
    weeklyProgress: number
    dailyCompleted: boolean
    weeklyCompleted: boolean
  } | null>(null)
  const [editingGoals, setEditingGoals] = useState(false)
  const [editDaily, setEditDaily] = useState(20)
  const [editWeekly, setEditWeekly] = useState(5)
  const [savingGoals, setSavingGoals] = useState(false)
  // Share feedback toast
  const [shareToast, setShareToast] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)

  const handleShareWeekly = async () => {
    if (sharing) return
    const totalMin = weeklyData.reduce((s, d) => s + (d.minutes || 0), 0)
    if (totalMin === 0) {
      showToast('Aún no hay datos de lectura esta semana')
      return
    }
    setSharing(true)
    const result = await shareContent(buildWeeklyStatsShareText(
      totalMin,
      stats?.streakDays || 0,
      stats?.totalBooks || 0,
      goals?.weekDaysRead || 0,
      plan
    ))
    setSharing(false)
    showToast(result === 'copied' ? '¡Copiado al portapapeles!' : result === 'error' ? 'No se pudo compartir' : null)
  }

  const handleShareAchievements = async () => {
    if (sharing) return
    const unlockedNames = ALL_ACHIEVEMENT_TYPES
      .filter((a) => unlockedTypes.has(a.type))
      .map((a) => a.name)
    if (unlockedNames.length === 0) {
      showToast('Aún no tienes logros desbloqueados')
      return
    }
    setSharing(true)
    const result = await shareContent(buildAchievementsShareText(
      unlockedNames,
      stats?.streakDays || 0,
      stats?.totalBooks || 0,
      plan
    ))
    setSharing(false)
    showToast(result === 'copied' ? '¡Copiado al portapapeles!' : result === 'error' ? 'No se pudo compartir' : null)
  }

  // Show a transient toast message (auto-dismiss after 2.5s)
  const showToast = (msg: string | null) => {
    setShareToast(msg)
    if (msg) setTimeout(() => setShareToast(null), 2500)
  }

  const fetchGoals = useCallback(async () => {
    try {
      const res = await fetch('/api/goals')
      if (res.ok) {
        const data = await res.json()
        setGoals(data)
        setEditDaily(data.dailyGoalMin)
        setEditWeekly(data.weeklyGoalDays)
      }
    } catch {
      // silently fail
    }
  }, [])

  useEffect(() => {
    if (!isLoggedIn) {
      setLoading(false)
      return
    }
    let cancelled = false
    const fetchStats = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/stats')
        if (res.ok && !cancelled) {
          const data = await res.json()
          setStats(data.stats || null)
          setAchievements(data.achievements || [])
          setNewAchievements(data.newAchievements || [])
          setPlanLimits(data.planLimits || null)
          setUsageData(data.usage || null)
          if (data.stats?.isVip) setIsVip(true)
          if (data.planLimits?.plan) setUserPlan(data.planLimits.plan as 'free' | 'plus' | 'pro')
          else if (data.stats?.plan) setUserPlan(data.stats.plan as 'free' | 'plus' | 'pro')
        }
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchStats()
    fetchGoals()
    return () => { cancelled = true }
  }, [setIsVip, setUserPlan, isLoggedIn, fetchGoals])

  const handleSaveGoals = async () => {
    setSavingGoals(true)
    try {
      const res = await fetch('/api/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dailyGoalMin: editDaily, weeklyGoalDays: editWeekly }),
      })
      if (res.ok) {
        const data = await res.json()
        setGoals(data)
        setEditingGoals(false)
      }
    } catch {
      // silently fail
    } finally {
      setSavingGoals(false)
    }
  }

  const weeklyData = stats?.weeklyData || []
  const maxMinutes = weeklyData.length > 0
    ? Math.max(...weeklyData.map((d) => d.minutes), 1)
    : 1

  // All possible achievement types
  const ALL_ACHIEVEMENT_TYPES = [
    { type: 'first-book', name: 'Primer Libro' },
    { type: 'ten-books', name: '10 Libros' },
    { type: 'hundred-hours', name: '100 Horas' },
    { type: 'streak-7', name: 'Racha 7 días' },
    { type: 'streak-30', name: 'Racha 30 días' },
    { type: 'nocturnal', name: 'Noctámbulo' },
    { type: 'speedster', name: 'Velocista' },
    { type: 'explorer', name: 'Explorador' },
    { type: 'finisher', name: 'Finalizador' },
    { type: 'bookworm', name: 'Ratón de biblioteca' },
  ]

  const unlockedTypes = new Set(achievements.map((a) => a.type))

  const statsCards = [
    { label: 'Total Libros', value: stats?.totalBooks ?? 0, icon: BookOpen },
    { label: 'Total Horas', value: stats?.totalHours ? Number(stats.totalHours).toFixed(1) : '0', icon: Clock },
    { label: 'Racha Actual', value: `${stats?.streakDays ?? streakDays} días`, icon: FlameIcon },
    { label: 'Mejor Racha', value: `${stats?.bestStreak ?? 0} días`, icon: Trophy },
  ]

  if (!isLoggedIn) {
    return (
      <div className="px-4 pt-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tu Actividad de Lectura</h1>
        </div>
        <Card className="py-6">
          <CardContent className="flex flex-col items-center text-center gap-4 py-4">
            <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center">
              <BarChart3 className="size-8 text-primary" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">Inicia sesión para ver tus estadísticas</p>
              <p className="text-sm text-muted-foreground mt-1">
                Lleva un registro de tu tiempo de lectura, rachas y logros
              </p>
            </div>
            <Button onClick={() => signIn('credentials', { callbackUrl: '/' })} className="mt-2">
              Iniciar sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="px-4 pt-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 pt-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tu Actividad de Lectura</h1>
      </div>

      {/* New achievements banner */}
      {newAchievements.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-accent/20 border border-accent/30 rounded-lg p-3 flex items-center gap-3"
        >
          <Trophy className="size-5 text-accent shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">¡Nuevo logro desbloqueado!</p>
            <p className="text-xs text-muted-foreground">{newAchievements.join(', ')}</p>
          </div>
        </motion.div>
      )}

      {/* Streak */}
      <Card className="py-4">
        <CardContent className="flex items-center gap-4">
          <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center">
            <FlameIcon className="size-7 text-primary" />
          </div>
          <div>
            <p className="text-3xl font-bold text-foreground">{stats?.streakDays ?? streakDays} días</p>
            <p className="text-sm text-muted-foreground">Racha actual de lectura</p>
          </div>
        </CardContent>
      </Card>

      {/* Reading Goals — free for everyone */}
      {goals && (
        <Card className="py-4">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="size-4 text-primary" />
                <CardTitle className="text-base">Metas de lectura</CardTitle>
              </div>
              {!editingGoals ? (
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setEditingGoals(true)}>
                  <Pencil className="size-3 mr-1" /> Editar
                </Button>
              ) : (
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setEditingGoals(false)} disabled={savingGoals}>
                    Cancelar
                  </Button>
                  <Button size="sm" className="h-7 px-2 text-xs" onClick={handleSaveGoals} disabled={savingGoals}>
                    {savingGoals ? <Loader2 className="size-3 animate-spin" /> : 'Guardar'}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Daily goal */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Clock className="size-3.5" />
                  Meta diaria
                </span>
                {editingGoals ? (
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      min={1}
                      max={480}
                      value={editDaily}
                      onChange={(e) => setEditDaily(Math.max(1, Math.min(480, Number(e.target.value) || 1)))}
                      className="h-7 w-16 text-right text-xs"
                    />
                    <span className="text-xs text-muted-foreground">min</span>
                  </div>
                ) : (
                  <span className="font-medium text-foreground">
                    {goals.todayMinutes} / {goals.dailyGoalMin} min
                    {goals.dailyCompleted && <CheckCircle2 className="size-3.5 text-emerald-500 inline ml-1.5" />}
                  </span>
                )}
              </div>
              {!editingGoals && (
                <Progress value={goals.dailyProgress * 100} className="h-2" />
              )}
            </div>
            {/* Weekly goal */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <CalendarCheck className="size-3.5" />
                  Meta semanal
                </span>
                {editingGoals ? (
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      min={1}
                      max={7}
                      value={editWeekly}
                      onChange={(e) => setEditWeekly(Math.max(1, Math.min(7, Number(e.target.value) || 1)))}
                      className="h-7 w-14 text-right text-xs"
                    />
                    <span className="text-xs text-muted-foreground">días</span>
                  </div>
                ) : (
                  <span className="font-medium text-foreground">
                    {goals.weekDaysRead} / {goals.weeklyGoalDays} días
                    {goals.weeklyCompleted && <CheckCircle2 className="size-3.5 text-emerald-500 inline ml-1.5" />}
                  </span>
                )}
              </div>
              {!editingGoals && (
                <div className="flex gap-1">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div
                      key={i}
                      className={`flex-1 h-2 rounded-full ${i < goals.weekDaysRead ? 'bg-primary' : 'bg-muted'}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weekly chart */}
      <Card className="py-4">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Lectura semanal</CardTitle>
              <CardDescription>Minutos leídos por día</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="size-8 p-0 text-muted-foreground hover:text-primary"
              onClick={handleShareWeekly}
              disabled={sharing}
              aria-label="Compartir semana"
            >
              {sharing ? <Loader2 className="size-4 animate-spin" /> : <Share2 className="size-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {weeklyData.length > 0 ? (
            <div className="flex items-end gap-2 h-36">
              {weeklyData.map((day, idx) => {
                const height = maxMinutes > 0 ? (day.minutes / maxMinutes) * 100 : 0
                return (
                  <div key={day.day + idx} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[11px] text-muted-foreground">
                      {day.minutes}
                    </span>
                    <div className="w-full flex items-end" style={{ height: '100px' }}>
                      <motion.div
                        className="w-full bg-primary/80 rounded-t-sm min-h-[4px]"
                        initial={{ height: 0 }}
                        animate={{ height: `${height}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut', delay: idx * 0.05 }}
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground font-medium">
                      {day.day}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-36 text-muted-foreground text-sm">
              Sin datos de lectura esta semana
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3">
        {statsCards.map((stat) => {
          const StatIcon = stat.icon
          return (
            <Card key={stat.label} className="py-4">
              <CardContent className="flex flex-col items-center text-center gap-2">
                <StatIcon className="size-6 text-primary" />
                <p className="text-lg font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Achievements */}
      <Card className="py-4">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Logros</CardTitle>
              <CardDescription>Tus insignias de lectura</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="size-8 p-0 text-muted-foreground hover:text-primary"
              onClick={handleShareAchievements}
              disabled={sharing}
              aria-label="Compartir logros"
            >
              {sharing ? <Loader2 className="size-4 animate-spin" /> : <Share2 className="size-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3">
            {ALL_ACHIEVEMENT_TYPES.map((achievement) => {
              const isUnlocked = unlockedTypes.has(achievement.type)
              const AchievementIcon = ACHIEVEMENT_ICONS[achievement.type] || Star
              return (
                <Tooltip key={achievement.type}>
                  <TooltipTrigger asChild>
                    <div
                      className={`flex flex-col items-center gap-1.5 p-2 rounded-lg transition-colors ${
                        isUnlocked
                          ? 'bg-primary/10 cursor-default'
                          : 'bg-muted/50 opacity-40 cursor-default'
                      }`}
                    >
                      <div
                        className={`size-10 rounded-full flex items-center justify-center ${
                          isUnlocked
                            ? 'bg-primary/20 text-primary'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {isUnlocked ? (
                          <AchievementIcon className="size-5" />
                        ) : (
                          <Lock className="size-4" />
                        )}
                      </div>
                      <span
                        className={`text-[10px] text-center leading-tight ${
                          isUnlocked ? 'text-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        {achievement.name}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {achievement.name}
                    {isUnlocked ? ' - Desbloqueado' : ' - Bloqueado'}
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Plan & Usage */}
      {planLimits && (
        <Card className="py-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                {planLimits.plan === 'pro' ? (
                  <Crown className="size-5 text-primary" />
                ) : planLimits.plan === 'plus' ? (
                  <Gem className="size-5 text-primary" />
                ) : (
                  <Star className="size-5 text-muted-foreground" />
                )}
                Plan {planLimits.plan === 'free' ? 'Gratis' : planLimits.plan === 'plus' ? 'Plus' : 'Pro'}
              </CardTitle>
              {planLimits.plan === 'free' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 gap-1"
                  onClick={() => {
                    const pricingTab = document.querySelector('[data-tab="pricing"]') as HTMLButtonElement
                    if (pricingTab) pricingTab.click()
                  }}
                >
                  <Gem className="size-3" />
                  Mejorar plan
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Explica usage */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Explica</span>
              </div>
              <span className="text-sm font-medium">
                {usageData ? `${usageData.explicaUsed}` : '0'}
                {planLimits.maxExplicaPerMonth ? ` de ${planLimits.maxExplicaPerMonth}` : ''}
                {' '}usados este mes
              </span>
            </div>

            {/* Voice profiles info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="size-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Voces disponibles</span>
              </div>
              <span className="text-sm font-medium">
                {plan === 'free' ? '2 básicas' : plan === 'plus' ? '6 personajes' : '8 personajes'}
              </span>
            </div>

            {/* Books limit */}
            {planLimits.maxBooks !== null && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="size-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Libros</span>
                </div>
                <span className="text-sm font-medium">
                  {stats?.totalBooks ?? 0} de {planLimits.maxBooks}
                </span>
              </div>
            )}

            {/* Highlights limit */}
            {planLimits.maxHighlightsPerBook !== null && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookMarked className="size-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Resaltados/libro</span>
                </div>
                <span className="text-sm font-medium">
                  {planLimits.maxHighlightsPerBook}
                </span>
              </div>
            )}

            {/* Feature flags summary */}
            <div className="pt-2 border-t">
              <div className="flex flex-wrap gap-2">
                {planLimits.canUseAmbientSounds && (
                  <Badge variant="secondary" className="text-[10px] gap-1">
                    <Waves className="size-3" /> Sonidos
                  </Badge>
                )}
                {planLimits.canUseSleepTimer && (
                  <Badge variant="secondary" className="text-[10px] gap-1">
                    <Timer className="size-3" /> Timer
                  </Badge>
                )}
                {planLimits.canUseAllSpeeds && (
                  <Badge variant="secondary" className="text-[10px] gap-1">
                    <Zap className="size-3" /> Velocidades
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Share feedback toast */}
      <AnimatePresence>
        {shareToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed left-1/2 -translate-x-1/2 bottom-20 z-50 bg-foreground text-background text-sm px-4 py-2 rounded-full shadow-lg"
          >
            {shareToast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ──────────────────────────────────────────────
// PRICING TAB
// ──────────────────────────────────────────────
function PricingTab() {
  const { data: session } = useSession()
  const {
    userPlan,
    setUserPlan,
    isVip,
    setIsVip,
    isAdminPanelOpen,
    setIsAdminPanelOpen,
    adminTapCount,
    incrementAdminTap,
    resetAdminTap,
  } = useBookMateStore()

  const [isAnnual, setIsAnnual] = useState(false)
  const [switchingPlan, setSwitchingPlan] = useState(false)
  const [vipEmails, setVipEmails] = useState<{ id: string; email: string; createdAt: string }[]>([])
  const [newVipEmail, setNewVipEmail] = useState('')
  const [addingVip, setAddingVip] = useState(false)
  const [currentEmail, setCurrentEmail] = useState('')

  // Load current user plan from session
  useEffect(() => {
    if (session?.user) {
      setUserPlan(session.user.plan || 'free')
      setIsVip(session.user.isVip || false)
      setCurrentEmail(session.user.email || '')
    }
  }, [session, setUserPlan, setIsVip])

  // Also fetch fresh data from /api/auth/me for latest plan info
  useEffect(() => {
    const loadPlan = async () => {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          if (data.user) {
            setUserPlan(data.user.plan || 'free')
            setIsVip(data.user.isVip || false)
            setCurrentEmail(data.user.email || '')
          }
        }
      } catch {
        // silently fail
      }
    }
    loadPlan()
  }, [setUserPlan, setIsVip])

  // Load VIP emails when admin panel opens
  useEffect(() => {
    if (isAdminPanelOpen) {
      const loadVipEmails = async () => {
        try {
          const res = await fetch('/api/vip')
          if (res.ok) {
            const data = await res.json()
            setVipEmails(data.vipEmails || [])
          }
        } catch {
          // silently fail
        }
      }
      loadVipEmails()
    }
  }, [isAdminPanelOpen])

  const handleSwitchPlan = useCallback(async (plan: 'free' | 'plus' | 'pro') => {
    if (plan === 'free') {
      // Downgrade to free - just update via API
      setSwitchingPlan(true)
      try {
        const res = await fetch('/api/plan', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan }),
        })
        if (res.ok) {
          const data = await res.json()
          setUserPlan(data.plan)
          setIsVip(data.isVip || false)
        }
      } catch {
        // silently fail
      } finally {
        setSwitchingPlan(false)
      }
      return
    }

    // For Plus or Pro — redirect to Lemon Squeezy Checkout
    setSwitchingPlan(true)
    try {
      const res = await fetch('/api/lemonsqueezy/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan, isAnnual }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.url) {
          // Redirect to Lemon Squeezy Checkout
          window.location.href = data.url
          return
        }
      }
      // If Lemon Squeezy is not configured, fall back to direct plan switch (for testing)
      const fallbackRes = await fetch('/api/plan', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      if (fallbackRes.ok) {
        const data = await fallbackRes.json()
        setUserPlan(data.plan)
        setIsVip(data.isVip || false)
      }
    } catch {
      // silently fail
    } finally {
      setSwitchingPlan(false)
    }
  }, [setUserPlan, setIsVip, isAnnual])

  const handleAddVip = useCallback(async () => {
    if (!newVipEmail.trim()) return
    setAddingVip(true)
    try {
      const res = await fetch('/api/vip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newVipEmail.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.vip) {
          setVipEmails((prev) => [data.vip, ...prev])
        }
        setNewVipEmail('')
      }
    } catch {
      // silently fail
    } finally {
      setAddingVip(false)
    }
  }, [newVipEmail])

  const handleRemoveVip = useCallback(async (email: string) => {
    try {
      const res = await fetch('/api/vip', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        setVipEmails((prev) => prev.filter((v) => v.email !== email))
      }
    } catch {
      // silently fail
    }
  }, [])

  const handleVersionTap = useCallback(() => {
    incrementAdminTap()
    if (adminTapCount + 1 >= 7) {
      setIsAdminPanelOpen(true)
      resetAdminTap()
    }
  }, [adminTapCount, incrementAdminTap, setIsAdminPanelOpen, resetAdminTap])

  const planLabel = userPlan === 'pro' ? 'Pro' : userPlan === 'plus' ? 'Plus' : 'Gratis'
  const planColor = userPlan === 'pro' ? 'bg-primary text-primary-foreground' : userPlan === 'plus' ? 'bg-accent text-accent-foreground' : 'bg-secondary text-secondary-foreground'

  const plans = [
    {
      id: 'free' as const,
      name: 'Gratis',
      price: '$0',
      period: '',
      features: [
        'Hasta 3 libros',
        '2 voces básicas (masc. y fem.)',
        'Sonidos ambientales',
        '5 subrayados por libro',
        'Racha de lectura diaria',
        '5 Explica/mes',
        'Velocidad 1x',
      ],
    },
    {
      id: 'plus' as const,
      name: 'Plus',
      price: isAnnual ? '$99.99' : '$12.99',
      period: isAnnual ? '/año' : '/mes',
      annualMonthly: '$8.33/mes',
      popular: true,
      features: [
        'Hasta 20 libros',
        '6 voces premium con personalidad',
        'Probar voces antes de elegir',
        'Subrayados ilimitados',
        '10 Explica/mes',
        'Temporizador de sueño',
        'Velocidades 0.5x a 2x',
        'Sonidos ambientales premium',
        'Metas de lectura',
        'Palabra del día',
      ],
    },
    {
      id: 'pro' as const,
      name: 'Pro',
      price: isAnnual ? '$129.99' : '$17.99',
      period: isAnnual ? '/año' : '/mes',
      annualMonthly: '$10.83/mes',
      features: [
        'Libros ilimitados',
        '8 voces premium (incl. narrador de audiolibros)',
        'Explica ilimitado + en voz alta',
        'Resumen IA del libro (3 ideas + 5 citas)',
        'Gráfico de emociones por capítulo',
        'OCR escáner (1 libro/mes)',
        'Filtrar qué se lee',
        '"Tu Año en Libros" anticipado',
        'Soporte prioritario',
      ],
    },
  ]

  return (
    <div className="px-4 pt-6 pb-8">
      {/* ── PROFILE SECTION ── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Mi Perfil</h1>
        <p className="text-muted-foreground text-sm mt-1">Gestiona tu plan y cuenta</p>
      </div>

      {/* Current Plan Card */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
              {isVip ? (
                <Crown className="size-6 text-primary" />
              ) : (
                <User className="size-6 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-foreground">{currentEmail}</p>
                {isVip && (
                  <Badge className="bg-primary text-primary-foreground gap-1">
                    <Crown className="size-3" />
                    VIP
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={planColor}>{planLabel}</Badge>
                {userPlan !== 'free' && !isVip && (
                  <span className="text-xs text-muted-foreground">Activo</span>
                )}
                {isVip && (
                  <span className="text-xs text-primary font-medium">Acceso ilimitado gratis</span>
                )}
              </div>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => signOut({ callbackUrl: '/' })}
                >
                  <LogOut className="size-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Cerrar sesión</TooltipContent>
            </Tooltip>
          </div>
        </CardContent>
      </Card>

      {/* Plan Switcher (for testing) */}
      <Card className="mb-6 border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings className="size-4" />
            Cambiar Plan (Prueba)
          </CardTitle>
          <CardDescription className="text-xs">
            Cambia entre planes para probar todas las funciones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {(['free', 'plus', 'pro'] as const).map((plan) => (
              <Button
                key={plan}
                variant={userPlan === plan ? 'default' : 'outline'}
                size="sm"
                className="flex-1 capitalize"
                onClick={() => handleSwitchPlan(plan)}
                disabled={switchingPlan}
              >
                {switchingPlan ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  plan === 'free' ? 'Gratis' : plan === 'plus' ? 'Plus' : 'Pro'
                )}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── PRICING SECTION ── */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-foreground mb-1">Elige tu plan</h2>
        <p className="text-muted-foreground text-sm">Desbloquea el potencial completo de BookMate</p>
      </div>

      {/* Annual toggle - Segmented Control */}
      <div className="flex items-center justify-center mb-6">
        <div className="inline-flex bg-muted rounded-lg p-1 gap-1">
          <button
            onClick={() => setIsAnnual(false)}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${
              !isAnnual
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Mensual
          </button>
          <button
            onClick={() => setIsAnnual(true)}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
              isAnnual
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Anual
            <Badge className="bg-primary/10 text-primary border-0 text-[10px] px-1.5 py-0">-36%</Badge>
          </button>
        </div>
      </div>

      {/* Plan cards */}
      <div className="space-y-4">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.3 }}
          >
            <Card className={`relative overflow-hidden ${userPlan === plan.id ? 'ring-2 ring-primary' : ''} ${plan.popular ? 'border-primary' : ''}`}>
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-bl-lg">
                  POPULAR
                </div>
              )}
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  {plan.name}
                  {userPlan === plan.id && (
                    <Badge className="bg-primary/10 text-primary border-0 text-[10px]">Actual</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  <span className="text-2xl font-bold text-foreground">{plan.price}</span>
                  {plan.period && (
                    <span className="text-muted-foreground text-sm">{plan.period}</span>
                  )}
                  {'annualMonthly' in plan && plan.annualMonthly && isAnnual && (
                    <span className="text-primary text-sm font-medium ml-2">{plan.annualMonthly}</span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="size-3.5 text-primary shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                {userPlan === plan.id ? (
                  <Button variant="outline" className="w-full" disabled>
                    Plan actual
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant={plan.popular ? 'default' : 'outline'}
                    onClick={() => handleSwitchPlan(plan.id)}
                    disabled={switchingPlan}
                  >
                    {switchingPlan ? <Loader2 className="size-4 animate-spin" /> :
                      plan.id === 'free' ? 'Cambiar a Gratis' :
                      `Suscribirse a ${plan.name}`
                    }
                  </Button>
                )}
              </CardFooter>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* ── APP VERSION (secret admin entry point) ── */}
      <div className="mt-8 text-center">
        <button
          onClick={handleVersionTap}
          className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          Versión de la app: 1.0.0
          {adminTapCount > 0 && adminTapCount < 7 && (
            <span className="ml-1 text-primary/50">({7 - adminTapCount} más...)</span>
          )}
        </button>
      </div>

      {/* ── SECRET ADMIN PANEL ── */}
      <Dialog open={isAdminPanelOpen} onOpenChange={setIsAdminPanelOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="size-5 text-primary" />
              Panel de Administración
            </DialogTitle>
            <DialogDescription>
              Gestiona usuarios VIP y configuraciones de BookMate
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Add VIP email */}
            <div>
              <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                <Mail className="size-4" />
                Emails VIP — Acceso Ilimitado Gratis
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                Los usuarios VIP tienen acceso Pro gratis. Útil para familia y testing.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="email@ejemplo.com"
                  value={newVipEmail}
                  onChange={(e) => setNewVipEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddVip()}
                  type="email"
                  className="flex-1"
                />
                <Button onClick={handleAddVip} disabled={addingVip || !newVipEmail.trim()} size="sm">
                  {addingVip ? <Loader2 className="size-4 animate-spin" /> : 'Agregar'}
                </Button>
              </div>
            </div>

            {/* VIP list */}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                Emails VIP ({vipEmails.length})
              </h4>
              {vipEmails.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No hay emails VIP configurados
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {vipEmails.map((vip) => (
                    <div
                      key={vip.id}
                      className="flex items-center gap-2 p-2 rounded-md bg-muted/50"
                    >
                      <Mail className="size-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm text-foreground truncate flex-1">{vip.email}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 shrink-0 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveVip(vip.email)}
                        aria-label="Eliminar VIP"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick actions */}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                Acciones rápidas
              </h4>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={async () => {
                    await handleSwitchPlan('pro')
                    setIsVip(true)
                  }}
                >
                  <Crown className="size-4 mr-2" />
                  Activar modo VIP para mí
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={async () => {
                    await handleSwitchPlan('free')
                    setIsVip(false)
                  }}
                >
                  <User className="size-4 mr-2" />
                  Volver a plan Gratis
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
