import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Message,
  UserFact,
  AvatarConfig,
  VoiceState,
  EmotionState,
  User,
  DEFAULT_AVATAR_CONFIG
} from '../types'

interface AppState {
  // Session
  sessionId: string
  user: User | null

  // Messages
  messages: Message[]

  // Facts
  facts: UserFact[]

  // Avatar
  avatarConfig: AvatarConfig
  emotion: EmotionState

  // Voice state
  voiceState: VoiceState

  // UI state
  showAuthModal: boolean
  showAvatarCustomizer: boolean
  showPositionControls: boolean
  avatarRenderMode: 'overlay' | 'ai' // Which rendering mode to use
  language: 'en' | 'de'
  aiProvider: 'bfl' | 'fal' | 'replicate' | 'gemini' | 'auto'

  // Actions
  setSessionId: (id: string) => void
  setUser: (user: User | null) => void
  addMessage: (message: Message) => void
  setMessages: (messages: Message[]) => void
  addFact: (fact: UserFact) => void
  setFacts: (facts: UserFact[]) => void
  setAvatarConfig: (config: AvatarConfig) => void
  setEmotion: (emotion: EmotionState) => void
  setVoiceState: (state: VoiceState) => void
  setShowAuthModal: (show: boolean) => void
  setShowAvatarCustomizer: (show: boolean) => void
  setShowPositionControls: (show: boolean) => void
  setAvatarRenderMode: (mode: 'overlay' | 'ai') => void
  setLanguage: (lang: 'en' | 'de') => void
  setAiProvider: (provider: 'bfl' | 'fal' | 'replicate' | 'gemini' | 'auto') => void
  reset: () => void
}

// Generate a unique session ID
const generateSessionId = () => {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial state
      sessionId: generateSessionId(),
      user: null,
      messages: [],
      facts: [],
      avatarConfig: {
        skinColor: '#F4C2A0',
        hairColor: '#6B4423',
        hairStyle: 'short',
        eyeColor: '#4A5568',
        hasGlasses: false,
        glassesStyle: 'none',
        accessory: 'none',
      },
      emotion: 'neutral',
      voiceState: 'idle',
      showAuthModal: false,
      showAvatarCustomizer: false,
      showPositionControls: false,
      avatarRenderMode: 'ai', // Default to AI mode if generated, otherwise fallback to overlay
      language: 'en',
      aiProvider: 'auto',

      // Actions
      setSessionId: (id) => set({ sessionId: id }),

      setUser: (user) => set({ user }),

      addMessage: (message) =>
        set((state) => ({
          messages: [...state.messages, message]
        })),

      setMessages: (messages) => set({ messages }),

      addFact: (fact) =>
        set((state) => {
          // Avoid duplicates based on fact type and value
          const exists = state.facts.some(
            f => f.factType === fact.factType && f.factValue === fact.factValue
          )
          if (exists) return state
          return { facts: [...state.facts, fact] }
        }),

      setFacts: (facts) => set({ facts }),

      setAvatarConfig: (config) => set({ avatarConfig: config }),

      setEmotion: (emotion) => set({ emotion }),

      setVoiceState: (voiceState) => set({ voiceState }),

      setShowAuthModal: (show) => set({ showAuthModal: show }),

      setShowAvatarCustomizer: (show) => set({ showAvatarCustomizer: show }),

      setShowPositionControls: (show) => set({ showPositionControls: show }),

      setAvatarRenderMode: (mode) => set({ avatarRenderMode: mode }),

      setLanguage: (language) => set({ language }),

      setAiProvider: (aiProvider) => set({ aiProvider }),

      reset: () => set({
        sessionId: generateSessionId(),
        messages: [],
        facts: [],
        emotion: 'neutral',
        voiceState: 'idle',
      }),
    }),
    {
      name: 'kaiser-echo-storage',
      partialize: (state) => ({
        sessionId: state.sessionId,
        user: state.user,
        avatarConfig: state.avatarConfig,
        language: state.language,
        aiProvider: state.aiProvider,
        facts: state.facts,
      }),
    }
  )
)
