import { useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { apiClient } from '../utils/api'

const AIGenerationButton = () => {
  const { avatarConfig, setAvatarConfig, aiProvider } = useAppStore()
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 9, phoneme: '' })
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  const handleGenerate = async () => {
    if (!avatarConfig.uploadedImage) {
      setError('Please upload an avatar image first')
      return
    }

    setIsGenerating(true)
    setError(null)
    setShowModal(true)
    setProgress({ current: 0, total: 9, phoneme: 'Starting...' })

    try {
      console.log('🎨 Starting AI generation request...')

      // Call backend API to generate variations with extended timeout for two-step process
      // Step 1: Base normalization (~14s) + Step 2: 9 variations (~11s each) = ~114s + overhead = ~180s total
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 180000) // 3 minutes timeout

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/generate-variations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: avatarConfig.uploadedImage,
          sessionId: useAppStore.getState().sessionId,
          provider: aiProvider, // Send user's provider preference
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      console.log('✅ Response received:', response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Response not OK:', errorText)
        throw new Error(`Generation failed: ${response.statusText}`)
      }

      const data = await response.json()
      console.log('📦 Response data:', data)

      if (!data.success) {
        console.error('❌ Generation not successful:', data.error)
        throw new Error(data.error || 'Generation failed')
      }

      console.log('✨ Variations received:', Object.keys(data.variations || {}).length)

      // Save generated variations
      setAvatarConfig({
        ...avatarConfig,
        generatedVariations: data.variations,
      })

      setProgress({ current: 9, total: 9, phoneme: 'Complete!' })

      // Show success message
      setTimeout(() => {
        setShowModal(false)
      }, 2000)
    } catch (err) {
      console.error('🔴 Generation error:', err)
      if (err instanceof Error) {
        console.error('🔴 Error name:', err.name)
        console.error('🔴 Error message:', err.message)
      }
      setError(err instanceof Error ? err.message : 'Failed to generate variations')
    } finally {
      setIsGenerating(false)
    }
  }

  if (!avatarConfig.uploadedImage) {
    return null
  }

  // Check if already generated
  const hasGeneratedVariations = avatarConfig.generatedVariations &&
    Object.keys(avatarConfig.generatedVariations).length > 0

  return (
    <>
      <div className="flex flex-col gap-2">
        {/* AI Provider Selector */}
        <select
          value={aiProvider}
          onChange={(e) => useAppStore.getState().setAiProvider(e.target.value as any)}
          className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          disabled={isGenerating}
        >
          <option value="auto">🤖 Auto (Best Available)</option>
          <option value="gemini">🍌 Gemini (Nano Banana) - Fast & Stable</option>
          <option value="bfl">⚡ FLUX Ultra - Most Realistic</option>
          <option value="fal">🚀 FAL.ai - Fastest</option>
          <option value="replicate">🔁 Replicate</option>
        </select>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className={`btn-secondary text-sm ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Generate AI-powered realistic mouth variations"
        >
          {hasGeneratedVariations ? '🔄 Regenerate AI Mouth' : '✨ Generate AI Mouth'}
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              {isGenerating ? 'Generating AI Variations...' : 'Generation Complete!'}
            </h2>

            {isGenerating && (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Creating photorealistic mouth variations using FLUX AI
                </p>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-full transition-all duration-500 ease-out"
                      style={{
                        width: `${(progress.current / progress.total) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>
                      Phoneme: <strong className="font-mono">[{progress.phoneme}]</strong>
                    </span>
                    <span>
                      {progress.current} / {progress.total}
                    </span>
                  </div>
                </div>

                {/* Animation */}
                <div className="flex justify-center py-6">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl">🎨</span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    💡 <strong>Tip:</strong> This takes about 30-60 seconds. We're generating 9
                    photorealistic mouth positions for perfect lip-sync!
                  </p>
                </div>
              </div>
            )}

            {!isGenerating && !error && (
              <div className="space-y-4">
                <div className="text-center py-6">
                  <div className="text-6xl mb-4">✅</div>
                  <p className="text-gray-600">
                    Successfully generated {progress.total} AI mouth variations!
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Your avatar will now use photorealistic lip-sync
                  </p>
                </div>

                <button onClick={() => setShowModal(false)} className="btn-primary w-full">
                  Close
                </button>
              </div>
            )}

            {error && (
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 font-semibold">❌ Generation Failed</p>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Common issues:</strong>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>FAL_API_KEY not configured in backend</li>
                      <li>Image URL not accessible</li>
                      <li>API rate limit reached</li>
                    </ul>
                  </p>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                    Close
                  </button>
                  <button onClick={handleGenerate} className="btn-primary flex-1">
                    Try Again
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default AIGenerationButton
