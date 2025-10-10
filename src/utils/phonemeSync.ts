import type { PhonemeType } from '../hooks/usePhonemeDetection'

/**
 * Phoneme variation types for natural coarticulation
 */
type PhonemeVariation = 'opening' | 'hold' | 'closing'

/**
 * Phoneme-specific durations (in milliseconds) for realistic speech timing
 * Each phoneme has three phases: opening (transition in), hold (sustain), closing (transition out)
 */
const PHONEME_DURATIONS: Record<PhonemeType, { opening: number; hold: number; closing: number }> = {
  X: { opening: 30, hold: 40, closing: 30 },   // Brief silence/rest
  A: { opening: 35, hold: 60, closing: 35 },   // Short vowel
  B: { opening: 40, hold: 80, closing: 40 },   // Long open vowel (sustained)
  C: { opening: 25, hold: 50, closing: 25 },   // Quick consonant
  D: { opening: 35, hold: 65, closing: 35 },   // Medium vowel
  E: { opening: 40, hold: 70, closing: 40 },   // Round vowel (longer)
  F: { opening: 30, hold: 60, closing: 30 },   // Fricative
  G: { opening: 30, hold: 50, closing: 30 },   // Dental
  H: { opening: 40, hold: 70, closing: 40 },   // Wide vowel/smile
}

/**
 * Timeline entry for phoneme playback
 */
interface PhonemeTimelineEntry {
  phoneme: PhonemeType
  variation: PhonemeVariation
  variationKey: string  // e.g., "X-opening", "A-hold"
  startTime: number     // Milliseconds from utterance start
  duration: number      // Duration of this variation state
}

/**
 * Global phoneme synchronization manager with smart timeline-based playback
 * Supports 27 variations (9 phonemes × 3 states) for natural coarticulation
 */
type PhonemeListener = (variationKey: string) => void

class PhonemeSyncManager {
  private listeners: Set<PhonemeListener> = new Set()
  private currentVariationKey: string = 'X-hold'
  private utterance: SpeechSynthesisUtterance | null = null
  private timeline: PhonemeTimelineEntry[] = []
  private utteranceStartTime: number = 0
  private playbackInterval: number | null = null

  subscribe(listener: PhonemeListener) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  setCurrentVariation(variationKey: string) {
    if (this.currentVariationKey !== variationKey) {
      this.currentVariationKey = variationKey
      this.notifyListeners()
    }
  }

  getCurrentVariationKey(): string {
    return this.currentVariationKey
  }

  /**
   * Legacy method for backward compatibility
   * Sets variation to "{phoneme}-hold"
   */
  setCurrentPhoneme(phoneme: PhonemeType) {
    this.setCurrentVariation(`${phoneme}-hold`)
  }

  /**
   * Legacy method for backward compatibility
   * Returns just the phoneme letter from current variation key
   */
  getCurrentPhoneme(): PhonemeType {
    return this.currentVariationKey.split('-')[0] as PhonemeType
  }

