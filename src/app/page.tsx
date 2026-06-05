'use client'

import { useState, useRef, useCallback } from 'react'
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
} from 'lucide-react'

import { useBookMateStore, type BookItem, type TabType } from '@/lib/store'
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
} from '@/components/ui/dialog'
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

// ──────────────────────────────────────────────
// Demo Books
// ──────────────────────────────────────────────
const DEMO_BOOKS: BookItem[] = [
  {
    id: 'demo-1',
    title: 'El Principito',
    author: 'Antoine de Saint-Exupery',
    fileName: 'el-principito.pdf',
    coverColor: 'teal',
    totalPages: 96,
    currentPage: 42,
    totalChars: 45000,
    readChars: 18900,
    estimatedMin: 45,
    isFinished: false,
    language: 'es',
    createdAt: '2026-01-15',
  },
  {
    id: 'demo-2',
    title: 'Habitos Atomicos',
    author: 'James Clear',
    fileName: 'habitos-atomicos.pdf',
    coverColor: 'amber',
    totalPages: 320,
    currentPage: 180,
    totalChars: 280000,
    readChars: 157500,
    estimatedMin: 120,
    isFinished: false,
    language: 'es',
    createdAt: '2026-02-01',
  },
  {
    id: 'demo-3',
    title: 'El Alquimista',
    author: 'Paulo Coelho',
    fileName: 'el-alquimista.pdf',
    coverColor: 'rose',
    totalPages: 192,
    currentPage: 192,
    totalChars: 120000,
    readChars: 120000,
    estimatedMin: 0,
    isFinished: true,
    language: 'es',
    createdAt: '2025-12-20',
  },
  {
    id: 'demo-4',
    title: 'Pensar Rapido, Pensar Despacio',
    author: 'Daniel Kahneman',
    fileName: 'pensar-rapido.pdf',
    coverColor: 'violet',
    totalPages: 416,
    currentPage: 80,
    totalChars: 380000,
    readChars: 73000,
    estimatedMin: 200,
    isFinished: false,
    language: 'es',
    createdAt: '2026-03-01',
  },
  {
    id: 'demo-5',
    title: 'El Poder del Ahora',
    author: 'Eckhart Tolle',
    fileName: 'poder-del-ahora.pdf',
    coverColor: 'emerald',
    totalPages: 236,
    currentPage: 0,
    totalChars: 195000,
    readChars: 0,
    estimatedMin: 195,
    isFinished: false,
    language: 'es',
    createdAt: '2026-03-03',
  },
]

// ──────────────────────────────────────────────
// Cover Color Map
// ──────────────────────────────────────────────
const COVER_GRADIENTS: Record<string, string> = {
  teal: 'from-teal-400 to-teal-700',
  amber: 'from-amber-400 to-amber-700',
  rose: 'from-rose-400 to-rose-700',
  violet: 'from-violet-400 to-violet-700',
  emerald: 'from-emerald-400 to-emerald-700',
  blue: 'from-blue-400 to-blue-700',
  orange: 'from-orange-400 to-orange-700',
  cyan: 'from-cyan-400 to-cyan-700',
}

// ──────────────────────────────────────────────
// Demo text for reader
// ──────────────────────────────────────────────
const DEMO_TEXT = `Capitulo 1

Cuando el avion se averio, el mecánico del aeródromo murmuro que era imposible encontrar un mecánico o los repuestos necesarios en pleno Sahara. Tenia que conformarse con la situacion y tratar de sobrevivir.

Fue asi como, a la mañana siguiente, me desperto una voz extraña. Venia de un hombrecito que me miraba con los ojos muy abiertos.

—Por favor... dibujame un cordero!

—Como?

—Dibujame un cordero...

Habia aterrizado en el desierto del Sahara, a mil millas de cualquier habitacion humana. Y sin embargo, aquel hombrecito no parecia ni perdido, ni medio muerto de sed, de hambre o de miedo. No tenia el aspecto de un niño perdido en el desierto.

Cuando por fin pude hablar, le dije:

—Pero... que haces tu aqui?

Y el repitio, como si se tratara de algo muy serio:

—Por favor... dibujame un cordero.

La historia del principito es una de las mas bellas jamas escritas. Narra el encuentro de un aviador perdido en el desierto con un pequeño principe venido de un asteroide.

El principito le cuenta al aviador sobre su planeta, sobre su flor, sobre sus viajes por diferentes asteroides donde encontro personajes singulares: un rey, un vanidoso, un borracho, un hombre de negocios, un farolero y un geografo.

Cada uno de estos personajes representa un aspecto de la naturaleza humana que el autor critica con delicadeza y sabiduria. La soledad, la ambicion, la vanidad, el conformismo.

Es un libro que, aunque parece escrito para niños, contiene profundos mensajes para los adultos. Nos recuerda lo esencial es invisible a los ojos.`

