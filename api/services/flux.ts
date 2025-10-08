/**
 * Black Forest Labs FLUX integration via fal.ai
 * Generates photorealistic mouth variations for talking avatars
 */

import type { Env } from '../index'

export interface FluxGenerationRequest {
  baseImageUrl: string
  phoneme: string
  prompt: string
}

export interface FluxGenerationResult {
  imageUrl: string
  phoneme: string
  generationTime: number
}

/**
 * AUDIO-DRIVEN mouth positions (reduced from 27 to 6 for cost efficiency)
 * Each position maps to audio features for real-time analysis
 * Cost: 6 images × $0.04 = $0.24 per avatar (vs $1.08 for 27)
 */
const MOUTH_POSITIONS: Record<string, string> = {
  // X - Silent/Closed (amplitude near zero)
  X: 'lips gently closed, neutral resting mouth',

  // A - Small Open (low-mid amplitude, neutral frequency)
  A: 'mouth slightly open, small oval, relaxed jaw',

  // B - Wide Open (high amplitude, low frequency - "ah" sounds)
  B: 'mouth WIDE OPEN, jaw dropped, both rows of teeth visible',

  // C - Lips Pressed (detected silence after vowel - M, B, P sounds)
  C: 'lips FIRMLY PRESSED together, sealed closed',

  // E - Rounded/Pursed (mid frequency, rounded vowels - O, U sounds)
  E: 'lips PUCKERED FORWARD, rounded O-shape',

  // H - Wide Smile (high frequency - E, I sounds)
  H: 'lips STRETCHED WIDE, broad smile, teeth showing'
}

/**
 * Generate a single mouth position using FLUX or Gemini
 * Uses user's provider preference or automatically detects available API
 * Optimized to 6 key positions for cost efficiency and naturalness
 */
export async function generateMouthVariation(
  env: Env,
  baseImageUrl: string,
  phoneme: string,
  variation: string = 'hold', // Legacy parameter, now ignored
  provider: 'bfl' | 'fal' | 'replicate' | 'gemini' | 'auto' = 'auto'
): Promise<FluxGenerationResult> {
  const startTime = Date.now()
  const prompt = MOUTH_POSITIONS[phoneme] || MOUTH_POSITIONS.A

  // User selected specific provider
  if (provider === 'bfl') {
    if (!env.BFL_API_KEY) {
      throw new Error('BFL_API_KEY not configured. Add it to .dev.vars or switch to "auto" provider.')
    }
    console.log('🎨 Using Black Forest Labs direct API (user selected)')
    return await generateWithBlackForest(env, baseImageUrl, phoneme, prompt, startTime)
  }

  if (provider === 'fal') {
    if (!env.FAL_API_KEY) {
      throw new Error('FAL_API_KEY not configured. Add it to .dev.vars or switch to "auto" provider.')
    }
    console.log('🎨 Using fal.ai (user selected)')
    return await generateWithFal(env, baseImageUrl, phoneme, prompt, startTime)
  }

  if (provider === 'replicate') {
    if (!env.REPLICATE_API_KEY) {
      throw new Error('REPLICATE_API_KEY not configured. Add it to .dev.vars or switch to "auto" provider.')
    }
    console.log('🎨 Using Replicate (user selected)')
    return await generateWithReplicate(env, baseImageUrl, phoneme, prompt, startTime)
  }

  if (provider === 'gemini') {
    if (!env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured. Add it to .dev.vars or switch to "auto" provider.')
    }
    console.log('🎨 Using Gemini 2.5 Flash Image (user selected)')
    return await generateWithGemini(env, baseImageUrl, phoneme, prompt, startTime)
  }

  // Auto mode: Priority Gemini > BFL > FAL > REPLICATE
  if (env.GEMINI_API_KEY) {
    console.log('🎨 Using Gemini 2.5 Flash Image (auto-detected)')
    return await generateWithGemini(env, baseImageUrl, phoneme, prompt, startTime)
  } else if (env.BFL_API_KEY) {
    console.log('🎨 Using Black Forest Labs direct API (auto-detected)')
    return await generateWithBlackForest(env, baseImageUrl, phoneme, prompt, startTime)
  } else if (env.FAL_API_KEY) {
    console.log('🎨 Using fal.ai (auto-detected)')
    return await generateWithFal(env, baseImageUrl, phoneme, prompt, startTime)
  } else if (env.REPLICATE_API_KEY) {
    console.log('🎨 Using Replicate (auto-detected)')
    return await generateWithReplicate(env, baseImageUrl, phoneme, prompt, startTime)
  } else {
    throw new Error('No API key configured. Add GEMINI_API_KEY, BFL_API_KEY, FAL_API_KEY, or REPLICATE_API_KEY to .dev.vars')
  }
}

