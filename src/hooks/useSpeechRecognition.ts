import { useState, useEffect, useCallback } from 'react'

// Define types for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message?: string
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
  onstart: ((event: Event) => void) | null
  onend: ((event: Event) => void) | null
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
}

declare global {
  interface Window {
    SpeechRecognition: new () => ISpeechRecognition
    webkitSpeechRecognition: new () => ISpeechRecognition
  }
}

interface UseSpeechRecognitionOptions {
  language?: string
  continuous?: boolean
  interimResults?: boolean
}

export const useSpeechRecognition = (options: UseSpeechRecognitionOptions = {}) => {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSupported, setIsSupported] = useState(false)

  const [recognition, setRecognition] = useState<ISpeechRecognition | null>(null)

  useEffect(() => {
    // Check if browser supports speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (SpeechRecognition) {
      setIsSupported(true)
      const recognitionInstance = new SpeechRecognition()

      recognitionInstance.continuous = options.continuous ?? false
      recognitionInstance.interimResults = options.interimResults ?? true
      recognitionInstance.lang = options.language || 'en-US'

      recognitionInstance.onstart = () => {
        setIsListening(true)
        setError(null)
      }

      recognitionInstance.onend = () => {
        setIsListening(false)
      }

      recognitionInstance.onerror = (event: SpeechRecognitionErrorEvent) => {
        setError(event.error)
        setIsListening(false)
      }

      recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
        let interim = ''
        let final = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            final += transcript + ' '
          } else {
            interim += transcript
          }
        }

        setInterimTranscript(interim)
        if (final) {
          setTranscript((prev) => prev + final)
        }
      }

      setRecognition(recognitionInstance)
    } else {
      setIsSupported(false)
      setError('Speech recognition is not supported in this browser')
    }

    return () => {
      if (recognition) {
        recognition.stop()
      }
    }
  }, [options.language])

  const start = useCallback(() => {
    if (recognition && !isListening) {
      setTranscript('')
      setInterimTranscript('')
      setError(null)
      try {
        recognition.start()
      } catch (err) {
        if (err instanceof Error && !err.message.includes('already started')) {
          setError(err.message)
        }
      }
    }
  }, [recognition, isListening])

  const stop = useCallback(() => {
    if (recognition && isListening) {
      recognition.stop()
    }
  }, [recognition, isListening])

  const reset = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
    setError(null)
  }, [])

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    start,
    stop,
    reset,
  }
}
