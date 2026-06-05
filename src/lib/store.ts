import { create } from 'zustand'

export type TabType = 'library' | 'reader' | 'stats' | 'pricing'
export type ReadingMode = 'visual' | 'audio' | 'both'

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
  ambientSound: string | null // 'rain' | 'cafe' | 'fire' | 'waves' | 'forest' | null
  setAmbientSound: (sound: string | null) => void
  ambientVolume: number
  setAmbientVolume: (vol: number) => void

  // Sleep timer
  sleepTimer: number | null // minutes
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
  isGeneratingAudio: boolean
  setIsGeneratingAudio: (generating: boolean) => void

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
  setBookText: (text) => set({ bookText: text }),

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
  isGeneratingAudio: false,
  setIsGeneratingAudio: (generating) => set({ isGeneratingAudio: generating }),

  // Admin
  isAdminPanelOpen: false,
  setIsAdminPanelOpen: (open) => set({ isAdminPanelOpen: open }),
  adminTapCount: 0,
  incrementAdminTap: () =>
    set((state) => ({ adminTapCount: state.adminTapCount + 1 })),
  resetAdminTap: () => set({ adminTapCount: 0 }),
}))
