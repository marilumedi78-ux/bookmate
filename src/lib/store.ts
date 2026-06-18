import { create } from 'zustand'
import type { SkipRange } from './skip-utils'
import { mergeRanges } from './skip-utils'

export type TabType = 'library' | 'reader' | 'stats' | 'pricing'
export type ReadingMode = 'visual' | 'audio' | 'both'

// ─── localStorage persistence for "seleccionar qué no leer" ───
const SKIP_RANGES_KEY = 'bookmate:skipRanges'
const AUTO_SKIP_KEY = 'bookmate:autoSkip'

function loadSkipRanges(): Record<string, SkipRange[]> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(SKIP_RANGES_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') return parsed as Record<string, SkipRange[]>
  } catch {}
  return {}
}

function persistSkipRanges(ranges: Record<string, SkipRange[]>): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SKIP_RANGES_KEY, JSON.stringify(ranges))
  } catch {}
}

function loadAutoSkip(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(AUTO_SKIP_KEY) === '1'
  } catch {}
  return false
}

function persistAutoSkip(enabled: boolean): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(AUTO_SKIP_KEY, enabled ? '1' : '0')
  } catch {}
}

export interface BookItem {
  id: string
  title: string
  author: string
  fileName: string
  coverColor: string
  totalPages: number
  currentPage: number
  totalChars: number
  readChars: number
  estimatedMin: number
  isFinished: boolean
  language: string
  createdAt: string
  fileHash?: string
  highlightsCount?: number
}

export interface HighlightItem {
  id: string
  bookId: string
  text: string
  note: string
  color: string
  charStart: number
  charEnd: number
}

export interface DuplicateInfo {
  duplicate: boolean
  matchType: 'hash' | 'metadata' | null
  existingBook: BookItem | null
  message: string
}

interface BookMateState {
  // Navigation
  activeTab: TabType
  setActiveTab: (tab: TabType) => void

  // Current book being read
  currentBook: BookItem | null
  setCurrentBook: (book: BookItem | null) => void

  // Book text content
  bookText: string
  setBookText: (text: string) => void

  // Library books
  books: BookItem[]
  setBooks: (books: BookItem[]) => void
  addBook: (book: BookItem) => void
  removeBook: (id: string) => void

  // TTS state
  isPlaying: boolean
  setIsPlaying: (playing: boolean) => void
  playbackSpeed: number
  setPlaybackSpeed: (speed: number) => void
  currentCharIndex: number
  setCurrentCharIndex: (idx: number) => void
  readingMode: ReadingMode
  setReadingMode: (mode: ReadingMode) => void

  // Ambient sounds
  ambientSound: string | null
  setAmbientSound: (sound: string | null) => void
  ambientVolume: number
  setAmbientVolume: (vol: number) => void

  // Selected voice profile ID (replaces voiceMode + selectedBrowserVoiceURI + selectedAIVoice)
  // Uses /lib/voice-profiles.ts — combines browser voice + pitch + rate for distinct characters
  selectedVoiceProfileId: string
  setSelectedVoiceProfileId: (id: string) => void

  // "Seleccionar qué no leer" — manual skip ranges keyed by bookId + auto-skip toggle
  skipRanges: Record<string, SkipRange[]>
  autoSkipEnabled: boolean
  setSkipRangesForBook: (bookId: string, ranges: SkipRange[]) => void
  addSkipRange: (bookId: string, range: SkipRange) => void
  removeSkipRangeAt: (bookId: string, index: number) => void
  clearSkipRangesForBook: (bookId: string) => void
  setAutoSkipEnabled: (enabled: boolean) => void

  // Sleep timer
  sleepTimer: number | null
  setSleepTimer: (min: number | null) => void

  // UI state
  showExplica: boolean
  setShowExplica: (show: boolean) => void
  explicaText: string
  setExplicaText: (text: string) => void

  // Highlights for current book
  highlights: HighlightItem[]
  setHighlights: (h: HighlightItem[]) => void
  addHighlight: (h: HighlightItem) => void
  removeHighlight: (id: string) => void

  // User plan
  userPlan: 'free' | 'plus' | 'pro'
  setUserPlan: (plan: 'free' | 'plus' | 'pro') => void
  isVip: boolean
  setIsVip: (vip: boolean) => void
  streakDays: number

  // Dark mode
  isDarkMode: boolean
  setIsDarkMode: (dark: boolean) => void

  // Loading states
  isLoadingBook: boolean
  setIsLoadingBook: (loading: boolean) => void
  isUploading: boolean
  setIsUploading: (uploading: boolean) => void
  isExplaining: boolean
  setIsExplaining: (explaining: boolean) => void

  // Duplicate detection
  duplicateInfo: DuplicateInfo | null
  setDuplicateInfo: (info: DuplicateInfo | null) => void