/**
 * Generate using fal.ai (fastest, recommended)
 */
async function generateWithFal(
  env: Env,
  baseImageUrl: string,
  phoneme: string,
  prompt: string,
  startTime: number
): Promise<FluxGenerationResult> {
  try {
    const response = await fetch('https://fal.run/fal-ai/flux-lora', {
      method: 'POST',
      headers: {
        Authorization: `Key ${env.FAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: baseImageUrl,
        prompt: `photorealistic portrait, same person, ${prompt}, professional photography, high detail, consistent lighting, front-facing, sharp focus`,
        negative_prompt:
          'blurry, low quality, distorted, disfigured, bad anatomy, extra limbs, deformed, unrealistic, different person, cartoon, painting',
        num_inference_steps: 28,
        guidance_scale: 3.5,
        num_images: 1,
        enable_safety_checker: false,
        output_format: 'jpeg',
        image_size: {
          width: 512,
          height: 512,
        },
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`FLUX generation failed for phoneme ${phoneme}:`, error)
      throw new Error(`FLUX API error: ${response.status}`)
    }

    const result = await response.json()

    return {
      imageUrl: result.images[0].url,
      phoneme,
      generationTime: Date.now() - startTime,
    }
  } catch (error) {
    console.error('fal.ai generation error:', error)
    throw error
  }
}

/**
 * Convert base64 data URL to a public Supabase Storage URL
 * BFL API requires publicly accessible URLs, not data: URLs
 */
async function uploadBase64ToCloudflare(
  env: Env,
  baseImageUrl: string,
  phoneme: string
): Promise<string> {
  console.log(`🔍 DEBUG: Checking image URL format for phoneme ${phoneme}`)

  // If it's already an https:// URL, return it
  if (baseImageUrl.startsWith('https://') || baseImageUrl.startsWith('http://')) {
    console.log(`✅ Image URL is already public: ${baseImageUrl.substring(0, 50)}...`)
    return baseImageUrl
  }

  // Convert base64 data URL to binary
  if (!baseImageUrl.startsWith('data:image/')) {
    throw new Error(`Invalid image URL format: ${baseImageUrl.substring(0, 50)}...`)
  }

  console.log(`⚠️ WARNING: Base64 data URL detected - uploading to Supabase Storage...`)

  try {
    // Extract MIME type and base64 data
    const matches = baseImageUrl.match(/^data:([^;]+);base64,(.+)$/)
    if (!matches) {
      throw new Error('Invalid base64 data URL format')
    }

    const mimeType = matches[1]
    const base64Data = matches[2]

    // Determine file extension from MIME type
    const extension = mimeType.split('/')[1] || 'png'

    // Generate unique filename
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 15)
    const filename = `avatars/phoneme-${phoneme}-${timestamp}-${randomId}.${extension}`

    console.log(`📤 Uploading to Supabase Storage: ${filename}`)

    // Convert base64 to binary
    const binaryString = atob(base64Data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    // Upload to Supabase Storage
    const uploadResponse = await fetch(
      `${env.SUPABASE_URL}/storage/v1/object/avatars/${filename}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
          'Content-Type': mimeType,
        },
        body: bytes,
      }
    )

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text()
      console.error(`❌ Supabase upload failed:`, errorText)
      throw new Error(`Supabase upload failed: ${uploadResponse.status} - ${errorText}`)
    }

    // Get public URL
    const publicUrl = `${env.SUPABASE_URL}/storage/v1/object/public/avatars/${filename}`
    console.log(`✅ Uploaded successfully: ${publicUrl}`)

    return publicUrl
  } catch (error) {
    console.error(`🔴 ERROR uploading to Supabase:`, error)
    throw new Error(`Failed to upload image to Supabase Storage: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Step 1: Generate normalized base image from user upload
 * This creates a FLUX-native image that's closer to training data
 * and provides a stable foundation for mouth variations
 */
async function generateNormalizedBase(
  env: Env,
  uploadedImageUrl: string
): Promise<string> {
  console.log(`🎨 STEP 1: Generating normalized base image from upload...`)

  const publicImageUrl = await uploadBase64ToCloudflare(env, uploadedImageUrl, 'base')

  // Convert to base64
  const imageResponse = await fetch(publicImageUrl)
  const imageBuffer = await imageResponse.arrayBuffer()
  const bytes = new Uint8Array(imageBuffer)
  let binary = ''
  const chunkSize = 8192
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length))
    binary += String.fromCharCode(...chunk)
  }
  const base64Image = btoa(binary)

  // Generate a clean, normalized, frontal portrait
  const requestBody = {
    prompt: `This exact person facing forward, mouth closed, neutral expression`,
    image_prompt: base64Image,
    image_prompt_strength: 0.95, // HIGHER preservation for more stability
    aspect_ratio: '1:1',
    safety_tolerance: 6,
    output_format: 'jpeg',
    raw: true, // Use raw mode for maximum control
  }

  const response = await fetch('https://api.bfl.ai/v1/flux-pro-1.1-ultra', {
    method: 'POST',
    headers: {
      'x-key': env.BFL_API_KEY!,
      'Content-Type': 'application/json',
      'accept': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error(`❌ Base normalization failed:`, error)
    throw new Error(`BFL API error: ${response.status} - ${error}`)
  }

  const result = await response.json()
  const pollingUrl = result.polling_url || `https://api.bfl.ai/v1/get_result?id=${result.id}`

  // Poll for completion
  let pollResult: any
  let attempts = 0
  const maxAttempts = 60

  while (attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, 2000))
    const pollResponse = await fetch(pollingUrl, {
      headers: {
        'x-key': env.BFL_API_KEY!,
        'accept': 'application/json',
      },
    })
    pollResult = await pollResponse.json()
    console.log(`🔄 Base normalization poll ${attempts + 1}/${maxAttempts}: ${pollResult.status}`)

    if (pollResult.status === 'Ready') break
    if (pollResult.status === 'Error' || pollResult.status === 'Failed') {
      throw new Error(`Base normalization failed: ${pollResult.error || pollResult.status}`)
    }
    attempts++
  }

  if (!pollResult || pollResult.status !== 'Ready') {
    throw new Error('Base normalization timeout')
  }

  console.log(`✅ STEP 1 COMPLETE: Normalized base image generated`)
  return pollResult.result.sample
}

