'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from 'next-themes'
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
} from 'lucide-react'

import { useBookMateStore, type BookItem, type TabType, type HighlightItem } from '@/lib/store'
import { BookMateLogo } from '@/components/bookmate-logo'
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
  const {
    activeTab,
    setActiveTab,
    isDarkMode,
    setIsDarkMode,
  } = useBookMateStore()

  const { setTheme } = useTheme()
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-200 dark:bg-gray-900 md:bg-gray-200">
      {/* Phone frame wrapper - on desktop shows as phone, on actual phone fills screen */}
      <div className="w-full max-w-[430px] h-[100dvh] md:h-[844px] md:my-4 md:rounded-[2.5rem] md:shadow-2xl md:border-[8px] md:border-gray-800 md:overflow-hidden relative bg-background flex flex-col">
        {/* Status bar (only visible in phone frame mode on desktop) */}
        <div className="hidden md:flex items-center justify-between px-6 py-1.5 bg-background/90 text-[11px] text-foreground/70 font-medium">
          <span>9:41</span>
          <div className="flex items-center gap-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1"/></svg>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="6" width="18" height="12" rx="2"/><path d="M23 13v-2"/></svg>
          </div>
        </div>

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
        <main className="flex-1 pb-20 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'library' && <LibraryTab />}
              {activeTab === 'reader' && <ReaderTab />}
              {activeTab === 'stats' && <StatsTab />}
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
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const filteredBooks = books.filter(
    (b) =>
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.author.toLowerCase().includes(searchQuery.toLowerCase())
  )

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

      const formData = new FormData()
      formData.append('file', file)

      try {
        const res = await fetch('/api/books/upload', {
          method: 'POST',
          body: formData,
        })

        if (res.ok) {
          const data = await res.json()

          if (data.duplicate) {
            // Show duplicate dialog
            setDuplicateInfo({
              duplicate: true,
              matchType: data.matchType,
              existingBook: data.existingBook,
              message: data.message,
            })
          } else {
            // New book created successfully
            addBook(data.book)
            setUploadOpen(false)
          }
        }
      } catch {
        // Error handled silently
      } finally {
        setIsUploading(false)
        // Reset file input
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
    // Re-upload with force flag
    const fileInput = fileInputRef.current
    if (!fileInput?.files?.[0]) {
      setDuplicateInfo(null)
      return
    }

    setIsUploading(true)
    const formData = new FormData()
    formData.append('file', fileInput.files[0])
    formData.append('force', 'true')

    try {
      const res = await fetch('/api/books/upload', {
        method: 'POST',
        body: formData,
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Mi Biblioteca</h1>
        <p className="text-muted-foreground text-sm mt-1">Tus libros, tu ritmo</p>
      </div>

      {/* Search + View Toggle */}
      <div className="flex items-center gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar libro o autor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
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
    sleepTimer,
    setSleepTimer,
    showExplica,
    setShowExplica,
    explicaText,
    setExplicaText,
    highlights,
    setHighlights,
    addHighlight,
    isExplaining,
    setIsExplaining,
    isLoadingBook,
    setIsLoadingBook,
  } = store

  const [explicaResult, setExplicaResult] = useState<string | null>(null)
  const [selectedText, setSelectedText] = useState('')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  const totalChars = bookText.length
  const progressPercent = totalChars > 0 ? (currentCharIndex / totalChars) * 100 : 0

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const handleSkipForward = () => {
    const skip = Math.max(Math.floor(totalChars * (10 / 120)), 200)
    const newIdx = Math.min(currentCharIndex + skip, totalChars)
    setCurrentCharIndex(newIdx)
  }

  const handleSkipBack = () => {
    const skip = Math.max(Math.floor(totalChars * (10 / 120)), 200)
    const newIdx = Math.max(currentCharIndex - skip, 0)
    setCurrentCharIndex(newIdx)
  }

  const handleProgressChange = (value: number[]) => {
    const newIdx = Math.floor((value[0] / 100) * totalChars)
    setCurrentCharIndex(newIdx)
  }

  const handleTextSelect = () => {
    const selection = window.getSelection()
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString().trim())
    }
  }

  const handleHighlight = async () => {
    if (!selectedText || !currentBook) return

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

  const handleExplica = () => {
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
      } else {
        setExplicaResult('Error al obtener la explicación. Inténtalo de nuevo.')
      }
    } catch {
      setExplicaResult('Error de conexión. Inténtalo de nuevo.')
    } finally {
      setIsExplaining(false)
    }
  }

  // Split text into sentences for rendering with highlighting
  const renderText = () => {
    if (!bookText) return null

    const sentences = bookText.split(/(?<=[.!?])\s+/)
    let charPos = 0

    return sentences.map((sentence, i) => {
      const start = charPos
      const end = charPos + sentence.length
      charPos = end + 1

      const isActive = currentCharIndex >= start && currentCharIndex < end

      return (
        <span
          key={i}
          className={isActive ? 'highlight-active' : ''}
        >
          {sentence}{' '}
        </span>
      )
    })
  }

  const readingModeIcon = readingMode === 'visual' ? Eye : readingMode === 'audio' ? Ear : Layers
  const ReadingModeIcon = readingModeIcon

  return (
    <div className="flex flex-col h-[calc(100dvh-10rem)]">
      {/* Book title */}
      <div className="px-4 py-3 border-b">
        <h2 className="font-semibold text-foreground truncate">{currentBook.title}</h2>
        <p className="text-xs text-muted-foreground">{currentBook.author}</p>
      </div>

      {/* Text area */}
      <ScrollArea className="flex-1 px-4 py-4">
        {isLoadingBook ? (
          <div className="space-y-3 max-w-2xl mx-auto">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        ) : (
          <div
            className="text-base leading-relaxed text-foreground/90 max-w-2xl mx-auto select-text"
            onMouseUp={handleTextSelect}
            onTouchEnd={handleTextSelect}
          >
            {renderText()}
          </div>
        )}
      </ScrollArea>

      {/* Selection actions */}
      {selectedText && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 px-4 py-2 border-t bg-muted/50"
        >
          <Button size="sm" variant="outline" onClick={handleHighlight}>
            <BookMarked className="size-3.5 mr-1" />
            Subrayar
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

      {/* Highlights count */}
      {highlights.length > 0 && (
        <div className="px-4 py-1.5 border-t bg-muted/30">
          <p className="text-xs text-muted-foreground">
            {highlights.length} subrayado{highlights.length !== 1 ? 's' : ''} en este libro
          </p>
        </div>
      )}

      {/* Player bar */}
      <div className="border-t bg-background/95 backdrop-blur-sm px-4 py-3 space-y-3">
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

        {/* Controls */}
        <div className="flex items-center justify-between">
          {/* Left controls */}
          <div className="flex items-center gap-1">
            {/* Speed */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs font-mono">
                  {playbackSpeed}x
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Velocidad</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {SPEED_OPTIONS.map((speed) => (
                  <DropdownMenuItem
                    key={speed}
                    onClick={() => setPlaybackSpeed(speed)}
                    className={speed === playbackSpeed ? 'bg-primary/10' : ''}
                  >
                    {speed}x
                    {speed === playbackSpeed && <Check className="size-3.5 ml-auto" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Reading mode */}
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

          {/* Center controls */}
          <div className="flex items-center gap-2">
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

          {/* Right controls */}
          <div className="flex items-center gap-1">
            {/* Sleep timer */}
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
                <DropdownMenuLabel>Temporizador</DropdownMenuLabel>
                <DropdownMenuSeparator />
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
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Ambient sound */}
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
              <DropdownMenuContent align="end">
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
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Explica */}
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
            {/* Selected text */}
            {(explicaText || selectedText) && (
              <div className="bg-muted rounded-lg p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Texto seleccionado:</p>
                <p className="text-sm text-foreground italic">
                  &ldquo;{explicaText || selectedText}&rdquo;
                </p>
              </div>
            )}

            {/* Explica options */}
            <div className="space-y-2">
              {EXPLICA_OPTIONS.map((option) => {
                const OptionIcon = option.icon
                return (
                  <Button
                    key={option.id}
                    variant="outline"
                    className="w-full justify-start text-left"
                    onClick={() => handleExplicaOption(option)}
                    disabled={isExplaining}
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
    </div>
  )
}

// ──────────────────────────────────────────────
// STATS TAB
// ──────────────────────────────────────────────
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

function StatsTab() {
  const { streakDays, setIsVip, setUserPlan } = useBookMateStore()
  const [stats, setStats] = useState<StatsData | null>(null)
  const [achievements, setAchievements] = useState<AchievementData[]>([])
  const [newAchievements, setNewAchievements] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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
          if (data.stats?.isVip) setIsVip(true)
          if (data.stats?.plan) setUserPlan(data.stats.plan as 'free' | 'plus' | 'pro')
        }
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchStats()
    return () => { cancelled = true }
  }, [setIsVip, setUserPlan])

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

      {/* Weekly chart */}
      <Card className="py-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Lectura semanal</CardTitle>
          <CardDescription>Minutos leídos por día</CardDescription>
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
          <CardTitle className="text-base">Logros</CardTitle>
          <CardDescription>Tus insignias de lectura</CardDescription>
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
    </div>
  )
}

// ──────────────────────────────────────────────
// PRICING TAB
// ──────────────────────────────────────────────
function PricingTab() {
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
  const [currentEmail, setCurrentEmail] = useState('demo@bookmate.app')

  // Load current user plan on mount
  useEffect(() => {
    const loadPlan = async () => {
      try {
        const res = await fetch('/api/stats')
        if (res.ok) {
          const data = await res.json()
          if (data.user) {
            setUserPlan(data.user.plan || 'free')
            setIsVip(data.user.isVip || false)
            setCurrentEmail(data.user.email || 'demo@bookmate.app')
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
  }, [setUserPlan, setIsVip])

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
        '3 libros máximo',
        'Voz Google TTS',
        'Lectura visual ilimitada',
        '5 Explica/mes',
        'Velocidad 1x',
      ],
    },
    {
      id: 'plus' as const,
      name: 'Plus',
      price: isAnnual ? '$9.99' : '$12.99',
      period: isAnnual ? '/año' : '/mes',
      popular: true,
      features: [
        'Libros ilimitados',
        'Voz OpenAI TTS',
        'Todos los sonidos ambientales',
        '50 Explica/mes',
        'Velocidad hasta 2x',
        'Subrayados ilimitados',
      ],
    },
    {
      id: 'pro' as const,
      name: 'Pro',
      price: isAnnual ? '$14.99' : '$17.99',
      period: isAnnual ? '/año' : '/mes',
      features: [
        'Todo de Plus',
        'OCR Scanner (cámara)',
        'Explica ilimitado',
        'Prioridad en nuevas funciones',
        'Soporte prioritario',
        'Exportar notas',
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

      {/* Annual toggle */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <span className={`text-sm ${!isAnnual ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
          Mensual
        </span>
        <button
          onClick={() => setIsAnnual(!isAnnual)}
          className={`relative w-11 h-6 rounded-full transition-colors ${isAnnual ? 'bg-primary' : 'bg-muted'}`}
          aria-label={isAnnual ? 'Cambiar a mensual' : 'Cambiar a anual'}
        >
          <span
            className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white transition-transform ${isAnnual ? 'translate-x-5' : ''}`}
          />
        </button>
        <span className={`text-sm ${isAnnual ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
          Anual
          <Badge className="ml-1.5 bg-primary/10 text-primary border-0 text-[10px] px-1.5 py-0">-23%</Badge>
        </span>
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
                    {switchingPlan ? <Loader2 className="size-4 animate-spin" /> : 'Cambiar a este plan'}
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
