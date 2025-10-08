import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Phoneme mapping based on Rhubarb Lip-Sync standard
 * https://github.com/DanielSWolf/rhubarb-lip-sync
 */
export type PhonemeType = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'X'

/**
 * Phoneme descriptions (Preston Blair mouth shapes):
 * A - Rest position (closed mouth)
 * B - Wide open (vowels like "ah", "aa")
 * C - Tight-lipped (consonants like "m", "b", "p")
 * D - Narrow open (vowels like "eh", "ae")
 * E - Round/puckered (vowels like "oo", "oh")
 * F - Upper teeth on lower lip ("f", "v")
 * G - Tongue visible ("th", "dh")
 * H - Wide/flat (vowels like "ee")
 * X - Silence/pause
 */

interface PhonemeTimestamp {
  phoneme: PhonemeType
  timestamp: number
  duration: number
  confidence: number
}

interface UsePhonemeDetectionOptions {
  enabled?: boolean
  sensitivity?: number // 0-1, higher = more sensitive to frequency changes
}

/**
 * Real-time phoneme detection using Web Audio API
 * Analyzes frequency spectrum to estimate mouth shapes
 */
export const usePhonemeDetection = (options: UsePhonemeDetectionOptions = {}) => {
  const { enabled = true, sensitivity = 0.7 } = options

  const [currentPhoneme, setCurrentPhoneme] = useState<PhonemeType>('X')
  const [phonemeHistory, setPhonemeHistory] = useState<PhonemeTimestamp[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number>()
  const lastPhonemeRef = useRef<PhonemeType>('X')
  const phonemeStartTimeRef = useRef<number>(0)

  // Initialize Web Audio API
  useEffect(() => {
    if (!enabled) return

    const AudioContext = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContext) {
      console.warn('Web Audio API not supported')
      return
    }

    audioContextRef.current = new AudioContext()
    analyserRef.current = audioContextRef.current.createAnalyser()
    analyserRef.current.fftSize = 2048
    analyserRef.current.smoothingTimeConstant = 0.8

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [enabled])

  /**
   * Detect phoneme from frequency spectrum
   * Uses frequency distribution to estimate mouth shape
   */
  const detectPhonemeFromFrequencies = useCallback(
    (frequencies: Uint8Array): PhonemeType => {
      // Calculate frequency band energies
      const lowFreq = frequencies.slice(0, 85).reduce((a, b) => a + b, 0) / 85 // 0-2kHz
      const midFreq = frequencies.slice(85, 170).reduce((a, b) => a + b, 0) / 85 // 2-4kHz
      const highFreq = frequencies.slice(170, 255).reduce((a, b) => a + b, 0) / 85 // 4-6kHz

      // Calculate total energy
      const totalEnergy = frequencies.reduce((a, b) => a + b, 0) / frequencies.length

      // Silence detection
      if (totalEnergy < 10 * sensitivity) {
        return 'X'
      }

      // Rest position (very low energy)
      if (totalEnergy < 20 * sensitivity) {
        return 'A'
      }

      // Frequency-based phoneme detection
      const lowRatio = lowFreq / totalEnergy
      const midRatio = midFreq / totalEnergy
      const highRatio = highFreq / totalEnergy

      // High frequency consonants (f, v, s, sh)
      if (highRatio > 0.4 && midRatio > 0.3) {
        return 'F' // Upper teeth on lower lip
      }

      // Mid-high frequency consonants (th, dh)
      if (highRatio > 0.35 && lowRatio < 0.3) {
        return 'G' // Tongue visible
      }

      // Closed mouth consonants (m, b, p)
      if (lowRatio > 0.5 && totalEnergy > 30 * sensitivity) {
        return 'C' // Tight-lipped
      }

      // Round vowels (oo, oh, ow)
      if (lowRatio > 0.45 && midRatio < 0.25) {
        return 'E' // Round/puckered
      }

      // High vowels (ee, i)
      if (midRatio > 0.4 && highRatio > 0.25) {
        return 'H' // Wide/flat
      }

      // Open vowels (ah, aa)
      if (lowRatio > 0.4 && totalEnergy > 50 * sensitivity) {
        return 'B' // Wide open
      }

      // Mid vowels (eh, ae)
      if (totalEnergy > 35 * sensitivity) {
        return 'D' // Narrow open
      }

      // Default to rest
      return 'A'
    },
    [sensitivity]
  )

  /**
   * Start analyzing audio from a media element (for TTS playback)
   */
  const analyzeAudioElement = useCallback(
    (audioElement: HTMLAudioElement) => {
      if (!audioContextRef.current || !analyserRef.current) return

      setIsAnalyzing(true)

      try {
        // Create media source
        const source = audioContextRef.current.createMediaElementSource(audioElement)
        source.connect(analyserRef.current)
        analyserRef.current.connect(audioContextRef.current.destination)

        // Start analysis loop
        const frequencyData = new Uint8Array(analyserRef.current.frequencyBinCount)

        const analyze = () => {
          if (!analyserRef.current) return

          analyserRef.current.getByteFrequencyData(frequencyData)
          const phoneme = detectPhonemeFromFrequencies(frequencyData)

          // Update current phoneme
          if (phoneme !== lastPhonemeRef.current) {
            const now = Date.now()
            const duration = now - phonemeStartTimeRef.current

            // Save to history if duration > 50ms (avoid noise)
            if (duration > 50 && lastPhonemeRef.current !== 'X') {
              setPhonemeHistory((prev) => [
                ...prev.slice(-50), // Keep last 50 phonemes
                {
                  phoneme: lastPhonemeRef.current,
                  timestamp: phonemeStartTimeRef.current,
                  duration,
                  confidence: 0.8, // Could be improved with ML
                },
              ])
            }

            lastPhonemeRef.current = phoneme
            phonemeStartTimeRef.current = now
            setCurrentPhoneme(phoneme)
          }

          animationFrameRef.current = requestAnimationFrame(analyze)
        }

        analyze()
      } catch (error) {
        console.error('Error analyzing audio:', error)
        setIsAnalyzing(false)
      }
    },
    [detectPhonemeFromFrequencies]
  )

  /**
   * Analyze TTS synthesis utterance
   * Note: Web Speech API doesn't expose audio stream, so we use frequency-based detection
   */
  const analyzeSpeechSynthesis = useCallback(
    (utterance: SpeechSynthesisUtterance) => {
      setIsAnalyzing(true)

      // Create a simple animation based on speech timing
      // Since we can't access audio stream directly, use estimated timing
      const text = utterance.text
      const words = text.split(/\s+/)

      let wordIndex = 0
      const wordDuration = 300 // Average ms per word

      const simulatePhonemes = () => {
        if (wordIndex >= words.length) {
          setCurrentPhoneme('X')
          setIsAnalyzing(false)
          return
        }

        const word = words[wordIndex]
        const phonemes = estimatePhonemesFromText(word)

        let phonemeIndex = 0
        const phonemeInterval = setInterval(() => {
          if (phonemeIndex >= phonemes.length) {
            clearInterval(phonemeInterval)
            wordIndex++
            setTimeout(simulatePhonemes, 50) // Brief pause between words
            return
          }

          setCurrentPhoneme(phonemes[phonemeIndex])
          phonemeIndex++
        }, wordDuration / phonemes.length)
      }

      utterance.addEventListener('start', simulatePhonemes)
      utterance.addEventListener('end', () => {
        setCurrentPhoneme('X')
        setIsAnalyzing(false)
      })
    },
    []
  )

  /**
   * Simple phoneme estimation from text (fallback method)
   * This is a simplified version - real phoneme detection requires audio analysis
   */
  const estimatePhonemesFromText = (word: string): PhonemeType[] => {
    const phonemes: PhonemeType[] = []
    const lower = word.toLowerCase()

    for (let i = 0; i < lower.length; i++) {
      const char = lower[i]
      const nextChar = lower[i + 1]

      // Consonants
      if ('mbp'.includes(char)) {
        phonemes.push('C') // Closed mouth
      } else if ('fv'.includes(char)) {
        phonemes.push('F') // Teeth on lip
      } else if (char === 't' && nextChar === 'h') {
        phonemes.push('G') // Tongue visible
        i++ // Skip next char
      } else if ('szxc'.includes(char)) {
        phonemes.push('F') // Fricatives
      }
      // Vowels
      else if ('ou'.includes(char) || (char === 'o' && nextChar === 'o')) {
        phonemes.push('E') // Round
      } else if ('ei'.includes(char) || (char === 'e' && nextChar === 'e')) {
        phonemes.push('H') // Wide
      } else if ('a'.includes(char) && nextChar === 'a') {
        phonemes.push('B') // Open
        i++
      } else if ('ae'.includes(char)) {
        phonemes.push('D') // Mid open
      } else {
        phonemes.push('A') // Default
      }
    }

    return phonemes.length > 0 ? phonemes : ['A']
  }

  /**
   * Stop analysis
   */
  const stopAnalysis = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    setCurrentPhoneme('X')
    setIsAnalyzing(false)
  }, [])

  /**
   * Clear phoneme history
   */
  const clearHistory = useCallback(() => {
    setPhonemeHistory([])
  }, [])

  return {
    currentPhoneme,
    phonemeHistory,
    isAnalyzing,
    analyzeAudioElement,
    analyzeSpeechSynthesis,
    stopAnalysis,
    clearHistory,
  }
}