/**
 * Step 2: Generate mouth variation from normalized base
 * Uses the FLUX-native base image for maximum stability
 */
async function generateWithBlackForest(
  env: Env,
  baseImageUrl: string,
  phoneme: string,
  prompt: string,
  startTime: number
): Promise<FluxGenerationResult> {
  console.log(`🔍 DEBUG: Entering generateWithBlackForest for phoneme ${phoneme}`)
  console.log(`🔍 DEBUG: BFL_API_KEY exists:`, !!env.BFL_API_KEY)
  console.log(`🔍 DEBUG: BFL_API_KEY value:`, env.BFL_API_KEY ? `${env.BFL_API_KEY.substring(0, 10)}...` : 'MISSING')
  console.log(`🔍 DEBUG: Base image URL:`, baseImageUrl.substring(0, 100))

  try {
    // Use the base image directly (should already be normalized FLUX output)
    const publicImageUrl = baseImageUrl.startsWith('http') ? baseImageUrl : await uploadBase64ToCloudflare(env, baseImageUrl, phoneme)

    console.log(`🎨 Sending generation request to BFL API for phoneme ${phoneme}`)

    // Convert image URL to base64 for image_prompt parameter
    console.log(`📥 Fetching image from URL to convert to base64...`)
    const imageResponse = await fetch(publicImageUrl)
    const imageBuffer = await imageResponse.arrayBuffer()

    // Convert ArrayBuffer to base64 in chunks to avoid stack overflow
    const bytes = new Uint8Array(imageBuffer)
    let binary = ''
    const chunkSize = 8192 // Process 8KB at a time
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length))
      binary += String.fromCharCode(...chunk)
    }
    const base64Image = btoa(binary)
    console.log(`✅ Converted image to base64 (${base64Image.length} chars)`)

    // Step 2: Submit FLUX 1.1 Pro Ultra generation for mouth variation
    // Working from normalized base for maximum stability
    // ULTRA-MINIMAL prompt focused ONLY on mouth change
    const requestBody = {
      prompt: `Same person, only change mouth: ${prompt}`,
      image_prompt: base64Image, // Base64 image for remixing
      image_prompt_strength: 0.99, // Maximum preservation = 99% identical, only 1% change for mouth
      aspect_ratio: '1:1',
      safety_tolerance: 6, // Least strict (0-6 scale)
      output_format: 'jpeg',
      raw: true, // Raw mode for maximum control and consistency
    }

    console.log(`🔍 DEBUG: Request body:`, JSON.stringify({ ...requestBody, image_prompt: `[base64 ${base64Image.length} chars]` }, null, 2))

    const response = await fetch('https://api.bfl.ai/v1/flux-pro-1.1-ultra', {
      method: 'POST',
      headers: {
        'x-key': env.BFL_API_KEY!,
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    console.log(`🔍 DEBUG: Response status:`, response.status)

    if (!response.ok) {
      const error = await response.text()
      console.error(`❌ BFL generation failed for phoneme ${phoneme}:`, error)
      throw new Error(`BFL API error: ${response.status} - ${error}`)
    }

    const result = await response.json()
    console.log(`✅ BFL generation submitted, polling for result...`, result)

    // Step 2: Poll for completion using the polling URL
    const pollingUrl = result.polling_url || `https://api.bfl.ai/v1/get_result?id=${result.id}`

    let pollResult: any
    let attempts = 0
    const maxAttempts = 60 // 60 attempts * 2 seconds = 2 minutes max

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 2000)) // Poll every 2 seconds

      const pollResponse = await fetch(pollingUrl, {
        headers: {
          'x-key': env.BFL_API_KEY!,
          'accept': 'application/json',
        },
      })

      pollResult = await pollResponse.json()
      console.log(`🔄 Poll attempt ${attempts + 1}/${maxAttempts}: ${pollResult.status}`)

      if (pollResult.status === 'Ready') {
        break
      } else if (pollResult.status === 'Error' || pollResult.status === 'Failed') {
        throw new Error(`BFL generation failed: ${pollResult.error || pollResult.status}`)
      }

      attempts++
    }

    if (!pollResult || pollResult.status !== 'Ready') {
      throw new Error('BFL generation timeout - took longer than 2 minutes')
    }

    console.log(`✅ BFL generation complete for phoneme ${phoneme}`)
    console.log(`🔍 DEBUG: Poll result:`, JSON.stringify(pollResult, null, 2))
    console.log(`🖼️ Generated image URL:`, pollResult.result?.sample)

    return {
      imageUrl: pollResult.result.sample,
      phoneme,
      generationTime: Date.now() - startTime,
    }
  } catch (error) {
    console.error(`🔴 ERROR in generateWithBlackForest for phoneme ${phoneme}:`, error)
    if (error instanceof Error) {
      console.error(`🔴 ERROR message:`, error.message)
      console.error(`🔴 ERROR stack:`, error.stack)
    }
    throw error
  }
}