// ──────────────────────────────────────────────
// Weekly data for stats
// ──────────────────────────────────────────────
const WEEKLY_DATA = [
  { day: 'Lun', minutes: 45 },
  { day: 'Mar', minutes: 30 },
  { day: 'Mie', minutes: 60 },
  { day: 'Jue', minutes: 15 },
  { day: 'Vie', minutes: 50 },
  { day: 'Sab', minutes: 75 },
  { day: 'Dom', minutes: 40 },
]

// ──────────────────────────────────────────────
// Achievements
// ──────────────────────────────────────────────
const ACHIEVEMENTS = [
  { id: 'first-book', name: 'Primer Libro', icon: BookMarked, unlocked: true },
  { id: 'ten-books', name: '10 Libros', icon: BookOpen, unlocked: false },
  { id: 'hundred-hours', name: '100 Horas', icon: Clock, unlocked: false },
  { id: 'streak-7', name: 'Racha 7 dias', icon: FlameIcon, unlocked: true },
  { id: 'streak-30', name: 'Racha 30 dias', icon: Trophy, unlocked: false },
  { id: 'nocturnal', name: 'Noctambulo', icon: Moon, unlocked: true },
  { id: 'speedster', name: 'Velocista', icon: Zap, unlocked: false },
  { id: 'explorer', name: 'Explorador', icon: Globe, unlocked: false },
]

// ──────────────────────────────────────────────
// Ambient sounds config
// ──────────────────────────────────────────────
const AMBIENT_SOUNDS = [
  { id: 'rain', name: 'Lluvia', icon: CloudRain },
  { id: 'cafe', name: 'Cafe', icon: Coffee },
  { id: 'fire', name: 'Fogata', icon: Flame },
  { id: 'waves', name: 'Olas', icon: Waves },
  { id: 'forest', name: 'Bosque', icon: TreePine },
]

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2]
const SLEEP_OPTIONS = [15, 30, 45, 60]

const EXPLICA_OPTIONS = [
  { id: 'simple', label: 'Explicamelo simple', icon: Eye },
  { id: 'kids', label: 'Como si tuviera 10 anos', icon: Star },
  { id: 'example', label: 'Dame un ejemplo', icon: Layers },
  { id: 'author', label: 'Que quiere decir el autor?', icon: Sparkles },
]

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

  const { setTheme, resolvedTheme } = useTheme()

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
    <div className="min-h-screen flex flex-col bg-background">
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
      <main className="flex-1 pb-20">
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
        <nav className="flex" aria-label="Navegacion principal">
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
  )
}

