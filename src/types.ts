// Core types for the application

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  language: string
  timestamp: number
}

export interface UserFact {
  id: string
  factType: 'name' | 'job' | 'interest' | 'preference' | 'location' | 'goal'
  factValue: string
  confidence: number
  createdAt: string
}

export interface AvatarConfig {
  skinColor: string
  hairColor: string
  hairStyle: 'short' | 'long' | 'curly' | 'bald'
  eyeColor: string
  hasGlasses: boolean
  glassesStyle: 'round' | 'square' | 'none'
  accessory: 'none' | 'earrings' | 'hat' | 'bow'
  uploadedImage?: string // Base64 encoded image for realistic avatar
}

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  skinColor: '#F4C2A0',
  hairColor: '#6B4423',
  hairStyle: 'short',
  eyeColor: '#4A5568',
  hasGlasses: false,
  glassesStyle: 'none',
  accessory: 'none',
}

export interface Session {
  sessionId: string
  userId: string | null
  avatarConfig: AvatarConfig
  language: 'en' | 'de'
  createdAt: string
  lastActive: string
}

export interface User {
  userId: string
  email: string
  createdAt: string
}

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking'

export type EmotionState = 'neutral' | 'happy' | 'thinking' | 'talking'

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface ChatRequest {
  sessionId: string
  message: string
  language: 'en' | 'de'
  userId?: string
}

export interface ChatResponse {
  response: string
  audioUrl?: string
  facts?: UserFact[]
  memoryUsed?: boolean
}

export interface UsageInfo {
  conversationsToday: number
  conversationsRemaining: number
  dailyLimit: number
}
