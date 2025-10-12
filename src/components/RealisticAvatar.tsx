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
  const [useAudioDriven, setUseAudioDriven] = useState(false) // Use phonemeSyncManager by default (text-based simulation)

  // Cross-fade transition state
  const previousMouthPositionRef = useRef<MouthPosition>('X')
  const transitionStartTimeRef = useRef<number>(0)
  const TRANSITION_DURATION_MS = 80 // Fast but smooth cross-fade

  const { avatarConfig, emotion, voiceState, showPositionControls, avatarRenderMode } = useAppStore()
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
        let phoneme = variationKey.split('-')[0] as PhonemeType

        // Map 9 phonemes to 6 available AI-generated mouth positions
        const phonemeMapping: Record<PhonemeType, MouthPosition> = {
          'X': 'X', // Silence → closed mouth
          'A': 'A', // Rest → slightly open
          'B': 'B', // Wide open → wide open
          'C': 'C', // Tight lips → pressed lips
          'D': 'A', // Medium open → map to slightly open
          'E': 'E', // Round → puckered
          'F': 'C', // Teeth on lip → map to pressed lips
          'G': 'A', // Tongue visible → map to slightly open
          'H': 'H', // Wide smile → smile
        }

        const mappedPhoneme = phonemeMapping[phoneme]

        if (mappedPhoneme !== previousMouthPositionRef.current) {
          transitionStartTimeRef.current = Date.now()
          previousMouthPositionRef.current = currentMouthPosition
          console.log(`🗣️ Mouth position: ${mappedPhoneme} (from phoneme: ${phoneme})`)
        }
        setCurrentMouthPosition(mappedPhoneme)
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

  // Blink animation (keep eyes closed while adjusting position)
  useEffect(() => {
    // Keep eyes fully closed while position controls are open for easier adjustment
    if (showPositionControls) {
      setBlinkState(2) // Fully closed
      return
    }

    const blinkInterval = setInterval(() => {
      setBlinkState(1)
      setTimeout(() => setBlinkState(2), 50)
      setTimeout(() => setBlinkState(3), 100)
      setTimeout(() => setBlinkState(0), 150)
    }, 3000 + Math.random() * 2000)

    return () => clearInterval(blinkInterval)
  }, [showPositionControls])

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

        // Use AI-generated mouth position if enabled and available (now 6 key positions)
        if (avatarRenderMode === 'ai' && useAIVariations && variationImagesRef.current.has(currentMouthPosition) && uploadedImageRef.current) {
          // MOUTH REGION OVERLAY STRATEGY:
          // The AI generates full faces with different mouth positions using strict consistency prompts.
          // We extract ONLY the mouth region from AI variations and overlay onto the base image.
          //
          // This works because:
          // 1. AI is instructed to keep everything identical (head position, lighting, background)
          // 2. We use high image_prompt_strength (0.98-0.99) to preserve non-mouth features
          // 3. The mouth region is extracted from the SAME coordinates in each variation
          // 4. User can adjust the mouth region size/position to perfect the alignment

          // 1. Draw the base uploaded image (consistent face)
          ctx.drawImage(uploadedImageRef.current, 0, 0, canvas.width, canvas.height)

          // 2. Define mouth region (configurable or default to center-bottom)
          // These values define a rectangle that extracts the mouth from AI variations
          const mouthXPercent = avatarConfig.mouthX || 50       // Horizontal center (0-100%)
          const mouthYPercent = avatarConfig.mouthY || 70       // Vertical position (0-100%, 70% = lower third)
          const mouthWidthPercent = avatarConfig.mouthRegionWidth || 30   // Width as % of face (10-50%)
          const mouthHeightPercent = avatarConfig.mouthRegionHeight || 20 // Height as % of face (10-40%)

          // Convert percentages to pixel coordinates
          const mouthX = (canvas.width * (mouthXPercent - mouthWidthPercent / 2)) / 100
          const mouthY = (canvas.height * (mouthYPercent - mouthHeightPercent / 2)) / 100
          const mouthWidth = (canvas.width * mouthWidthPercent) / 100
          const mouthHeight = (canvas.height * mouthHeightPercent) / 100

          // 3. Extract and overlay ONLY the mouth region from AI variation - ONLY when speaking or adjusting
          // ctx.drawImage(source, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
          // We use SAME coordinates for source and destination to maintain alignment
          if (voiceState === 'speaking' || showPositionControls) {
            ctx.save()

            // Optional: Add subtle shadow/feather effect for better blending
            ctx.shadowColor = 'rgba(0, 0, 0, 0.1)'
            ctx.shadowBlur = 3
            if (isTransitioning && variationImagesRef.current.has(previousMouthPositionRef.current)) {
            // Cross-fade between two mouth regions
            const previousImg = variationImagesRef.current.get(previousMouthPositionRef.current)!
            const currentImg = variationImagesRef.current.get(currentMouthPosition)!

            // Draw previous mouth with decreasing opacity
            ctx.globalAlpha = 1.0 - transitionProgress
            ctx.drawImage(
              previousImg,
              mouthX, mouthY, mouthWidth, mouthHeight, // Source region
              mouthX, mouthY, mouthWidth, mouthHeight  // Destination region
            )

            // Draw current mouth with increasing opacity
            ctx.globalAlpha = transitionProgress
            ctx.drawImage(
              currentImg,
              mouthX, mouthY, mouthWidth, mouthHeight, // Source region
              mouthX, mouthY, mouthWidth, mouthHeight  // Destination region
            )

            // Reset alpha
            ctx.globalAlpha = 1.0
          } else {
            // Draw current mouth region only
            const variationImg = variationImagesRef.current.get(currentMouthPosition)!
            ctx.drawImage(
              variationImg,
              mouthX, mouthY, mouthWidth, mouthHeight, // Source region
              mouthX, mouthY, mouthWidth, mouthHeight  // Destination region
            )
          }

            ctx.restore()
          }

          // Debug: Draw mouth region outline when position controls are open
          // ALWAYS show debug rectangle when position controls are open for easier adjustment
          if (showPositionControls) {
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)'
            ctx.lineWidth = 3
            ctx.strokeRect(mouthX, mouthY, mouthWidth, mouthHeight)

            // Draw crosshair at center
            ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)'
            ctx.lineWidth = 2
            const centerX = mouthX + mouthWidth / 2
            const centerY = mouthY + mouthHeight / 2
            ctx.beginPath()
            ctx.moveTo(centerX - 10, centerY)
            ctx.lineTo(centerX + 10, centerY)
            ctx.moveTo(centerX, centerY - 10)
            ctx.lineTo(centerX, centerY + 10)
            ctx.stroke()
          }

          // Add blink overlay in AI mode too (since we're only overlaying mouth region)
          const eyeXPercent = avatarConfig.eyeX || 50
          const eyeYPercent = avatarConfig.eyeY || 40
          const eyeSpacingScale = avatarConfig.eyeSpacing || 1.0
          const eyeSizeScale = avatarConfig.eyeSize || 1.0

          if (blinkState > 0) {
            drawBlinkOverlay(ctx, canvas.width, canvas.height, blinkState, eyeXPercent, eyeYPercent, eyeSpacingScale, eyeSizeScale)
          }
        } else if (uploadedImageRef.current) {
          // Fallback to overlay method
          ctx.drawImage(uploadedImageRef.current, 0, 0, canvas.width, canvas.height)

          // Use configurable positions or defaults
          const mouthXPercent = avatarConfig.mouthX || 50
          const mouthYPercent = avatarConfig.mouthY || 70
          const mouthSizeScale = avatarConfig.mouthSize || 1.0
          const eyeXPercent = avatarConfig.eyeX || 50
          const eyeYPercent = avatarConfig.eyeY || 40
          const eyeSpacingScale = avatarConfig.eyeSpacing || 1.0
          const eyeSizeScale = avatarConfig.eyeSize || 1.0

          // Calculate mouth position
          const mouthCenterX = (canvas.width * mouthXPercent) / 100
          const mouthCenterY = (canvas.height * mouthYPercent) / 100
          const mouthWidth = (canvas.width * 0.15) * mouthSizeScale
          const mouthHeight = (canvas.height * 0.1) * mouthSizeScale

          // Draw animated mouth based on current mouth position - ONLY when speaking
          if (voiceState === 'speaking' || showPositionControls) {
            drawAnimatedMouth(ctx, currentMouthPosition, mouthCenterX, mouthCenterY, mouthWidth, mouthHeight)
          }

          // Add blink overlay with configurable eye position, spacing, and size
          if (blinkState > 0) {
            drawBlinkOverlay(ctx, canvas.width, canvas.height, blinkState, eyeXPercent, eyeYPercent, eyeSpacingScale, eyeSizeScale)
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
  }, [isImageLoaded, currentMouthPosition, blinkState, emotion, voiceState, useAIVariations, avatarConfig, showPositionControls, avatarRenderMode])

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
    eyeXPercent: number = 50,
    eyeYPercent: number = 40,
    eyeSpacingScale: number = 1.0,
    eyeSizeScale: number = 1.0
  ) => {
    const eyeCenterX = (width * eyeXPercent) / 100
    const eyeY = (height * eyeYPercent) / 100
    const eyeSpacing = (width * 0.15) * eyeSpacingScale

    // Base eye dimensions (before size scaling)
    const baseEyeWidth = width * 0.08
    const baseEyeHeight = baseEyeWidth * 0.7

    // Apply size scaling with limits to prevent rim collision
    // Max size limited to 1.5 to keep eyes within frame
    const clampedEyeSize = Math.min(eyeSizeScale, 1.5)
    const eyeWidth = baseEyeWidth * clampedEyeSize
    const eyeHeight = baseEyeHeight * clampedEyeSize

    // Calculate blink progress (0 = no blink, 1 = fully closed)
    const blinkProgress = state === 1 ? 0.5 : state === 2 ? 1.0 : state === 3 ? 0.5 : 0
    const blinkHeight = eyeHeight * blinkProgress

    ctx.save()
    ctx.globalCompositeOperation = 'multiply'
    ctx.fillStyle = 'rgba(180, 150, 130, 0.85)'

    // Calculate positions using configurable center
    const leftEyeX = eyeCenterX - eyeSpacing
    const rightEyeX = eyeCenterX + eyeSpacing
    const eyeRadiusX = eyeWidth / 2
    const eyeRadiusY = blinkHeight

    // Left eyelid - rotated 90 degrees
    ctx.beginPath()
    ctx.ellipse(leftEyeX, eyeY, eyeRadiusX, eyeRadiusY, Math.PI / 2, 0, Math.PI * 2)
    ctx.fill()

    // Right eyelid (mirror symmetry) - rotated 90 degrees
    ctx.beginPath()
    ctx.ellipse(rightEyeX, eyeY, eyeRadiusX, eyeRadiusY, Math.PI / 2, 0, Math.PI * 2)
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
