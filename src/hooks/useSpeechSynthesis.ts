import { useState, useCallback, useEffect, useRef } from 'react'

interface UseSpeechSynthesisOptions {
  language?: string
  rate?: number
  pitch?: number
  volume?: number
  onUtteranceCreated?: (utterance: SpeechSynthesisUtterance) => void
}

export const useSpeechSynthesis = (options: UseSpeechSynthesisOptions = {}) => {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => {
    setIsSupported('speechSynthesis' in window)

    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices()
        setVoices(availableVoices)
      }

      loadVoices()
      window.speechSynthesis.onvoiceschanged = loadVoices
    }
  }, [])

  const speak = useCallback(
    (text: string, language?: string) => {
      if (!isSupported) {
        console.error('Speech synthesis is not supported')
        return
      }

      // Cancel any ongoing speech
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      currentUtteranceRef.current = utterance

      // Set language
      const targetLang = language || options.language || 'en-US'
      utterance.lang = targetLang

      // Find appropriate voice for language
      const voice = voices.find((v) => v.lang.startsWith(targetLang.split('-')[0]))
      if (voice) {
        utterance.voice = voice
      }

      // Set speech properties
      utterance.rate = options.rate || 1.0
      utterance.pitch = options.pitch || 1.0
      utterance.volume = options.volume || 1.0

      utterance.onstart = () => {
        setIsSpeaking(true)
      }

      utterance.onend = () => {
        setIsSpeaking(false)
        currentUtteranceRef.current = null
      }

      utterance.onerror = (error) => {
        console.error('Speech synthesis error:', error)
        setIsSpeaking(false)
        currentUtteranceRef.current = null
      }

      // Notify parent component about utterance creation (for phoneme analysis)
      if (options.onUtteranceCreated) {
        options.onUtteranceCreated(utterance)
      }

      window.speechSynthesis.speak(utterance)
    },
    [isSupported, voices, options]
  )

  const cancel = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    }
  }, [isSupported])

  const pause = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.pause()
    }
  }, [isSupported])

  const resume = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.resume()
    }
  }, [isSupported])

  return {
    isSupported,
    isSpeaking,
    voices,
    speak,
    cancel,
    pause,
    resume,
  }
}