/**
 * Generate using Gemini 2.5 Flash Image (Nano Banana)
 * Uses conversational editing for maximum consistency
 */
async function generateWithGemini(
  env: Env,
  baseImageUrl: string,
  phoneme: string,
  prompt: string,
  startTime: number
): Promise<FluxGenerationResult> {
  try {
    // Convert image to base64 if needed
    let imageData: string
    if (baseImageUrl.startsWith('data:image/')) {
      // Already base64
      imageData = baseImageUrl.split(',')[1]
    } else {
      // Fetch and convert
      const imageResponse = await fetch(baseImageUrl)
      const imageBuffer = await imageResponse.arrayBuffer()
      const bytes = new Uint8Array(imageBuffer)
      let binary = ''
      const chunkSize = 8192
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length))
        binary += String.fromCharCode(...chunk)
      }
      imageData = btoa(binary)
    }

    // Gemini API request with image editing
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: `Same person, only change mouth: ${prompt}`
            },
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: imageData
              }
            }
          ]
        }
      ],
      generationConfig: {
        response_modalities: ['Image'], // Only return image, no text
        image_config: {
          aspect_ratio: '1:1'
        }
      }
    }

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': env.GEMINI_API_KEY!,
        },
        body: JSON.stringify(requestBody),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error(`Gemini generation failed for phoneme ${phoneme}:`, error)
      throw new Error(`Gemini API error: ${response.status} - ${error}`)
    }

    const result = await response.json()

    // Extract image from response
    const imagePart = result.candidates?.[0]?.content?.parts?.find((p: any) => p.inline_data)
    if (!imagePart?.inline_data?.data) {
      throw new Error('No image data in Gemini response')
    }

    // Convert base64 to data URL
    const mimeType = imagePart.inline_data.mime_type || 'image/jpeg'
    const imageUrl = `data:${mimeType};base64,${imagePart.inline_data.data}`

    return {
      imageUrl,
      phoneme,
      generationTime: Date.now() - startTime,
    }
  } catch (error) {
    console.error('Gemini generation error:', error)
    throw error
  }
}

