import { useEffect, useRef } from 'react'
import { useAppStore } from '../store/useAppStore'

const ChatHistory = () => {
  const { messages } = useAppStore()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="card max-w-2xl mx-auto text-center py-12">
        <div className="text-6xl mb-4">👋</div>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">
          Welcome to Kaiser Echo!
        </h3>
        <p className="text-gray-600">
          Click the microphone to start a conversation.
          <br />I can speak both English and German!
        </p>
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      className="card max-w-2xl mx-auto max-h-96 overflow-y-auto space-y-4"
    >
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-xs md:max-w-md px-4 py-3 rounded-2xl ${
              message.role === 'user'
                ? 'bg-primary-600 text-white rounded-br-none'
                : 'bg-gray-200 text-gray-800 rounded-bl-none'
            }`}
          >
            <p className="text-sm whitespace-pre-wrap break-words">
              {message.content}
            </p>
            <p className="text-xs mt-1 opacity-70">
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default ChatHistory
