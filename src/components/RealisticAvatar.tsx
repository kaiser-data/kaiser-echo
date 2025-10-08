import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { phonemeSyncManager } from '../utils/phonemeSync'
import type { PhonemeType } from '../hooks/usePhonemeDetection'

/**
 * Realistic Avatar with phoneme-based lip-sync animation
 * Overlays animated mouth on uploaded user image
 */
const RealisticAvatar = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>()
  const uploadedImageRef = useRef<HTMLImageElement | null>(null)

  const [isImageLoaded, setIsImageLoaded] = useState(false)
  const [blinkState, setBlinkState] = useState(0) // 0 = open, 1 = closing, 2 = closed, 3 = opening
  const [currentPhoneme, setCurrentPhoneme] = useState<PhonemeType>('X')

  const { avatarConfig, emotion, voiceState } = useAppStore()

  // Subscribe to phoneme changes from sync manager
  useEffect(() => {
    const unsubscribe = phonemeSyncManager.subscribe((phoneme) => {
      setCurrentPhoneme(phoneme)
    })

    return unsubscribe
  }, [])

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

      if (isImageLoaded && uploadedImageRef.current) {
        // Draw uploaded image
        ctx.drawImage(uploadedImageRef.current, 0, 0, canvas.width, canvas.height)

        // Calculate mouth position (lower third, center)
        const mouthCenterX = canvas.width / 2
        const mouthCenterY = canvas.height * 0.7
        const mouthWidth = canvas.width * 0.15
        const mouthHeight = canvas.height * 0.1

        // Draw animated mouth based on phoneme
        drawAnimatedMouth(ctx, currentPhoneme, mouthCenterX, mouthCenterY, mouthWidth, mouthHeight)

        // Add blink overlay
        if (blinkState > 0) {
          drawBlinkOverlay(ctx, canvas.width, canvas.height, blinkState)
        }

        // Add subtle emotion effects
        if (emotion === 'happy' && voiceState !== 'speaking') {
          drawEmotionOverlay(ctx, canvas.width, canvas.height, 'happy')
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
  }, [isImageLoaded, currentPhoneme, blinkState, emotion, voiceState])

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
    state: number
  ) => {
    const eyeY = height * 0.4
    const eyeSpacing = width * 0.15
    const eyeWidth = width * 0.08

    const blinkProgress = state === 1 ? 0.5 : state === 2 ? 1.0 : 0.5
    const blinkHeight = eyeWidth * 0.7 * blinkProgress

    ctx.save()
    ctx.globalCompositeOperation = 'multiply'
    ctx.fillStyle = 'rgba(180, 150, 130, 0.85)'

    // Left eyelid
    ctx.beginPath()
    ctx.ellipse(width / 2 - eyeSpacing, eyeY, eyeWidth / 2, blinkHeight, 0, 0, Math.PI * 2)
    ctx.fill()

    // Right eyelid
    ctx.beginPath()
    ctx.ellipse(width / 2 + eyeSpacing, eyeY, eyeWidth / 2, blinkHeight, 0, 0, Math.PI * 2)
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
        className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl shadow-xl"
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
        {voiceState === 'speaking' && currentPhoneme !== 'X' && (
          <div className="text-xs text-purple-600 mt-1 font-mono">
            Phoneme: [{currentPhoneme}] • Realistic Lip-Sync
          </div>
        )}
      </div>
    </div>
  )
}

export default RealisticAvatar