/**
 * Generate using Replicate
 */
async function generateWithReplicate(
  env: Env,
  baseImageUrl: string,
  phoneme: string,
  prompt: string,
  startTime: number
): Promise<FluxGenerationResult> {
  try {
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Token ${env.REPLICATE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: 'black-forest-labs/flux-dev',
        input: {
          image: baseImageUrl,
          prompt: `photorealistic portrait, same person, ${prompt}, professional photography, high detail, consistent lighting, front-facing, sharp focus`,
          negative_prompt:
            'blurry, low quality, distorted, disfigured, bad anatomy, extra limbs, deformed, unrealistic, different person, cartoon, painting',
          num_inference_steps: 28,
          guidance_scale: 3.5,
          num_outputs: 1,
        },
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`Replicate generation failed for phoneme ${phoneme}:`, error)
      throw new Error(`Replicate API error: ${response.status}`)
    }

    const prediction = await response.json()

    // Poll for completion
    let result = prediction
    while (result.status !== 'succeeded' && result.status !== 'failed') {
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const pollResponse = await fetch(
        `https://api.replicate.com/v1/predictions/${result.id}`,
        {
          headers: {
            Authorization: `Token ${env.REPLICATE_API_KEY}`,
          },
        }
      )

      result = await pollResponse.json()
    }

    if (result.status === 'failed') {
      throw new Error('Replicate generation failed')
    }

    return {
      imageUrl: result.output[0],
      phoneme,
      generationTime: Date.now() - startTime,
    }
  } catch (error) {
    console.error('Replicate generation error:', error)
    throw error
  }
}

