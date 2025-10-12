import { useState, useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis'
import { useCartesiaTTS } from '../hooks/useEdgeTTS'
import { apiClient } from '../utils/api'
import { phonemeSyncManager } from '../utils/phonemeSync'
import type { Message } from '../types'

const VoiceInterface = () => {
  const [isProcessing, setIsProcessing] = useState(false)
  const [textInput, setTextInput] = useState('')
  const [silenceTimer, setSilenceTimer] = useState<NodeJS.Timeout | null>(null)
  const [useHighQuality, setUseHighQuality] = useState(true) // Toggle for Edge-TTS

  const {
    sessionId,
    user,
    language,
    addMessage,
    setVoiceState,
    setEmotion,
    addFact,
    voiceState,
  } = useAppStore()

  const {
    isSupported: isRecognitionSupported,
    isListening,
    transcript,
    interimTranscript,
    error: recognitionError,
    start: startListening,
    stop: stopListening,
    reset: resetTranscript,
  } = useSpeechRecognition({
    language: language === 'de' ? 'de-DE' : 'en-US',
    continuous: true,
    interimResults: true,
  })

  // High-quality Cartesia TTS (primary)
  const {
    isSupported: isCartesiaTTSSupported,
    isSpeaking: isCartesiaSpeaking,
    isLoading: isCartesiaLoading,
    speak: cartesiaSpeak,
    cancel: cancelCartesiaSpech,
  } = useCartesiaTTS({
    language: language === 'de' ? 'de-DE' : 'en-US',
    rate: 1.0, // Natural speed for emotional expression
    onUtteranceCreated: (utterance) => {
      phonemeSyncManager.setUtterance(utterance)
    },
  })

  // Fallback Web Speech API
  const {
    isSupported: isSynthesisSupported,
    isSpeaking: isWebSpeaking,
    speak: webSpeak,
    cancel: cancelWebSpeech,
  } = useSpeechSynthesis({
    language: language === 'de' ? 'de-DE' : 'en-US',
    onUtteranceCreated: (utterance) => {
      phonemeSyncManager.setUtterance(utterance)
    },
  })

  // Unified speech state
  const isSpeaking = useHighQuality ? isCartesiaSpeaking : isWebSpeaking
  const speak = useHighQuality ? cartesiaSpeak : webSpeak
  const cancelSpeech = useHighQuality ? cancelCartesiaSpech : cancelWebSpeech

  // Auto-stop after 4 seconds of silence
  useEffect(() => {
    if (isListening) {
      // Clear any existing timer
      if (silenceTimer) {
        clearTimeout(silenceTimer)
        setSilenceTimer(null)
      }

      // Start 4-second timer whenever:
      // 1. User starts speaking (interim transcript appears)
      // 2. User stops speaking (interim transcript clears)
      // 3. Just started listening
      const timer = setTimeout(() => {
        stopListening()
      }, 4000)
      setSilenceTimer(timer)
    } else {
      // Clear timer when not listening
      if (silenceTimer) {
        clearTimeout(silenceTimer)
        setSilenceTimer(null)
      }
    }

    return () => {
      if (silenceTimer) clearTimeout(silenceTimer)
    }
  }, [isListening, interimTranscript, stopListening])

  // Update voice state based on current status
  useEffect(() => {
    if (isListening) {
      setVoiceState('listening')
      setEmotion('neutral')
    } else if (isProcessing || isCartesiaLoading) {
      setVoiceState('processing')
      setEmotion('thinking')
    } else if (isSpeaking) {
      setVoiceState('speaking')
      setEmotion('happy')
    } else {
      setVoiceState('idle')
      setEmotion('neutral')
    }
  }, [isListening, isProcessing, isCartesiaLoading, isSpeaking, setVoiceState, setEmotion])

  // Handle completed transcript - only when manually stopped
  useEffect(() => {
    if (transcript && !isListening && !isProcessing) {
      // Small delay to ensure transcript is complete
      const timer = setTimeout(() => {
        handleSendMessage(transcript.trim())
        resetTranscript()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [transcript, isListening, isProcessing])

  const handleSendMessage = async (text: string) => {
    if (!text) return

    setIsProcessing(true)
    setEmotion('thinking')

    // Add user message
    const userMessage: Message = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content: text,
      language,
      timestamp: Date.now(),
    }
    addMessage(userMessage)

    try {
      // Send to API
      const response = await apiClient.chat({
        sessionId,
        message: text,
        language,
        userId: user?.userId,
      })

      if (response.success && response.data) {
        const { response: aiResponse, facts, memoryUsed } = response.data

        // Add assistant message
        const assistantMessage: Message = {
          id: `msg_${Date.now()}_assistant`,
          role: 'assistant',
          content: aiResponse,
          language,
          timestamp: Date.now(),
        }
        addMessage(assistantMessage)

        // Add any new facts
        if (facts && facts.length > 0) {
          facts.forEach((fact) => addFact(fact))
        }

        // Speak the response with high-quality voice
        if (useHighQuality && isCartesiaTTSSupported) {
          speak(aiResponse, language === 'de' ? 'de-DE' : 'en-US')
        } else if (isSynthesisSupported) {
          speak(aiResponse, language === 'de' ? 'de-DE' : 'en-US')
        }

        // Show memory indicator if memory was used
        if (memoryUsed) {
          console.log('💡 Memory was used in this response')
        }
      } else {
        console.error('Chat API error:', response.error)
        addMessage({
          id: `msg_${Date.now()}_error`,
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          language,
          timestamp: Date.now(),
        })
      }
    } catch (error) {
      console.error('Error sending message:', error)
      addMessage({
        id: `msg_${Date.now()}_error`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        language,
        timestamp: Date.now(),
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleMicClick = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  const handleStopSpeaking = () => {
    cancelSpeech()
    phonemeSyncManager.reset()
  }

  if (!isRecognitionSupported) {
    return (
      <div className="card max-w-md mx-auto text-center">
        <p className="text-red-600">
          ⚠️ Speech recognition is not supported in your browser.
        </p>
        <p className="text-sm text-gray-600 mt-2">
          Please use Chrome, Edge, or Safari for the best experience.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Mic Button */}
      <button
        onClick={handleMicClick}
        disabled={isProcessing || isSpeaking}
        className={`
          relative w-24 h-24 rounded-full shadow-2xl transition-all duration-300
          ${
            isListening
              ? 'bg-red-500 hover:bg-red-600 scale-110 animate-pulse'
              : 'bg-primary-600 hover:bg-primary-700'
          }
          ${isProcessing || isSpeaking ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <div className="flex items-center justify-center h-full">
          {isListening ? (
            <svg
              className="w-12 h-12 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg
              className="w-12 h-12 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          )}
        </div>

        {isListening && (
          <span className="absolute -inset-2 rounded-full bg-red-400 opacity-75 animate-ping" />
        )}
      </button>

      {/* Status Text */}
      <div className="text-center min-h-[60px]">
        {isListening && (
          <div className="space-y-2">
            <p className="text-sm text-green-600 font-medium">🎤 Listening - Auto-stops after 4 seconds of silence</p>
            {interimTranscript && (
              <p className="text-lg text-gray-800 italic">{interimTranscript}</p>
            )}
          </div>
        )}

        {(isProcessing || isCartesiaLoading) && (
          <div className="flex items-center gap-2 justify-center">
            <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce delay-100" />
            <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce delay-200" />
            <p className="text-sm text-gray-600 ml-2">
              {isCartesiaLoading ? 'Generating Cartesia AI voice...' : 'Processing...'}
            </p>
          </div>
        )}

        {isSpeaking && (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">Speaking...</p>
            <button
              onClick={handleStopSpeaking}
              className="text-xs text-primary-600 hover:text-primary-700 underline"
            >
              Stop
            </button>
          </div>
        )}

        {!isListening && !isProcessing && !isCartesiaLoading && !isSpeaking && (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              {language === 'de' ? 'Klicken Sie, um zu sprechen' : 'Click to speak'}
            </p>
            <div className="flex items-center gap-2 justify-center">
              <button
                onClick={() => setUseHighQuality(!useHighQuality)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  useHighQuality
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : 'bg-gray-100 text-gray-600 border border-gray-300'
                }`}
              >
                {useHighQuality ? '🎤 HD Voice' : '🔊 Standard'}
              </button>
              <span className="text-xs text-gray-400">
                {useHighQuality ? 'Cartesia AI' : 'Browser TTS'}
              </span>
              <button
                onClick={() => {
                  const testText = "Hello, this is a test of Cartesia voice synthesis."
                  console.log('🧪 Testing Cartesia with:', testText)
                  speak(testText, language === 'de' ? 'de-DE' : 'en-US')
                }}
                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded mt-1"
              >
                Test Voice
              </button>
            </div>
          </div>
        )}

        {recognitionError && (
          <p className="text-sm text-red-600 mt-2">Error: {recognitionError}</p>
        )}
      </div>

      {/* Instructions */}
      <div className="text-xs text-gray-500 text-center max-w-sm">
        {language === 'de'
          ? 'Klicken Sie zum Starten und sprechen Sie. Stoppt automatisch nach 4 Sekunden Stille.'
          : 'Click to start speaking. Automatically stops after 4 seconds of silence.'}
      </div>

      {/* Text Input Alternative */}
      <div className="w-full max-w-md mt-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && textInput.trim() && !isProcessing && !isSpeaking) {
                handleSendMessage(textInput.trim())
                setTextInput('')
              }
            }}
            disabled={isProcessing || isSpeaking || isListening}
            placeholder={language === 'de' ? 'Nachricht eingeben...' : 'Type a message...'}
            className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={() => {
              if (textInput.trim()) {
                handleSendMessage(textInput.trim())
                setTextInput('')
              }
            }}
            disabled={!textInput.trim() || isProcessing || isSpeaking || isListening}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {language === 'de' ? 'Senden' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default VoiceInterface
