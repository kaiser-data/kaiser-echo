import { useEffect, useRef, useState } from 'react'

/**
 * Audio-driven mouth position mapping
 * Maps real-time audio features to 6 key mouth positions
 */
export type MouthPosition = 'X' | 'A' | 'B' | 'C' | 'E' | 'H'

interface AudioFeatures {
  amplitude: number // 0-1, volume level
  frequency: number // Hz, dominant frequency
  isSpeaking: boolean // true if amplitude > threshold
}

/**
 * Web Audio API analyzer for real-time audio analysis
 * Extracts amplitude and frequency features from speech
 */
export function useAudioAnalyzer() {
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyzerRef = useRef<AnalyserNode | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)
  const frequencyDataRef = useRef<Uint8Array | null>(null)
  const [currentMouthPosition, setCurrentMouthPosition] = useState<MouthPosition>('X')
  const animationFrameRef = useRef<number | null>(null)

  /**
   * Map audio features to mouth position
   * Uses amplitude and frequency to determine best mouth shape
   */
  const getMouthPositionFromAudio = (features: AudioFeatures): MouthPosition => {
    // Silent or very quiet → closed mouth
    if (!features.isSpeaking || features.amplitude < 0.05) {
      return 'X'
    }

    // High amplitude (loud sounds like "AH") → wide open
    if (features.amplitude > 0.6) {
      return 'B'
    }

    // High frequency (2000+ Hz) → smile for E/I sounds like "see"
    if (features.frequency > 2000) {
      return 'H'
    }

    // Mid-high frequency (800-2000 Hz) → medium open for general vowels
    if (features.frequency > 800) {
      return 'A'
    }

    // Low frequency (200-800 Hz) with medium amplitude → rounded for O/U sounds
    if (features.frequency > 200 && features.amplitude > 0.3) {
      return 'E'
    }

    // Low amplitude peaks (potential consonants like M/B/P) → lips pressed
    if (features.amplitude > 0.15 && features.amplitude < 0.35) {
      return 'C'
    }

    // Default to small open
    return 'A'
  }

  /**
   * Analyze audio in real-time and update mouth position
   */
  const analyzeAudio = () => {
    if (!analyzerRef.current || !dataArrayRef.current || !frequencyDataRef.current) {
      return
    }

    const analyzer = analyzerRef.current
    const dataArray = dataArrayRef.current
    const frequencyData = frequencyDataRef.current

    // Get time domain data (amplitude)
    analyzer.getByteTimeDomainData(dataArray)

    // Get frequency data
    analyzer.getByteFrequencyData(frequencyData)

    // Calculate amplitude (RMS of waveform)
    let sum = 0
    for (let i = 0; i < dataArray.length; i++) {
      const normalized = (dataArray[i] - 128) / 128 // Normalize to -1 to 1
      sum += normalized * normalized
    }
    const rms = Math.sqrt(sum / dataArray.length)
    const amplitude = Math.min(rms * 2, 1.0) // Scale and clamp to 0-1

    // Find dominant frequency
    let maxIndex = 0
    let maxValue = 0
    for (let i = 0; i < frequencyData.length; i++) {
      if (frequencyData[i] > maxValue) {
        maxValue = frequencyData[i]
        maxIndex = i
      }
    }

    // Convert bin index to frequency (Hz)
    const sampleRate = audioContextRef.current?.sampleRate || 48000
    const nyquist = sampleRate / 2
    const frequency = (maxIndex / frequencyData.length) * nyquist

    // Determine if speaking (amplitude threshold)
    const isSpeaking = amplitude > 0.05

    // Get mouth position from features
    const features: AudioFeatures = { amplitude, frequency, isSpeaking }
    const position = getMouthPositionFromAudio(features)

    // Update mouth position if changed
    if (position !== currentMouthPosition) {
      setCurrentMouthPosition(position)
    }

    // Continue analysis loop
    animationFrameRef.current = requestAnimationFrame(analyzeAudio)
  }

  /**
   * Initialize audio analyzer with microphone or utterance audio
   */
  const initializeAnalyzer = (audioSource: MediaStream | HTMLAudioElement) => {
    try {
      // Create audio context if needed
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext()
      }

      const audioContext = audioContextRef.current

      // Create analyzer node
      const analyzer = audioContext.createAnalyser()
      analyzer.fftSize = 2048 // Higher resolution for better frequency analysis
      analyzer.smoothingTimeConstant = 0.8 // Smooth out jitter
      analyzerRef.current = analyzer

      // Create data arrays
      const bufferLength = analyzer.frequencyBinCount
      dataArrayRef.current = new Uint8Array(bufferLength)
      frequencyDataRef.current = new Uint8Array(bufferLength)

      // Connect audio source
      let source: MediaStreamAudioSourceNode | MediaElementAudioSourceNode
      if (audioSource instanceof MediaStream) {
        source = audioContext.createMediaStreamSource(audioSource)
      } else {
        source = audioContext.createMediaElementSource(audioSource)
      }

      source.connect(analyzer)
      // Note: Don't connect to destination to avoid echo

      // Start analysis loop
      analyzeAudio()

      console.log('✅ Audio analyzer initialized')
    } catch (error) {
      console.error('❌ Failed to initialize audio analyzer:', error)
    }
  }

  /**
   * Stop audio analysis
   */
  const stopAnalyzer = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    analyzerRef.current = null
    dataArrayRef.current = null
    frequencyDataRef.current = null
    setCurrentMouthPosition('X')

    console.log('✅ Audio analyzer stopped')
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAnalyzer()
    }
  }, [])

  return {
    currentMouthPosition,
    initializeAnalyzer,
    stopAnalyzer,
  }
}