  // Admin
  isAdminPanelOpen: boolean
  setIsAdminPanelOpen: (open: boolean) => void
  adminTapCount: number
  incrementAdminTap: () => void
  resetAdminTap: () => void
}

export const useBookMateStore = create<BookMateState>((set) => ({
  // Navigation
  activeTab: 'library',
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Current book being read
  currentBook: null,
  setCurrentBook: (book) => set({ currentBook: book }),

  // Book text content
  bookText: '',
  setBookText: (text) => set({ bookText: text, currentCharIndex: 0, isPlaying: false }),

  // Library books
  books: [],
  setBooks: (books) => set({ books }),
  addBook: (book) => set((state) => ({ books: [book, ...state.books] })),
  removeBook: (id) => set((state) => ({ books: state.books.filter((b) => b.id !== id) })),

  // TTS state
  isPlaying: false,
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  playbackSpeed: 1,
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  currentCharIndex: 0,
  setCurrentCharIndex: (idx) => set({ currentCharIndex: idx }),
  readingMode: 'both',
  setReadingMode: (mode) => set({ readingMode: mode }),

  // Ambient sounds
  ambientSound: null,
  setAmbientSound: (sound) => set({ ambientSound: sound }),
  ambientVolume: 0.5,
  setAmbientVolume: (vol) => set({ ambientVolume: vol }),

  // Selected voice profile — default 'free-female' (works on all plans)
  selectedVoiceProfileId: 'free-female',
  setSelectedVoiceProfileId: (id) => set({ selectedVoiceProfileId: id }),

  // "Seleccionar qué no leer" — manual skip ranges per book + auto-skip toggle
  // Loaded from localStorage so the user's skip selections survive reloads.
  skipRanges: loadSkipRanges(),
  autoSkipEnabled: loadAutoSkip(),
  setSkipRangesForBook: (bookId, ranges) =>
    set((state) => {
      const next = { ...state.skipRanges, [bookId]: mergeRanges(ranges) }
      persistSkipRanges(next)
      return { skipRanges: next }
    }),
  addSkipRange: (bookId, range) =>
    set((state) => {
      const existing = state.skipRanges[bookId] || []
      const next = { ...state.skipRanges, [bookId]: mergeRanges([...existing, range]) }
      persistSkipRanges(next)
      return { skipRanges: next }
    }),
  removeSkipRangeAt: (bookId, index) =>
    set((state) => {
      const existing = state.skipRanges[bookId] || []
      const nextRanges = existing.filter((_, i) => i !== index)
      const next = { ...state.skipRanges, [bookId]: nextRanges }
      persistSkipRanges(next)
      return { skipRanges: next }
    }),
  clearSkipRangesForBook: (bookId) =>
    set((state) => {
      const next = { ...state.skipRanges, [bookId]: [] }
      persistSkipRanges(next)
      return { skipRanges: next }
    }),
  setAutoSkipEnabled: (enabled) => {
    persistAutoSkip(enabled)
    set({ autoSkipEnabled: enabled })
  },

  // Sleep timer
  sleepTimer: null,
  setSleepTimer: (min) => set({ sleepTimer: min }),

  // UI state
  showExplica: false,
  setShowExplica: (show) => set({ showExplica: show }),
  explicaText: '',
  setExplicaText: (text) => set({ explicaText: text }),

  // Highlights for current book
  highlights: [],
  setHighlights: (h) => set({ highlights: h }),
  addHighlight: (h) =>
    set((state) => ({ highlights: [...state.highlights, h] })),
  removeHighlight: (id) =>
    set((state) => ({
      highlights: state.highlights.filter((hl) => hl.id !== id),
    })),

  // User plan
  userPlan: 'free',
  setUserPlan: (plan) => set({ userPlan: plan }),
  isVip: false,
  setIsVip: (vip) => set({ isVip: vip }),
  streakDays: 0,

  // Dark mode
  isDarkMode: false,
  setIsDarkMode: (dark) => set({ isDarkMode: dark }),

  // Loading states
  isLoadingBook: false,
  setIsLoadingBook: (loading) => set({ isLoadingBook: loading }),
  isUploading: false,
  setIsUploading: (uploading) => set({ isUploading: uploading }),
  isExplaining: false,
  setIsExplaining: (explaining) => set({ isExplaining: explaining }),

  // Duplicate detection
  duplicateInfo: null,
  setDuplicateInfo: (info) => set({ duplicateInfo: info }),

  // Admin
  isAdminPanelOpen: false,
  setIsAdminPanelOpen: (open) => set({ isAdminPanelOpen: open }),
  adminTapCount: 0,
  incrementAdminTap: () =>
    set((state) => ({ adminTapCount: state.adminTapCount + 1 })),
  resetAdminTap: () => set({ adminTapCount: 0 }),
}))