  setUtterance(utterance: SpeechSynthesisUtterance) {
    this.utterance = utterance
    this.startPhonemeSimulation(utterance)
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener(this.currentVariationKey))
  }

  /**
   * Build timeline from phoneme sequence
   * Creates 3 entries per phoneme (opening, hold, closing) with realistic durations
   */
  private buildTimeline(phonemes: PhonemeType[]): void {
    this.timeline = []
    let currentTime = 0

    phonemes.forEach((phoneme) => {
      const durations = PHONEME_DURATIONS[phoneme]
      const variations: PhonemeVariation[] = ['opening', 'hold', 'closing']

      variations.forEach((variation) => {
        const duration = durations[variation]
        this.timeline.push({
          phoneme,
          variation,
          variationKey: `${phoneme}-${variation}`,
          startTime: currentTime,
          duration,
        })
        currentTime += duration
      })
    })
  }

  /**
   * Get current variation based on elapsed time
   */
  private getCurrentVariationFromTimeline(elapsedMs: number): string {
    const entry = this.timeline.find(
      (e) => elapsedMs >= e.startTime && elapsedMs < e.startTime + e.duration
    )
    return entry?.variationKey || 'X-hold'
  }

  /**
   * Simulate phonemes from text with timeline-based playback
   * Uses simplified natural mouth movements for better visual results
   */
  private startPhonemeSimulation(utterance: SpeechSynthesisUtterance) {
    const text = utterance.text

    // Simplified approach: Create natural-looking mouth movements
    // instead of trying to map every character to a phoneme
    const phonemes = this.generateNaturalMouthSequence(text)

    // Build timeline with 27 variations
    this.buildTimeline(phonemes)

    // Start playback loop (update every 20ms for smooth animation)
    this.utteranceStartTime = Date.now()

    const updateLoop = () => {
      const elapsedMs = Date.now() - this.utteranceStartTime
      const variationKey = this.getCurrentVariationFromTimeline(elapsedMs)
      this.setCurrentVariation(variationKey)

      // Continue loop
      this.playbackInterval = window.setTimeout(updateLoop, 20)
    }

    updateLoop()

    // Clean up on utterance end
    utterance.addEventListener('end', () => {
      if (this.playbackInterval) {
        clearTimeout(this.playbackInterval)
        this.playbackInterval = null
      }
      this.setCurrentVariation('X-hold')
    })

    utterance.addEventListener('error', () => {
      if (this.playbackInterval) {
        clearTimeout(this.playbackInterval)
        this.playbackInterval = null
      }
      this.setCurrentVariation('X-hold')
    })
  }

  /**
   * Generate natural-looking mouth movement sequence
   * Uses word patterns and natural speech rhythms instead of character-by-character mapping
   */
  private generateNaturalMouthSequence(text: string): PhonemeType[] {
    const phonemes: PhonemeType[] = []
    const words = text.toLowerCase().split(/\s+/)

    // Available mouth positions for AI variations: X, A, B, C, E, H
    // X = closed, A = slightly open, B = wide open, C = pressed, E = round, H = smile
    const openVowels: PhonemeType[] = ['B', 'A'] // Wide and medium open
    const closedSounds: PhonemeType[] = ['C', 'A'] // Pressed and slight open
    const roundSounds: PhonemeType[] = ['E', 'A'] // Round and medium
    const smileSounds: PhonemeType[] = ['H', 'A'] // Smile and medium

    words.forEach((word, wordIndex) => {
      // Add variety based on word length
      const syllableCount = Math.max(1, Math.floor(word.length / 3))

      for (let i = 0; i < syllableCount; i++) {
        // Create natural speech pattern: consonant-vowel-consonant rhythm

        // Opening (consonant approach)
        if (word.includes('m') || word.includes('b') || word.includes('p')) {
          phonemes.push('C') // Closed lips
        } else {
          phonemes.push('A') // Slight open
        }

        // Peak vowel sound (main mouth opening)
        if (word.includes('o') || word.includes('u')) {
          phonemes.push('E') // Round mouth for o/u sounds
        } else if (word.includes('e') || word.includes('i')) {
          phonemes.push('H') // Smile for e/i sounds
        } else if (word.includes('a')) {
          phonemes.push('B') // Wide open for a sounds
        } else {
          phonemes.push('A') // Default medium open
        }

        // Closing (consonant)
        phonemes.push('A') // Return to neutral
      }

      // Brief pause between words
      if (wordIndex < words.length - 1) {
        phonemes.push('X')
      }
    })

    return phonemes
  }

  /**
   * Convert text to estimated phoneme sequence
   * This is a basic approximation - real phoneme detection requires audio analysis
   */
  private textToPhonemes(text: string): PhonemeType[] {
    const phonemes: PhonemeType[] = []
    const words = text.toLowerCase().split(/\s+/)

    words.forEach((word, wordIndex) => {
      for (let i = 0; i < word.length; i++) {
        const char = word[i]
        const nextChar = word[i + 1]
        const prevChar = word[i - 1]

        // Consonants
        if ('mbp'.includes(char)) {
          phonemes.push('C') // Bilabial stops
        } else if ('fv'.includes(char)) {
          phonemes.push('F') // Labiodental fricatives
        } else if (char === 't' && nextChar === 'h') {
          phonemes.push('G') // Dental fricative
          i++ // Skip next char
        } else if ('tdkg'.includes(char) && nextChar !== 'h') {
          phonemes.push('D') // Alveolar/velar stops
        } else if ('szxcjq'.includes(char)) {
          phonemes.push('F') // Fricatives and affricates
        } else if (char === 'l' || char === 'r') {
          phonemes.push('D') // Liquids
        } else if ('n'.includes(char)) {
          phonemes.push('C') // Nasals
        } else if ('w'.includes(char)) {
          phonemes.push('E') // Labial approximant
        }
        // Vowels
        else if (char === 'o' && (nextChar === 'o' || nextChar === 'u')) {
          phonemes.push('E') // Round vowels (oo, ou)
          i++
        } else if (char === 'a' && nextChar === 'a') {
          phonemes.push('B') // Open vowels (aa)
          i++
        } else if (char === 'e' && nextChar === 'e') {
          phonemes.push('H') // High front vowels (ee)
          i++
        } else if ('aáäæ'.includes(char)) {
          phonemes.push('B') // Open vowels
        } else if ('eéëê'.includes(char)) {
          if (i === word.length - 1 && word.length > 2) {
            // Silent e
            continue
          }
          phonemes.push('D') // Mid vowels
        } else if ('iíïî'.includes(char)) {
          phonemes.push('H') // High front vowels
        } else if ('oóöô'.includes(char)) {
          phonemes.push('E') // Round vowels
        } else if ('uúüû'.includes(char)) {
          phonemes.push('E') // Round back vowels
        } else if ('y'.includes(char)) {
          if (i === 0 || prevChar === ' ') {
            phonemes.push('D') // Consonant y
          } else {
            phonemes.push('H') // Vowel y
          }
        } else {
          phonemes.push('A') // Default rest position
        }
      }

      // Add brief pause between words
      if (wordIndex < words.length - 1) {
        phonemes.push('X')
      }
    })

    return phonemes
  }

  /**
   * Reset to silent state
   */
  reset() {
    if (this.playbackInterval) {
      clearTimeout(this.playbackInterval)
      this.playbackInterval = null
    }
    this.timeline = []
    this.setCurrentVariation('X-hold')
    this.utterance = null
  }
}

export const phonemeSyncManager = new PhonemeSyncManager()