// ──────────────────────────────────────────────
// LIBRARY TAB
// ──────────────────────────────────────────────
function LibraryTab() {
  const { setCurrentBook, setBookText, setActiveTab, currentBook } = useBookMateStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [books] = useState<BookItem[]>(DEMO_BOOKS)
  const [uploadOpen, setUploadOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const filteredBooks = books.filter(
    (b) =>
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.author.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleOpenBook = useCallback(
    (book: BookItem) => {
      setCurrentBook(book)
      setBookText(DEMO_TEXT)
      setActiveTab('reader')
    },
    [setCurrentBook, setBookText, setActiveTab]
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        const newBook: BookItem = {
          id: `upload-${Date.now()}`,
          title: file.name.replace('.pdf', ''),
          author: 'Autor desconocido',
          fileName: file.name,
          coverColor: 'cyan',
          totalPages: 0,
          currentPage: 0,
          totalChars: 0,
          readChars: 0,
          estimatedMin: 0,
          isFinished: false,
          language: 'es',
          createdAt: new Date().toISOString().split('T')[0],
        }
        setCurrentBook(newBook)
        setBookText(DEMO_TEXT)
        setUploadOpen(false)
        setActiveTab('reader')
      }
    },
    [setCurrentBook, setBookText, setActiveTab]
  )

  return (
    <div className="px-4 pt-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Mi Biblioteca</h1>
        <p className="text-muted-foreground text-sm mt-1">Tus libros, tu ritmo</p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Buscar libro o autor..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Empty state */}
      {filteredBooks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BookOpen className="size-16 text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground text-lg font-medium">Sube tu primer libro para empezar</p>
          <p className="text-muted-foreground/70 text-sm mt-1">
            Toca el boton + para agregar un PDF
          </p>
        </div>
      )}

      {/* Book Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredBooks.map((book, i) => (
          <BookCard key={book.id} book={book} index={i} onOpen={handleOpenBook} />
        ))}
      </div>

      {/* FAB */}
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
            <BookOpen className="size-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Toca para seleccionar un archivo PDF
            </p>
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
}: {
  book: BookItem
  index: number
  onOpen: (book: BookItem) => void
}) {
  const progress = book.totalChars > 0 ? Math.round((book.readChars / book.totalChars) * 100) : 0
  const gradientClass = COVER_GRADIENTS[book.coverColor] || COVER_GRADIENTS.teal

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card
        className="cursor-pointer overflow-hidden py-0 gap-3 transition-shadow hover:shadow-md"
        onClick={() => onOpen(book)}
      >
        {/* Cover */}
        <div
          className={`bg-gradient-to-br ${gradientClass} h-36 flex items-end p-3 relative`}
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
        </div>

        <div className="px-3 pb-3 space-y-2">
          <p className="text-xs text-muted-foreground truncate">{book.author}</p>
          <Progress value={progress} className="h-1.5" />
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{progress}%</span>
            {book.estimatedMin > 0 ? (
              <span className="flex items-center gap-0.5">
                <Clock className="size-3" />
                {book.estimatedMin} min
              </span>
            ) : book.isFinished ? (
              <span className="text-green-600 font-medium">Completado</span>
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
    addHighlight,
  } = store

  const [explicaResult, setExplicaResult] = useState<string | null>(null)
  const [selectedText, setSelectedText] = useState('')

  if (!currentBook) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <Headphones className="size-16 text-muted-foreground/40 mb-4" />
        <p className="text-muted-foreground text-lg font-medium">
          Selecciona un libro de tu biblioteca
        </p>
        <p className="text-muted-foreground/70 text-sm mt-1">
          Ve a la pestana Biblioteca y elige un libro para empezar a leer
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
    const skip = Math.floor(totalChars * (10 / 120))
    setCurrentCharIndex(Math.min(currentCharIndex + skip, totalChars))
  }

  const handleSkipBack = () => {
    const skip = Math.floor(totalChars * (10 / 120))
    setCurrentCharIndex(Math.max(currentCharIndex - skip, 0))
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

  const handleHighlight = () => {
    if (selectedText && currentBook) {
      addHighlight({
        id: `hl-${Date.now()}`,
        bookId: currentBook.id,
        text: selectedText,
        note: '',
        color: 'yellow',
        charStart: bookText.indexOf(selectedText),
        charEnd: bookText.indexOf(selectedText) + selectedText.length,
      })
      setSelectedText('')
    }
  }

  const handleExplica = () => {
    if (selectedText) {
      setExplicaText(selectedText)
    }
    setShowExplica(true)
  }

  const handleExplicaOption = (_optionId: string) => {
    setExplicaResult(
      'Esta es una explicacion generada por la IA de BookMate. En una version completa, aqui apareceria la explicacion detallada del texto seleccionado usando el modelo de lenguaje.'
    )
  }

  // Split text into lines for rendering, highlight around currentCharIndex
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
    <div className="flex flex-col h-[calc(100vh-8.5rem)]">
      {/* Book title */}
      <div className="px-4 py-3 border-b">
        <h2 className="font-semibold text-foreground truncate">{currentBook.title}</h2>
        <p className="text-xs text-muted-foreground">{currentBook.author}</p>
      </div>

      {/* Text area */}
      <ScrollArea className="flex-1 px-4 py-4">
        <div
          className="text-base leading-relaxed text-foreground/90 max-w-2xl mx-auto select-text"
          onMouseUp={handleTextSelect}
        >
          {renderText()}
        </div>
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
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Explica */}
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setShowExplica(true)}
            >
              <Sparkles className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Explica Sheet */}
      <Sheet open={showExplica} onOpenChange={setShowExplica}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>BookMate Explica</SheetTitle>
            <SheetDescription>
              Selecciona una opcion para entender mejor el texto
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
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
                    onClick={() => handleExplicaOption(option.id)}
                  >
                    <OptionIcon className="size-4 mr-2 shrink-0" />
                    {option.label}
                    <ChevronRight className="size-4 ml-auto shrink-0 text-muted-foreground" />
                  </Button>
                )
              })}
            </div>

            {/* Result */}
            {explicaResult && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3"
              >
                <p className="text-sm text-foreground">{explicaResult}</p>
                <Button size="sm" variant="secondary" className="w-full">
                  <Volume2 className="size-3.5 mr-1.5" />
                  Escuchar explicacion
                </Button>
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
function StatsTab() {
  const { streakDays } = useBookMateStore()
  const maxMinutes = Math.max(...WEEKLY_DATA.map((d) => d.minutes))

  const statsCards = [
    { label: 'Total Libros', value: '5', icon: BookOpen },
    { label: 'Total Horas', value: '23.5', icon: Clock },
    { label: 'Racha Actual', value: `${streakDays || 7} dias`, icon: FlameIcon },
    { label: 'Mejor Racha', value: '14 dias', icon: Trophy },
  ]

  return (
    <div className="px-4 pt-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tu Actividad de Lectura</h1>
      </div>

      {/* Streak */}
      <Card className="py-4">
        <CardContent className="flex items-center gap-4">
          <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center">
            <FlameIcon className="size-7 text-primary" />
          </div>
          <div>
            <p className="text-3xl font-bold text-foreground">{streakDays || 7} dias</p>
            <p className="text-sm text-muted-foreground">Racha actual de lectura</p>
          </div>
        </CardContent>
      </Card>

      {/* Weekly chart */}
      <Card className="py-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Lectura semanal</CardTitle>
          <CardDescription>Minutos leidos por dia</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-36">
            {WEEKLY_DATA.map((day) => {
              const height = maxMinutes > 0 ? (day.minutes / maxMinutes) * 100 : 0
              return (
                <div key={day.day} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[11px] text-muted-foreground">
                    {day.minutes}
                  </span>
                  <div className="w-full flex items-end" style={{ height: '100px' }}>
                    <motion.div
                      className="w-full bg-primary/80 rounded-t-sm min-h-[4px]"
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  </div>
                  <span className="text-[11px] text-muted-foreground font-medium">
                    {day.day}
                  </span>
                </div>
              )
            })}
          </div>
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
            {ACHIEVEMENTS.map((achievement) => {
              const AchievementIcon = achievement.icon
              const isUnlocked = achievement.unlocked
              return (
                <Tooltip key={achievement.id}>
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
  const { userPlan, setUserPlan, setIsVip } = useBookMateStore()

  const plans = [
    {
      id: 'free' as const,
      name: 'Gratis',
      price: '$0',
      period: '/mes',
      description: 'Para empezar a explorar',
      features: [
        'Google TTS mejorado',
        '5 subrayados por libro',
        'Racha de lectura',
        'Estadisticas basicas',
      ],
      cta: 'Plan actual',
      popular: false,
      icon: BookOpen,
    },
    {
      id: 'plus' as const,
      name: 'Plus',
      price: '$12.99',
      period: '/mes',
      annualPrice: '$99.99/ano',
      description: 'Para lectores dedicados',
      features: [
        '15 hrs IA al mes',
        'Sonidos ambientales',
        'Temas personalizados',
        'Logros y metas',
        '10 "Explica" al mes',
        'Modo dormir',
        'Subrayados ilimitados',
      ],
      cta: 'Elegir Plus',
      popular: true,
      icon: Crown,
    },
    {
      id: 'pro' as const,
      name: 'Pro',
      price: '$17.99',
      period: '/mes',
      annualPrice: '$129.99/ano',
      description: 'Para los mas exigentes',
      features: [
        '25 hrs IA al mes',
        '"Explica" ilimitado + voz',
        'Resumen con IA',
        'Analisis de sentimiento',
        'OCR escaner 1 libro/mes',
        '"Tu Ano en Libros"',
      ],
      cta: 'Elegir Pro',
      popular: false,
      icon: Gem,
    },
  ]

  return (
    <div className="px-4 pt-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">Elige tu Plan</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Desbloquea todo el potencial de BookMate
        </p>
      </div>

      {/* Annual savings callout */}
      <div className="bg-primary/10 border border-primary/20 rounded-lg px-4 py-3 text-center">
        <p className="text-sm font-medium text-primary">
          Ahorra hasta 36% con la suscripcion anual
        </p>
      </div>

      {/* Plan cards */}
      <div className="space-y-4 md:grid md:grid-cols-3 md:gap-4 md:space-y-0">
        {plans.map((plan) => {
          const PlanIcon = plan.icon
          const isCurrent = userPlan === plan.id

          return (
            <motion.div
              key={plan.id}
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
            >
              <Card
                className={`relative py-6 ${
                  plan.popular
                    ? 'border-primary shadow-lg scale-[1.02]'
                    : ''
                } ${isCurrent ? 'ring-2 ring-primary' : ''}`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                    Mas Popular
                  </Badge>
                )}

                <CardHeader className="items-center text-center pb-2">
                  <div
                    className={`size-12 rounded-full flex items-center justify-center mb-2 ${
                      plan.popular
                        ? 'bg-primary/20 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <PlanIcon className="size-6" />
                  </div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>

                <CardContent className="text-center space-y-1">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground text-sm">{plan.period}</span>
                  </div>
                  {plan.annualPrice && (
                    <p className="text-xs text-primary font-medium">{plan.annualPrice}</p>
                  )}
                </CardContent>

                <CardContent className="space-y-2.5">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-2">
                      <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm text-foreground/80">{feature}</span>
                    </div>
                  ))}
                </CardContent>

                <CardFooter className="flex-col">
                  <Button
                    className="w-full"
                    variant={plan.popular ? 'default' : 'outline'}
                    disabled={isCurrent}
                    onClick={() => {
                      setUserPlan(plan.id)
                      setIsVip(plan.id !== 'free')
                    }}
                  >
                    {isCurrent ? 'Plan actual' : plan.cta}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