/**
 * Generate 6 key mouth positions for audio-driven animation
 * TWO-STEP PROCESS for maximum stability (BFL only):
 * 1. Normalize uploaded image into FLUX training data space
 * 2. Generate 6 key mouth positions from that normalized base
 *
 * COST: 6 images × $0.04 = $0.24 per avatar (78% savings vs 27 variations)
 */
export async function generateAllMouthVariations(
  env: Env,
  baseImageUrl: string,
  onProgress?: (phoneme: string, index: number, total: number) => void,
  provider: 'bfl' | 'fal' | 'replicate' | 'gemini' | 'auto' = 'auto'
): Promise<Record<string, string>> {
  // Reduced to 6 key positions for audio-driven approach
  const phonemes = ['X', 'A', 'B', 'C', 'E', 'H']
  const results: Record<string, string> = {}

  // STEP 1: Generate normalized base image (only for BFL provider)
  let normalizedBase = baseImageUrl
  if (provider === 'bfl' || (provider === 'auto' && env.BFL_API_KEY && !env.GEMINI_API_KEY)) {
    console.log(`🎨 TWO-STEP PROCESS (BFL): First normalizing base image for stability...`)
    try {
      normalizedBase = await generateNormalizedBase(env, baseImageUrl)
      console.log(`✅ Using normalized base for all variations: ${normalizedBase.substring(0, 50)}...`)
    } catch (error) {
      console.error(`⚠️ Base normalization failed, using original:`, error)
      normalizedBase = baseImageUrl
    }
  }

  // STEP 2: Generate 6 key mouth positions from normalized base
  let completed = 0
  const total = phonemes.length // 6 total

  // Generate sequentially to avoid rate limits
  for (const phoneme of phonemes) {
    try {
      onProgress?.(phoneme, completed, total)

      const result = await generateMouthVariation(env, normalizedBase, phoneme, 'hold', provider)
      results[phoneme] = result.imageUrl

      completed++
      console.log(`✅ Generated ${phoneme} (${completed}/${total}) in ${result.generationTime}ms`)

      // Delay to respect rate limits - longer for Gemini free tier
      if (completed < total) {
        // Gemini free tier: ~15 requests/min = 4 second delay needed
        // BFL/FAL/Replicate: 500ms is fine
        const delay = provider === 'gemini' ? 4000 : 500
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    } catch (error) {
      console.error(`❌ Failed to generate ${phoneme}:`, error)
      // Continue with other variations even if one fails
    }
  }

  return results
}

/**
 * Alternative: Use FLUX with ControlNet for better face consistency
 * This requires face landmarks but produces superior results
 */
export async function generateWithControlNet(
  env: Env,
  baseImageUrl: string,
  phoneme: string,
  faceLandmarks?: string // OpenPose or Canny edge map
): Promise<FluxGenerationResult> {
  // TODO: Implement ControlNet-based generation
  // This will give us pixel-perfect mouth positioning
  throw new Error('ControlNet generation not implemented yet')
}

/**
 * Batch generate with parallel processing
 * Use this for faster generation if API supports it
 */
export async function generateBatch(
  env: Env,
  baseImageUrl: string,
  phonemes: string[],
  provider: 'bfl' | 'fal' | 'replicate' | 'auto' = 'auto'
): Promise<Record<string, string>> {
  const apiKey = env.BFL_API_KEY || env.FAL_API_KEY || env.REPLICATE_API_KEY

  if (!apiKey) {
    throw new Error('API key not configured')
  }

  // Generate all phonemes in parallel for speed
  const promises = phonemes.map((phoneme) =>
    generateMouthVariation(env, baseImageUrl, phoneme, provider)
  )

  const results = await Promise.all(promises)

  return results.reduce(
    (acc, result) => {
      acc[result.phoneme] = result.imageUrl
      return acc
    },
    {} as Record<string, string>
  )
}
