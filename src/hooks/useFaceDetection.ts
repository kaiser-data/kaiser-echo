import { useEffect, useState, useRef } from 'react'
import * as faceapi from 'face-api.js'

interface FaceLandmarks {
  mouthCenter: { x: number; y: number }
  mouthWidth: number
  mouthHeight: number
  leftEye: { x: number; y: number }
  rightEye: { x: number; y: number }
  confidence: number
}

interface UseFaceDetectionOptions {
  enabled?: boolean
  imageElement?: HTMLImageElement | null
}

/**
 * Automatic face landmark detection using face-api.js
 * Detects mouth and eye positions for accurate overlay placement
 */
export const useFaceDetection = (options: UseFaceDetectionOptions = {}) => {
  const { enabled = true, imageElement } = options

  const [landmarks, setLandmarks] = useState<FaceLandmarks | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const modelsLoadedRef = useRef(false)

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      if (modelsLoadedRef.current) return

      try {
        setIsLoading(true)
        const MODEL_URL = '/models' // We'll need to add models to public folder

        // Load required models
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        ])

        modelsLoadedRef.current = true
        setIsLoading(false)
      } catch (err) {
        console.error('Failed to load face detection models:', err)
        setError('Failed to load face detection models')
        setIsLoading(false)
      }
    }

    if (enabled) {
      loadModels()
    }
  }, [enabled])

  // Detect face landmarks when image changes
  useEffect(() => {
    if (!enabled || !imageElement || !modelsLoadedRef.current || isLoading) {
      return
    }

    const detectFace = async () => {
      try {
        // Detect face with landmarks
        const detection = await faceapi
          .detectSingleFace(imageElement, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()

        if (!detection) {
          setError('No face detected in image')
          setLandmarks(null)
          return
        }

        const landmarks = detection.landmarks

        // Get mouth landmarks (indices 48-67 in 68-point model)
        const mouthPoints = landmarks.getMouth()

        // Calculate mouth center
        const mouthCenter = mouthPoints.reduce(
          (acc, point) => ({
            x: acc.x + point.x / mouthPoints.length,
            y: acc.y + point.y / mouthPoints.length,
          }),
          { x: 0, y: 0 }
        )

        // Calculate mouth dimensions
        const mouthXs = mouthPoints.map((p) => p.x)
        const mouthYs = mouthPoints.map((p) => p.y)
        const mouthWidth = Math.max(...mouthXs) - Math.min(...mouthXs)
        const mouthHeight = Math.max(...mouthYs) - Math.min(...mouthYs)

        // Get eye positions
        const leftEye = landmarks.getLeftEye()
        const rightEye = landmarks.getRightEye()

        const leftEyeCenter = leftEye.reduce(
          (acc, point) => ({
            x: acc.x + point.x / leftEye.length,
            y: acc.y + point.y / leftEye.length,
          }),
          { x: 0, y: 0 }
        )

        const rightEyeCenter = rightEye.reduce(
          (acc, point) => ({
            x: acc.x + point.x / rightEye.length,
            y: acc.y + point.y / rightEye.length,
          }),
          { x: 0, y: 0 }
        )

        setLandmarks({
          mouthCenter,
          mouthWidth,
          mouthHeight,
          leftEye: leftEyeCenter,
          rightEye: rightEyeCenter,
          confidence: detection.detection.score,
        })

        setError(null)
      } catch (err) {
        console.error('Face detection error:', err)
        setError('Failed to detect face landmarks')
        setLandmarks(null)
      }
    }

    detectFace()
  }, [enabled, imageElement, isLoading])

  return {
    landmarks,
    isLoading,
    error,
    isReady: modelsLoadedRef.current && !isLoading,
  }
}
