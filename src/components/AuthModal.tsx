import { useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { apiClient } from '../utils/api'

const AuthModal = () => {
  const { sessionId, setShowAuthModal, setUser } = useAppStore()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    try {
      const response = await apiClient.sendMagicLink(email, sessionId)

      if (response.success) {
        setMessage({
          type: 'success',
          text: 'Check your email for a magic link to complete sign in!',
        })
        setEmail('')
      } else {
        setMessage({
          type: 'error',
          text: response.error || 'Failed to send magic link. Please try again.',
        })
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'An error occurred. Please try again.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Save Your Progress</h2>
            <p className="text-sm text-gray-600 mt-1">
              Get a magic link to save your conversations and avatar across devices
            </p>
          </div>
          <button
            onClick={() => setShowAuthModal(false)}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="input-field"
              disabled={isLoading}
            />
          </div>

          {message && (
            <div
              className={`p-4 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              <p className="text-sm">{message.text}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Sending...' : 'Send Magic Link'}
          </button>

          <div className="text-xs text-gray-500 text-center">
            No password needed. We'll send you a secure link to sign in.
          </div>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-600 text-center">
            By signing in, you agree to save your conversation data and avatar preferences.
            You can delete your data at any time.
          </p>
        </div>
      </div>
    </div>
  )
}

export default AuthModal
