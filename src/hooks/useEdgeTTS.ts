import { useState, useCallback, useRef } from 'react'

interface UseCartesiaTTSOptions {
  language?: string
  rate?: number
  pitch?: number
  volume?: number
  voiceName?: string
  onUtteranceCreated?: (utterance: SpeechSynthesisUtterance) => void
}

const CARTESIA_VOICES = {
  'en-US': [
    {
      id: '98a34ef2-2140-4c28-9c71-663dc4dd7022',
      name: 'Clyde',
      description: 'Recommended Cartesia voice - natural and expressive'
    },
    {
      id: 'a0e99841-438c-4a64-b679-ae26e5e21b7e',
      name: 'Calm Lady',
      description: 'Soothing and warm, perfect for friendly conversation'
    },
    {
      id: '694f9389-aac1-45b6-b726-9d9369183238',
      name: 'Barbershop Man',
      description: 'Known good voice from Cartesia docs'
    },
    {
      id: '79a125e8-cd45-4c13-8a67-188112f4dd22',
      name: 'British Lady',
      description: 'Elegant and expressive with natural intonation'
    }
  ],
  'de-DE': [
    {
      id: '98a34ef2-2140-4c28-9c71-663dc4dd7022',
      name: 'Clyde (German)',
      description: 'Natural voice for German'
    }
  ]
}

export const useCartesiaTTS = (options: UseCartesiaTTSOptions = {}) => {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const speak = useCallback(
    async (text: string, language?: string) => {
      if (!text.trim()) return

      try {
        setIsLoading(true)

        // Determine language and voice
        const targetLang = (language || options.language || 'en-US') as keyof typeof CARTESIA_VOICES
        const voiceList = CARTESIA_VOICES[targetLang] || CARTESIA_VOICES['en-US']

        // Use "Clyde" as primary voice (index 0)
        const selectedVoice = voiceList[0]

        // Initialize Cartesia client
        const apiKey = import.meta.env.VITE_CARTESIA_API_KEY

        console.log('🎤 Cartesia API Key available:', !!apiKey)
        console.log('🎤 API Key preview:', apiKey ? `${apiKey.slice(0, 10)}...` : 'none')
        console.log('🎤 Selected voice:', selectedVoice.name, selectedVoice.id)

        if (!apiKey) {
          console.log('❌ No Cartesia API key found - falling back to browser voices')
          throw new Error('No Cartesia API key - falling back to browser voices')
        }

        console.log('🚀 Making direct API call to Cartesia...')

        // Direct HTTP API call to Cartesia using official format (optimized for speed)
        const response = await fetch('https://api.cartesia.ai/tts/bytes', {
          method: 'POST',
          headers: {
            'Cartesia-Version': '2025-04-16',
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            transcript: text,
            model_id: 'sonic-2',
            voice: {
              mode: 'id',
              id: selectedVoice.id
            },
            output_format: {
              container: 'mp3',
              encoding: 'mp3',
              sample_rate: 44100  // High quality for best voice
            }
          })
        })

        console.log('🎵 Cartesia HTTP response status:', response.status)
        console.log('🎵 Cartesia HTTP response ok:', response.ok)

        if (!response.ok) {
          const errorText = await response.text()
          console.error('❌ Cartesia API error:', errorText)
          throw new Error(`Cartesia API error: ${response.status} ${errorText}`)
        }

        const audioBuffer = await response.arrayBuffer()
        console.log('🎵 Cartesia audio buffer size:', audioBuffer.byteLength, 'bytes')

        // Convert response to audio blob
        const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' })
        const audioUrl = URL.createObjectURL(audioBlob)

        // Stop any current playback
        if (audioRef.current) {
          audioRef.current.pause()
          audioRef.current = null
        }

        // Create and play audio
        const audio = new Audio(audioUrl)
        audioRef.current = audio

        audio.onloadstart = () => {
          setIsLoading(false)
          setIsSpeaking(true)
        }

        audio.oncanplay = () => {
          setIsLoading(false)
        }

        audio.onended = () => {
          setIsSpeaking(false)
          URL.revokeObjectURL(audioUrl)
          audioRef.current = null
        }

        audio.onerror = (error) => {
          console.error('Audio playback error:', error)
          setIsSpeaking(false)
          setIsLoading(false)
          URL.revokeObjectURL(audioUrl)
          audioRef.current = null
          throw error
        }

        // Create utterance for phoneme sync compatibility
        if (options.onUtteranceCreated) {
          const utterance = new SpeechSynthesisUtterance(text)
          utterance.lang = targetLang
          utterance.rate = options.rate || 1.0
          utterance.pitch = options.pitch || 1.0
          utterance.volume = options.volume || 1.0
          options.onUtteranceCreated(utterance)
        }

        console.log(`✅ Using Cartesia voice: ${selectedVoice.name}`)
        console.log(`🎵 Audio blob size: ${audioBlob.size} bytes`)
        await audio.play()

      } catch (error) {
        console.error('Cartesia TTS error:', error)
        setIsLoading(false)
        setIsSpeaking(false)

        // Fallback to Web Speech API
        console.log('🔄 Falling back to Web Speech API')
        console.log('❌ Cartesia error details:', error.message)
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = language || options.language || 'en-US'
        utterance.rate = options.rate || 1.0
        utterance.pitch = options.pitch || 1.0
        utterance.volume = options.volume || 1.0

        utterance.onstart = () => setIsSpeaking(true)
        utterance.onend = () => setIsSpeaking(false)
        utterance.onerror = () => setIsSpeaking(false)

        if (options.onUtteranceCreated) {
          options.onUtteranceCreated(utterance)
        }

        window.speechSynthesis.speak(utterance)
      }
    },
    [options]
  )

  const cancel = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
    setIsLoading(false)
  }, [])

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
    }
    window.speechSynthesis.pause()
  }, [])

  const resume = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play()
    }
    window.speechSynthesis.resume()
  }, [])

  return {
    isSupported,
    isSpeaking,
    isLoading,
    speak,
    cancel,
    pause,
    resume,
    voices: CARTESIA_VOICES,
  }
}