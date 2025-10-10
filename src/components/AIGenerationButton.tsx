import { useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { apiClient } from '../utils/api'

const AIGenerationButton = () => {
  const { avatarConfig, setAvatarConfig, aiProvider, avatarRenderMode, setAvatarRenderMode } = useAppStore()
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 6, phoneme: '' })
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  // Helper function to crop mouth region from uploaded image
  const cropMouthRegion = async (imageDataUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }

        // Get mouth region parameters from config
        const mouthXPercent = avatarConfig.mouthX || 50
        const mouthYPercent = avatarConfig.mouthY || 70
        const mouthWidthPercent = avatarConfig.mouthRegionWidth || 30
        const mouthHeightPercent = avatarConfig.mouthRegionHeight || 20

        // Calculate crop region
        const cropX = (img.width * (mouthXPercent - mouthWidthPercent / 2)) / 100
        const cropY = (img.height * (mouthYPercent - mouthHeightPercent / 2)) / 100
        const cropWidth = (img.width * mouthWidthPercent) / 100
        const cropHeight = (img.height * mouthHeightPercent) / 100

        // Set canvas size to cropped region
        canvas.width = cropWidth
        canvas.height = cropHeight

        // Draw cropped region
        ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight)

        // Convert to base64
        resolve(canvas.toDataURL('image/jpeg', 0.95))
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = imageDataUrl
    })
  }

  const handleGenerate = async () => {
    if (!avatarConfig.uploadedImage) {
      setError('Please upload an avatar image first')
      return
    }

    // Reset all state for new generation
    setIsGenerating(true)
    setError(null)
    setShowModal(true)
    setProgress({ current: 0, total: 6, phoneme: 'Starting...' })

    // Simulated progress updates (since we can't get real-time progress without WebSockets)
    // Each position takes ~11s, so update every ~11s
    const phonemes = ['X', 'A', 'B', 'C', 'E', 'H']
    let progressIndex = 0
    const progressInterval = setInterval(() => {
      if (progressIndex < phonemes.length) {
        setProgress({
          current: progressIndex,
          total: 6,
          phoneme: phonemes[progressIndex],
        })
        progressIndex++
      }
    }, 11000) // Update every 11 seconds

    try {
      console.log('🎨 Cropping mouth region from uploaded image...')

      // Crop the mouth region before sending to AI
      const croppedMouthImage = await cropMouthRegion(avatarConfig.uploadedImage)
      console.log('✅ Mouth region cropped successfully')

      console.log('🎨 Starting AI generation request with cropped mouth region...')

      // Call backend API to generate 6 key positions with timeout for two-step process
      // Step 1: Base normalization (~14s) + Step 2: 6 positions (~11s each) = ~80s + overhead = ~120s total
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 120000) // 2 minutes timeout

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/generate-variations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: croppedMouthImage, // Send cropped mouth region instead of full image
          sessionId: useAppStore.getState().sessionId,
          provider: aiProvider, // Send user's provider preference
          cropParams: { // Send crop parameters for backend reference
            mouthX: avatarConfig.mouthX || 50,
            mouthY: avatarConfig.mouthY || 70,
            mouthRegionWidth: avatarConfig.mouthRegionWidth || 30,
            mouthRegionHeight: avatarConfig.mouthRegionHeight || 20,
          },
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
      console.log('📝 Variation keys:', Object.keys(data.variations || {}))

      // Validate we actually received variations
      if (!data.variations || Object.keys(data.variations).length === 0) {
        throw new Error('Backend returned success but no variations were generated. Please try again.')
      }

      // Validate we have all 6 expected phonemes
      const expectedPhonemes = ['X', 'A', 'B', 'C', 'E', 'H']
      const receivedPhonemes = Object.keys(data.variations)
      const missingPhonemes = expectedPhonemes.filter(p => !receivedPhonemes.includes(p))

      if (missingPhonemes.length > 0) {
        console.warn(`⚠️ Missing phonemes: ${missingPhonemes.join(', ')}`)
        console.warn(`⚠️ Only received: ${receivedPhonemes.join(', ')}`)
      }

      // Save generated variations
      const updatedConfig = {
        ...avatarConfig,
        generatedVariations: data.variations,
      }
      console.log('💾 Saving avatar config:', updatedConfig)
      setAvatarConfig(updatedConfig)

      // Auto-switch to AI render mode after successful generation
      setAvatarRenderMode('ai')
      console.log('✅ Auto-switched to AI render mode')

      setProgress({ current: 6, total: 6, phoneme: 'Complete!' })

      console.log('✅ After save, checking store...')
      setTimeout(() => {
        const currentConfig = useAppStore.getState().avatarConfig
        const currentRenderMode = useAppStore.getState().avatarRenderMode
        console.log('🔍 Store avatarConfig after save:', currentConfig)
        console.log('🔍 Store generatedVariations:', currentConfig.generatedVariations)
        console.log('🔍 Store avatarRenderMode:', currentRenderMode)

        // Final validation
        if (!currentConfig.generatedVariations || Object.keys(currentConfig.generatedVariations).length === 0) {
          console.error('❌ CRITICAL: Variations were not saved to store!')
          setError('Variations generated but failed to save. Please try regenerating.')
        }
      }, 100)

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
      clearInterval(progressInterval)
      setIsGenerating(false)
    }
  }

  if (!avatarConfig.uploadedImage) {
    return null
  }

  // Check if already generated
  const hasGeneratedVariations = avatarConfig.generatedVariations &&
    Object.keys(avatarConfig.generatedVariations).length > 0

  console.log('🔍 AIGenerationButton render:', {
    hasGeneratedVariations,
    variationKeys: avatarConfig.generatedVariations ? Object.keys(avatarConfig.generatedVariations) : [],
    avatarRenderMode
  })

  return (
    <>
      <div className="flex gap-2 items-center">
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className={`btn-secondary text-sm ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Generate AI-powered realistic mouth variations"
        >
          {hasGeneratedVariations ? '🔄 Regenerate AI Mouth' : '✨ Generate AI Mouth'}
        </button>

        {hasGeneratedVariations && (
          <div className="flex gap-1 bg-purple-50 border border-purple-200 rounded-lg p-1">
            <button
              onClick={() => setAvatarRenderMode('ai')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                avatarRenderMode === 'ai'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
              title="Use AI-generated photorealistic mouth variations"
            >
              ✨ AI
            </button>
            <button
              onClick={() => setAvatarRenderMode('overlay')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                avatarRenderMode === 'overlay'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
              title="Use drawn mouth overlay (faster, less realistic)"
            >
              🎨 Overlay
            </button>
          </div>
        )}
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
                    💡 <strong>Tip:</strong> This takes about 1-2 minutes. We're generating 6
                    key mouth positions optimized for audio-driven natural speech!
                  </p>
                </div>
              </div>
            )}

            {!isGenerating && !error && (
              <div className="space-y-4">
                <div className="text-center py-6">
                  <div className="text-6xl mb-4">✅</div>
                  <p className="text-gray-600">
                    Successfully generated {progress.total} key mouth positions!
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Your avatar will now use audio-driven natural lip-sync
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
                  <button
                    onClick={() => {
                      setError(null)
                      handleGenerate()
                    }}
                    className="btn-primary flex-1"
                  >
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
