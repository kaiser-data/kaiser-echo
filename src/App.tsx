import { useEffect } from 'react'
import { useAppStore } from './store/useAppStore'
import Avatar from './components/Avatar'
import RealisticAvatar from './components/RealisticAvatar'
import VoiceInterface from './components/VoiceInterface'
import ChatHistory from './components/ChatHistory'
import AvatarCustomizer from './components/AvatarCustomizer'
import AvatarUploader from './components/AvatarUploader'
import AvatarPositionControls from './components/AvatarPositionControls'
import AIGenerationButton from './components/AIGenerationButton'
import AIProviderSelector from './components/AIProviderSelector'
import AuthModal from './components/AuthModal'
import LanguageSelector from './components/LanguageSelector'

function App() {
  const {
    user,
    messages,
    facts,
    avatarConfig,
    showAuthModal,
    showAvatarCustomizer,
    setShowAuthModal,
    setShowAvatarCustomizer,
    reset,
  } = useAppStore()

  // Show auth modal after 10 message exchanges (20 messages total)
  // Only show once per session (won't re-appear if closed)
  useEffect(() => {
    const hasShownAuthModal = sessionStorage.getItem('authModalShown')

    if (!user && messages.length >= 20 && !showAuthModal && !hasShownAuthModal) {
      const timer = setTimeout(() => {
        setShowAuthModal(true)
        sessionStorage.setItem('authModalShown', 'true')
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [messages.length, user, showAuthModal, setShowAuthModal])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-2">
            Kaiser Echo
          </h1>
          <p className="text-gray-600 text-lg">
            Your Bilingual Voice Assistant with Memory
          </p>
        </header>

        {/* Top Actions Bar */}
        <div className="flex justify-center items-center gap-4 mb-8 flex-wrap">
          <LanguageSelector />

          {!avatarConfig.uploadedImage && (
            <button
              onClick={() => setShowAvatarCustomizer(true)}
              className="btn-secondary"
            >
              🎨 Customize Avatar
            </button>
          )}

          <button
            onClick={() => setShowAvatarCustomizer(true)}
            className="btn-secondary"
          >
            {avatarConfig.uploadedImage ? '🖼️ Change Avatar' : '📸 Upload Avatar'}
          </button>

          {avatarConfig.uploadedImage && (
            <>
              <AIProviderSelector />
              <AvatarPositionControls />
              <AIGenerationButton />
            </>
          )}

          {(messages.length > 0 || facts.length > 0) && (
            <button
              onClick={() => {
                if (confirm('Clear all messages and memory? This will start a fresh conversation.')) {
                  reset()
                }
              }}
              className="btn-secondary"
            >
              🗑️ Clear Memory
            </button>
          )}

          {!user && (
            <button
              onClick={() => setShowAuthModal(true)}
              className="btn-secondary"
            >
              💾 Save Progress
            </button>
          )}

          {user && (
            <div className="px-4 py-2 bg-green-100 text-green-800 rounded-lg border-2 border-green-300">
              ✓ Signed in as {user.email}
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="grid md:grid-cols-2 gap-8 items-start">
          {/* Left Column - Avatar and Voice */}
          <div className="space-y-8">
            {avatarConfig.uploadedImage ? <RealisticAvatar /> : <Avatar />}
            <VoiceInterface />

            {/* Memory Indicator */}
            {facts.length > 0 && (
              <div className="card max-w-md mx-auto">
                <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <span>💡</span>
                  <span>What I Remember About You</span>
                </h3>
                <ul className="space-y-1 text-sm text-gray-600">
                  {facts.slice(0, 5).map((fact) => (
                    <li key={fact.id} className="flex items-start gap-2">
                      <span className="text-primary-600">•</span>
                      <span>
                        <span className="font-medium capitalize">{fact.factType}:</span>{' '}
                        {fact.factValue}
                      </span>
                    </li>
                  ))}
                  {facts.length > 5 && (
                    <li className="text-gray-500 italic">
                      +{facts.length - 5} more facts
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>

          {/* Right Column - Chat History */}
          <div>
            <ChatHistory />
          </div>
        </div>

        {/* Info Banner */}
        <div className="mt-12 max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-primary-600">
            <h3 className="font-semibold text-gray-800 mb-2">
              🎯 Demo Portfolio Project
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              This is a showcase of full-stack development skills featuring:
              <strong className="text-gray-800"> real-time voice interaction</strong>,
              <strong className="text-gray-800"> conversation memory</strong>,
              <strong className="text-gray-800"> bilingual support (English & German)</strong>,
              and a <strong className="text-gray-800">customizable animated avatar</strong>.
              Built with React, Cloudflare Workers, Supabase, and modern web APIs.
            </p>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAvatarCustomizer && <AvatarUploader />}
      {showAuthModal && <AuthModal />}
    </div>
  )
}

export default App
