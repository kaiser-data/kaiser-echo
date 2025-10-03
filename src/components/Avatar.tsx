import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import type { EmotionState } from '../types'

interface MouthState {
  openness: number // 0-1
}

const Avatar = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>()
  const [blinkTimer, setBlinkTimer] = useState<number>(0)
  const [mouthState, setMouthState] = useState<MouthState>({ openness: 0 })

  const { avatarConfig, emotion, voiceState } = useAppStore()

  // Simulate lip-sync based on voice state
  useEffect(() => {
    if (voiceState === 'speaking') {
      // Simulate talking animation
      const interval = setInterval(() => {
        setMouthState({
          openness: Math.random() * 0.8 + 0.2, // Random between 0.2 and 1
        })
      }, 150)

      return () => clearInterval(interval)
    } else {
      setMouthState({ openness: 0 })
    }
  }, [voiceState])

  // Draw avatar
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const draw = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const centerX = canvas.width / 2
      const centerY = canvas.height / 2
      const headRadius = 80

      // Draw head (circle)
      ctx.fillStyle = avatarConfig.skinColor
      ctx.beginPath()
      ctx.arc(centerX, centerY, headRadius, 0, Math.PI * 2)
      ctx.fill()

      // Draw hair
      drawHair(ctx, centerX, centerY, headRadius)

      // Draw eyes
      const eyeY = centerY - 15
      const eyeSpacing = 25
      const isBlinking = blinkTimer < 100 // Blink for 100ms

      if (isBlinking) {
        // Draw closed eyes (lines)
        ctx.strokeStyle = '#000'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(centerX - eyeSpacing - 8, eyeY)
        ctx.lineTo(centerX - eyeSpacing + 8, eyeY)
        ctx.stroke()

        ctx.beginPath()
        ctx.moveTo(centerX + eyeSpacing - 8, eyeY)
        ctx.lineTo(centerX + eyeSpacing + 8, eyeY)
        ctx.stroke()
      } else {
        // Draw open eyes
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.arc(centerX - eyeSpacing, eyeY, 10, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(centerX + eyeSpacing, eyeY, 10, 0, Math.PI * 2)
        ctx.fill()

        // Draw pupils
        const pupilOffsetX = emotion === 'thinking' ? 3 : 0
        ctx.fillStyle = avatarConfig.eyeColor
        ctx.beginPath()
        ctx.arc(centerX - eyeSpacing + pupilOffsetX, eyeY, 5, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(centerX + eyeSpacing + pupilOffsetX, eyeY, 5, 0, Math.PI * 2)
        ctx.fill()
      }

      // Draw glasses if enabled
      if (avatarConfig.hasGlasses && avatarConfig.glassesStyle !== 'none') {
        drawGlasses(ctx, centerX, eyeY)
      }

      // Draw mouth based on emotion and talking state
      drawMouth(ctx, centerX, centerY + 25)

      // Draw accessory
      drawAccessory(ctx, centerX, centerY, headRadius)

      animationFrameRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [avatarConfig, emotion, blinkTimer, mouthState])

  // Blink animation timer
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlinkTimer(0)
      setTimeout(() => setBlinkTimer(200), Math.random() * 3000 + 2000)
    }, 4000)

    return () => clearInterval(blinkInterval)
  }, [])

  useEffect(() => {
    if (blinkTimer < 200) {
      const timer = setTimeout(() => setBlinkTimer((t) => t + 16), 16)
      return () => clearTimeout(timer)
    }
  }, [blinkTimer])

  const drawHair = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number
  ) => {
    ctx.fillStyle = avatarConfig.hairColor

    if (avatarConfig.hairStyle === 'bald') {
      return
    }

    if (avatarConfig.hairStyle === 'short') {
      // Simple top hair
      ctx.beginPath()
      ctx.arc(x, y - radius + 10, radius - 5, Math.PI, Math.PI * 2)
      ctx.fill()
    } else if (avatarConfig.hairStyle === 'long') {
      // Longer hair with side coverage
      ctx.beginPath()
      ctx.arc(x, y - radius + 10, radius, Math.PI * 0.8, Math.PI * 2.2)
      ctx.fill()
    } else if (avatarConfig.hairStyle === 'curly') {
      // Curly hair (multiple circles)
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI / 7) * i + Math.PI
        const hairX = x + Math.cos(angle) * (radius - 10)
        const hairY = y + Math.sin(angle) * (radius - 10)
        ctx.beginPath()
        ctx.arc(hairX, hairY, 15, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  const drawGlasses = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 3

    const glassWidth = 18
    const glassHeight = avatarConfig.glassesStyle === 'round' ? 18 : 15
    const spacing = 25

    if (avatarConfig.glassesStyle === 'round') {
      // Round glasses
      ctx.beginPath()
      ctx.arc(x - spacing, y, glassWidth / 2, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(x + spacing, y, glassWidth / 2, 0, Math.PI * 2)
      ctx.stroke()
    } else if (avatarConfig.glassesStyle === 'square') {
      // Square glasses
      ctx.strokeRect(x - spacing - glassWidth / 2, y - glassHeight / 2, glassWidth, glassHeight)
      ctx.strokeRect(x + spacing - glassWidth / 2, y - glassHeight / 2, glassWidth, glassHeight)
    }

    // Bridge
    ctx.beginPath()
    ctx.moveTo(x - spacing + glassWidth / 2, y)
    ctx.lineTo(x + spacing - glassWidth / 2, y)
    ctx.stroke()
  }

  const drawMouth = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 2

    const mouthWidth = 30
    const openness = mouthState.openness

    if (emotion === 'happy' && openness === 0) {
      // Smile
      ctx.beginPath()
      ctx.arc(x, y, mouthWidth / 2, 0.2, Math.PI - 0.2)
      ctx.stroke()
    } else if (emotion === 'thinking' && openness === 0) {
      // Slight frown (thinking)
      ctx.beginPath()
      ctx.moveTo(x - mouthWidth / 2, y)
      ctx.lineTo(x + mouthWidth / 2, y)
      ctx.stroke()
    } else {
      // Talking mouth (oval that changes size)
      ctx.beginPath()
      ctx.ellipse(
        x,
        y,
        mouthWidth / 3,
        10 + openness * 15,
        0,
        0,
        Math.PI * 2
      )
      ctx.fillStyle = '#8B4513'
      ctx.fill()
      ctx.stroke()
    }
  }

  const drawAccessory = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number
  ) => {
    if (avatarConfig.accessory === 'hat') {
      ctx.fillStyle = '#4A5568'
      ctx.fillRect(x - 50, y - radius - 20, 100, 10)
      ctx.beginPath()
      ctx.arc(x, y - radius - 20, 40, Math.PI, 0)
      ctx.fill()
    } else if (avatarConfig.accessory === 'earrings') {
      ctx.fillStyle = '#FFD700'
      ctx.beginPath()
      ctx.arc(x - radius + 10, y + 10, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(x + radius - 10, y + 10, 5, 0, Math.PI * 2)
      ctx.fill()
    } else if (avatarConfig.accessory === 'bow') {
      ctx.fillStyle = '#FF1493'
      ctx.beginPath()
      ctx.arc(x - 30, y - radius + 20, 15, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(x + 30, y - radius + 20, 15, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillRect(x - 8, y - radius + 10, 16, 20)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <canvas
        ref={canvasRef}
        width={300}
        height={300}
        className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl shadow-xl"
      />
      <div className="mt-4 text-center">
        <div className="text-sm text-gray-600 capitalize">
          {emotion === 'neutral' && voiceState === 'idle' && 'Ready to chat'}
          {emotion === 'happy' && 'Glad to help!'}
          {emotion === 'thinking' && 'Thinking...'}
          {voiceState === 'listening' && '🎤 Listening...'}
          {voiceState === 'processing' && '⚙️ Processing...'}
          {voiceState === 'speaking' && '🗣️ Speaking...'}
        </div>
      </div>
    </div>
  )
}

export default Avatar
