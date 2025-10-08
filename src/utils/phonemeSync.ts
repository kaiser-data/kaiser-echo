import type { PhonemeType } from '../hooks/usePhonemeDetection'

/**
 * Global phoneme synchronization manager
 * Allows components to share phoneme data across the app
 */

type PhonemeListener = (phoneme: PhonemeType) => void

class PhonemeSyncManager {
  private listeners: Set<PhonemeListener> = new Set()
  private currentPhoneme: PhonemeType = 'X'
  private utterance: SpeechSynthesisUtterance | null = null

  subscribe(listener: PhonemeListener) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  setCurrentPhoneme(phoneme: PhonemeType) {
    this.currentPhoneme = phoneme
    this.notifyListeners()
  }

  getCurrentPhoneme(): PhonemeType {
    return this.currentPhoneme
  }

  setUtterance(utterance: SpeechSynthesisUtterance) {
    this.utterance = utterance
    this.startPhonemeSimulation(utterance)
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener(this.currentPhoneme))
  }

  /**
   * Simulate phonemes from text
   * This is a simplified phoneme estimation based on text analysis
   */
  private startPhonemeSimulation(utterance: SpeechSynthesisUtterance) {
    const text = utterance.text
    const phonemes = this.textToPhonemes(text)

    let index = 0
    const phonemeDuration = 100 // ms per phoneme

    const interval = setInterval(() => {
      if (index >= phonemes.length) {
        this.setCurrentPhoneme('X')
        clearInterval(interval)
        return
      }

      this.setCurrentPhoneme(phonemes[index])
      index++
    }, phonemeDuration)

    // Clean up on utterance end
    utterance.addEventListener('end', () => {
      clearInterval(interval)
      this.setCurrentPhoneme('X')
    })

    utterance.addEventListener('error', () => {
      clearInterval(interval)
      this.setCurrentPhoneme('X')
    })
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
    this.setCurrentPhoneme('X')
    this.utterance = null
  }
}

export const phonemeSyncManager = new PhonemeSyncManager()
