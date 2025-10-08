import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { phonemeSyncManager } from '../utils/phonemeSync'
import { useAudioAnalyzer, type MouthPosition } from '../hooks/useAudioAnalyzer'
import type { PhonemeType } from '../hooks/usePhonemeDetection'

/**
 * Realistic Avatar with AUDIO-DRIVEN lip-sync animation
 * Uses Web Audio API for real-time analysis and 6 key mouth positions
 * Falls back to timeline-based approach for compatibility
 */
const RealisticAvatar = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>()
  const uploadedImageRef = useRef<HTMLImageElement | null>(null)
  const variationImagesRef = useRef<Map<string, HTMLImageElement>>(new Map()) // Now stores 6 keys: X, A, B, C, E, H

  const [isImageLoaded, setIsImageLoaded] = useState(false)
  const [blinkState, setBlinkState] = useState(0) // 0 = open, 1 = closing, 2 = closed, 3 = opening
  const [currentMouthPosition, setCurrentMouthPosition] = useState<MouthPosition>('X')
  const [useAIVariations, setUseAIVariations] = useState(false)
  const [useAudioDriven, setUseAudioDriven] = useState(true) // Prefer audio-driven

  // Cross-fade transition state
  const previousMouthPositionRef = useRef<MouthPosition>('X')
  const transitionStartTimeRef = useRef<number>(0)
  const TRANSITION_DURATION_MS = 80 // Fast but smooth cross-fade

  const { avatarConfig, emotion, voiceState } = useAppStore()
  const { currentMouthPosition: audioMouthPosition, initializeAnalyzer, stopAnalyzer } = useAudioAnalyzer()

  // Update mouth position from audio analyzer (primary method)
  useEffect(() => {
    if (useAudioDriven && audioMouthPosition !== previousMouthPositionRef.current) {
      transitionStartTimeRef.current = Date.now()
      previousMouthPositionRef.current = currentMouthPosition
      setCurrentMouthPosition(audioMouthPosition)
    }
  }, [audioMouthPosition, useAudioDriven, currentMouthPosition])

  // Legacy: Subscribe to phoneme sync manager (fallback method)
  useEffect(() => {
    if (!useAudioDriven) {
      const unsubscribe = phonemeSyncManager.subscribe((variationKey) => {
        // Extract base phoneme from variation key (e.g., "X-hold" → "X")
        const phoneme = variationKey.split('-')[0] as MouthPosition
        if (phoneme !== previousMouthPositionRef.current) {
          transitionStartTimeRef.current = Date.now()
          previousMouthPositionRef.current = currentMouthPosition
        }
        setCurrentMouthPosition(phoneme)
      })

      return unsubscribe
    }
  }, [useAudioDriven, currentMouthPosition])

  // Load uploaded image
  useEffect(() => {
    if (avatarConfig.uploadedImage) {
      const img = new Image()
      img.onload = () => {
        uploadedImageRef.current = img
        setIsImageLoaded(true)
      }
      img.onerror = () => {
        console.error('Failed to load uploaded avatar image')
        setIsImageLoaded(false)
      }
      img.src = avatarConfig.uploadedImage
    } else {
      setIsImageLoaded(false)
      uploadedImageRef.current = null
    }
  }, [avatarConfig.uploadedImage])

  // Load AI-generated variations (now 6 key positions: X, A, B, C, E, H)
  useEffect(() => {
    if (avatarConfig.generatedVariations) {
      const variationKeys = Object.keys(avatarConfig.generatedVariations)
      let loadedCount = 0
      const totalVariations = variationKeys.length

      variationKeys.forEach((key) => {
        const url = avatarConfig.generatedVariations![key]
        if (url) {
          const img = new Image()
          img.onload = () => {
            variationImagesRef.current.set(key, img)
            loadedCount++
            if (loadedCount === totalVariations) {
              setUseAIVariations(true)
              console.log(`✅ All ${totalVariations} AI mouth positions loaded (audio-driven)`)
            }
          }
          img.onerror = () => {
            console.error(`Failed to load AI mouth position for ${key}`)
          }
          img.src = url
        }
      })
    } else {
      setUseAIVariations(false)
      variationImagesRef.current.clear()
    }
  }, [avatarConfig.generatedVariations])

  // Blink animation
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlinkState(1)
      setTimeout(() => setBlinkState(2), 50)
      setTimeout(() => setBlinkState(3), 100)
      setTimeout(() => setBlinkState(0), 150)
    }, 3000 + Math.random() * 2000)

    return () => clearInterval(blinkInterval)
  }, [])

  // Main render loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (isImageLoaded) {
        // Calculate cross-fade transition progress (Phase 4)
        const elapsedTransitionTime = Date.now() - transitionStartTimeRef.current
        const transitionProgress = Math.min(elapsedTransitionTime / TRANSITION_DURATION_MS, 1.0)
        const isTransitioning = transitionProgress < 1.0

        // Use AI-generated mouth position if available (now 6 key positions)
        if (useAIVariations && variationImagesRef.current.has(currentMouthPosition)) {
          if (isTransitioning && variationImagesRef.current.has(previousMouthPositionRef.current)) {
            // Cross-fade: draw previous image fading out, then current image fading in
            const previousImg = variationImagesRef.current.get(previousMouthPositionRef.current)!
            const currentImg = variationImagesRef.current.get(currentMouthPosition)!

            // Draw previous image with decreasing opacity
            ctx.globalAlpha = 1.0 - transitionProgress
            ctx.drawImage(previousImg, 0, 0, canvas.width, canvas.height)

            // Draw current image with increasing opacity
            ctx.globalAlpha = transitionProgress
            ctx.drawImage(currentImg, 0, 0, canvas.width, canvas.height)

            // Reset alpha
            ctx.globalAlpha = 1.0
          } else {
            // No transition or transition complete - draw current image normally
            const variationImg = variationImagesRef.current.get(currentMouthPosition)!
            ctx.drawImage(variationImg, 0, 0, canvas.width, canvas.height)
          }

          // Blink animation is disabled when using AI-generated variations
          // (AI variations already include the complete face with eyes)
        } else if (uploadedImageRef.current) {
          // Fallback to overlay method
          ctx.drawImage(uploadedImageRef.current, 0, 0, canvas.width, canvas.height)

          // Use configurable positions or defaults
          const mouthXPercent = avatarConfig.mouthX || 50
          const mouthYPercent = avatarConfig.mouthY || 70
          const mouthSizeScale = avatarConfig.mouthSize || 1.0
          const eyeYPercent = avatarConfig.eyeY || 40
          const eyeSpacingScale = avatarConfig.eyeSpacing || 1.0
          const eyeSizeScale = avatarConfig.eyeSize || 1.0

          // Calculate mouth position
          const mouthCenterX = (canvas.width * mouthXPercent) / 100
          const mouthCenterY = (canvas.height * mouthYPercent) / 100
          const mouthWidth = (canvas.width * 0.15) * mouthSizeScale
          const mouthHeight = (canvas.height * 0.1) * mouthSizeScale

          // Draw animated mouth based on phoneme (extract letter from variation key)
          drawAnimatedMouth(ctx, phonemeLetter, mouthCenterX, mouthCenterY, mouthWidth, mouthHeight)

          // Add blink overlay with configurable eye position, spacing, and size
          if (blinkState > 0) {
            drawBlinkOverlay(ctx, canvas.width, canvas.height, blinkState, eyeYPercent, eyeSpacingScale, eyeSizeScale)
          }

          // Add subtle emotion effects
          if (emotion === 'happy' && voiceState !== 'speaking') {
            drawEmotionOverlay(ctx, canvas.width, canvas.height, 'happy')
          }
        }
      } else {
        // No image uploaded - show placeholder
        drawPlaceholder(ctx, canvas.width, canvas.height)
      }

      animationFrameRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isImageLoaded, currentMouthPosition, blinkState, emotion, voiceState, useAIVariations, avatarConfig])

  /**
   * Draw animated mouth overlay based on phoneme
   */
  const drawAnimatedMouth = (
    ctx: CanvasRenderingContext2D,
    phoneme: PhonemeType,
    centerX: number,
    centerY: number,
    baseWidth: number,
    baseHeight: number
  ) => {
    // Phoneme-specific mouth parameters
    const mouthShapes: Record<
      PhonemeType,
      { width: number; height: number; openness: number; shape: string }
    > = {
      X: { width: 0.8, height: 0.3, openness: 0, shape: 'closed' }, // Silence
      A: { width: 0.9, height: 0.5, openness: 0.2, shape: 'neutral' }, // Rest
      B: { width: 1.2, height: 1.8, openness: 1.0, shape: 'open' }, // Wide open (ah)
      C: { width: 0.7, height: 0.4, openness: 0.1, shape: 'closed' }, // Tight (m, b, p)
      D: { width: 1.0, height: 1.2, openness: 0.6, shape: 'open' }, // Medium (eh)
      E: { width: 0.6, height: 1.3, openness: 0.7, shape: 'round' }, // Round (oo, oh)
      F: { width: 1.0, height: 0.7, openness: 0.4, shape: 'teeth' }, // Teeth (f, v)
      G: { width: 0.9, height: 1.0, openness: 0.5, shape: 'tongue' }, // Tongue (th)
      H: { width: 1.4, height: 0.8, openness: 0.5, shape: 'wide' }, // Wide (ee)
    }

    const shape = mouthShapes[phoneme]
    const mouthWidth = baseWidth * shape.width
    const mouthHeight = baseHeight * shape.height

    // Semi-transparent overlay mode for natural blending
    ctx.save()
    ctx.globalCompositeOperation = 'multiply'

    // Draw outer mouth shape (darker skin tone)
    ctx.fillStyle = 'rgba(60, 40, 35, 0.7)'
    ctx.beginPath()

    if (shape.shape === 'round') {
      // Round/puckered mouth
      ctx.ellipse(centerX, centerY, mouthWidth / 2, mouthHeight / 2, 0, 0, Math.PI * 2)
    } else if (shape.shape === 'wide') {
      // Wide smile
      ctx.ellipse(centerX, centerY, mouthWidth / 2, mouthHeight / 2, 0, 0, Math.PI * 2)
    } else {
      // Standard ellipse
      ctx.ellipse(centerX, centerY, mouthWidth / 2, mouthHeight / 2, 0, 0, Math.PI * 2)
    }
    ctx.fill()

    // Draw inner mouth if open enough
    if (shape.openness > 0.3) {
      ctx.fillStyle = 'rgba(20, 10, 10, 0.9)'
      ctx.beginPath()
      ctx.ellipse(
        centerX,
        centerY + mouthHeight * 0.1,
        (mouthWidth / 2) * 0.7,
        (mouthHeight / 2) * 0.7,
        0,
        0,
        Math.PI * 2
      )
      ctx.fill()
    }

    // Add highlight for realism (lighter area on upper lip)
    if (shape.openness > 0.4) {
      ctx.globalCompositeOperation = 'screen'
      ctx.fillStyle = 'rgba(255, 220, 200, 0.15)'
      ctx.beginPath()
      ctx.ellipse(
        centerX,
        centerY - mouthHeight * 0.25,
        (mouthWidth / 2) * 0.6,
        mouthHeight * 0.15,
        0,
        0,
        Math.PI * 2
      )
      ctx.fill()
    }

    // Draw teeth for specific phonemes
    if (shape.shape === 'teeth' && shape.openness > 0.3) {
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
      ctx.beginPath()
      ctx.ellipse(
        centerX,
        centerY - mouthHeight * 0.2,
        (mouthWidth / 2) * 0.5,
        mouthHeight * 0.15,
        0,
        0,
        Math.PI * 2
      )
      ctx.fill()
    }

    ctx.restore()
  }

  /**
   * Draw blink overlay on eyes
   */
  const drawBlinkOverlay = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    state: number,
    eyeYPercent: number = 40,
    eyeSpacingScale: number = 1.0,
    eyeSizeScale: number = 1.0
  ) => {
    const eyeY = (height * eyeYPercent) / 100
    const eyeSpacing = (width * 0.15) * eyeSpacingScale

    // Base eye dimensions (before size scaling)
    const baseEyeWidth = width * 0.08
    const baseEyeHeight = baseEyeWidth * 0.7

    // Apply size scaling uniformly to both width and height
    const eyeWidth = baseEyeWidth * eyeSizeScale
    const eyeHeight = baseEyeHeight * eyeSizeScale

    // Calculate blink progress (0 = no blink, 1 = fully closed)
    const blinkProgress = state === 1 ? 0.5 : state === 2 ? 1.0 : state === 3 ? 0.5 : 0
    const blinkHeight = eyeHeight * blinkProgress

    ctx.save()
    ctx.globalCompositeOperation = 'multiply'
    ctx.fillStyle = 'rgba(180, 150, 130, 0.85)'

    // Calculate positions (ensure perfect symmetry)
    const centerX = Math.floor(width / 2)
    const leftEyeX = centerX - eyeSpacing
    const rightEyeX = centerX + eyeSpacing
    const eyeRadiusX = eyeWidth / 2
    const eyeRadiusY = blinkHeight

    // Left eyelid
    ctx.beginPath()
    ctx.ellipse(leftEyeX, eyeY, eyeRadiusX, eyeRadiusY, 0, 0, Math.PI * 2)
    ctx.fill()

    // Right eyelid (mirror symmetry)
    ctx.beginPath()
    ctx.ellipse(rightEyeX, eyeY, eyeRadiusX, eyeRadiusY, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }

  /**
   * Draw subtle emotion overlays
   */
  const drawEmotionOverlay = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    emotion: 'happy'
  ) => {
    if (emotion === 'happy') {
      ctx.save()
      ctx.fillStyle = 'rgba(255, 255, 220, 0.2)'
      ctx.beginPath()
      ctx.arc(width * 0.25, height * 0.35, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(width * 0.75, height * 0.35, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }

  /**
   * Draw placeholder when no image uploaded
   */
  const drawPlaceholder = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, '#E0E7FF')
    gradient.addColorStop(1, '#F3E8FF')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    ctx.font = 'bold 64px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#9333EA'
    ctx.fillText('📸', width / 2, height / 2 - 40)

    ctx.font = '20px Arial'
    ctx.fillStyle = '#6B7280'
    ctx.fillText('Upload Your Avatar', width / 2, height / 2 + 40)

    ctx.font = '14px Arial'
    ctx.fillStyle = '#9CA3AF'
    ctx.fillText('Click the Upload Avatar button', width / 2, height / 2 + 70)
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <canvas
        ref={canvasRef}
        width={400}
        height={400}
        className={`bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl shadow-xl ${
          voiceState === 'idle' ? 'avatar-idle-pulse' :
          voiceState === 'speaking' ? 'avatar-breathing' : ''
        }`}
      />
      <div className="mt-4 text-center">
        <div className="text-sm text-gray-600 capitalize">
          {emotion === 'neutral' && voiceState === 'idle' && '✨ Ready to chat'}
          {emotion === 'happy' && '😊 Glad to help!'}
          {emotion === 'thinking' && '🤔 Thinking...'}
          {voiceState === 'listening' && '🎤 Listening...'}
          {voiceState === 'processing' && '⚙️ Processing...'}
          {voiceState === 'speaking' && `🗣️ Speaking...`}
        </div>
        {voiceState === 'speaking' && currentMouthPosition !== 'X' && (
          <div className="text-xs text-purple-600 mt-1 font-mono">
            Mouth: [{currentMouthPosition}] • {useAIVariations ? 'AI-Generated' : 'Overlay'} • {useAudioDriven ? 'Audio-Driven' : 'Timeline'}
          </div>
        )}
        {useAIVariations && (
          <div className="text-xs text-green-600 mt-1">
            ✨ Using AI-generated photorealistic variations
          </div>
        )}
      </div>
    </div>
  )
}

export default RealisticAvatar
