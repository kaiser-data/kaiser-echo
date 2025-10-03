import { useState, useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis'
import { apiClient } from '../utils/api'
import type { Message } from '../types'

const VoiceInterface = () => {
  const [isProcessing, setIsProcessing] = useState(false)

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
    continuous: false,
    interimResults: true,
  })

  const {
    isSupported: isSynthesisSupported,
    isSpeaking,
    speak,
    cancel: cancelSpeech,
  } = useSpeechSynthesis({
    language: language === 'de' ? 'de-DE' : 'en-US',
  })

  // Update voice state based on current status
  useEffect(() => {
    if (isListening) {
      setVoiceState('listening')
      setEmotion('neutral')
    } else if (isProcessing) {
      setVoiceState('processing')
      setEmotion('thinking')
    } else if (isSpeaking) {
      setVoiceState('speaking')
      setEmotion('happy')
    } else {
      setVoiceState('idle')
      setEmotion('neutral')
    }
  }, [isListening, isProcessing, isSpeaking, setVoiceState, setEmotion])

  // Handle completed transcript
  useEffect(() => {
    if (transcript && !isListening && !isProcessing) {
      handleSendMessage(transcript.trim())
      resetTranscript()
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

        // Speak the response
        if (isSynthesisSupported) {
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
            <p className="text-sm text-gray-600">Listening...</p>
            {interimTranscript && (
              <p className="text-lg text-gray-800 italic">{interimTranscript}</p>
            )}
          </div>
        )}

        {isProcessing && (
          <div className="flex items-center gap-2 justify-center">
            <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce delay-100" />
            <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce delay-200" />
            <p className="text-sm text-gray-600 ml-2">Processing...</p>
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

        {!isListening && !isProcessing && !isSpeaking && (
          <p className="text-sm text-gray-600">
            {language === 'de' ? 'Klicken Sie, um zu sprechen' : 'Click to speak'}
          </p>
        )}

        {recognitionError && (
          <p className="text-sm text-red-600 mt-2">Error: {recognitionError}</p>
        )}
      </div>

      {/* Instructions */}
      <div className="text-xs text-gray-500 text-center max-w-sm">
        {language === 'de'
          ? 'Drücken Sie die Mikrofon-Taste und sprechen Sie. Ihre Nachricht wird automatisch gesendet.'
          : 'Press the mic button and speak. Your message will be sent automatically.'}
      </div>
    </div>
  )
}

export default VoiceInterface
