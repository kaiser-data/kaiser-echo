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
 * Phoneme-specific prompts for FLUX generation
 * These create photorealistic mouth positions
 */
const PHONEME_PROMPTS: Record<string, string> = {
  X: 'mouth closed, lips gently together, calm neutral expression, relaxed face',
  A: 'mouth slightly open, relaxed neutral expression, soft lips',
  B: 'mouth wide open, saying "ah" sound, visible upper and lower teeth, open jaw',
  C: 'lips pressed tightly together, saying "m" sound, closed mouth, pursed lips',
  D: 'mouth moderately open, saying "eh" sound, teeth slightly visible',
  E: 'lips rounded and puckered forward, saying "oo" sound, circular mouth shape',
  F: 'upper front teeth touching lower lip, saying "f" sound, lip-teeth contact',
  G: 'mouth open, tongue tip visible between teeth, saying "th" sound',
  H: 'wide smile, lips stretched horizontally, saying "ee" sound, teeth showing',
}

/**
 * Generate a single mouth variation using FLUX
 * Uses user's provider preference or automatically detects available API
 */
export async function generateMouthVariation(
  env: Env,
  baseImageUrl: string,
  phoneme: string,
  provider: 'bfl' | 'fal' | 'replicate' | 'auto' = 'auto'
): Promise<FluxGenerationResult> {
  const startTime = Date.now()
  const prompt = PHONEME_PROMPTS[phoneme] || PHONEME_PROMPTS.A

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

  // Auto mode: Priority BFL > FAL > REPLICATE
  if (env.BFL_API_KEY) {
    console.log('🎨 Using Black Forest Labs direct API (auto-detected)')
    return await generateWithBlackForest(env, baseImageUrl, phoneme, prompt, startTime)
  } else if (env.FAL_API_KEY) {
    console.log('🎨 Using fal.ai (auto-detected)')
    return await generateWithFal(env, baseImageUrl, phoneme, prompt, startTime)
  } else if (env.REPLICATE_API_KEY) {
    console.log('🎨 Using Replicate (auto-detected)')
    return await generateWithReplicate(env, baseImageUrl, phoneme, prompt, startTime)
  } else {
    throw new Error('No API key configured. Add BFL_API_KEY, FAL_API_KEY, or REPLICATE_API_KEY to .dev.vars')
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
 * Generate using Black Forest Labs direct API (api.bfl.ai)
 */
async function generateWithBlackForest(
  env: Env,
  baseImageUrl: string,
  phoneme: string,
  prompt: string,
  startTime: number
): Promise<FluxGenerationResult> {
  try {
    // Step 1: Submit image-to-image generation request
    const response = await fetch('https://api.bfl.ai/v1/flux-pro-1.1', {
      method: 'POST',
      headers: {
        'x-key': env.BFL_API_KEY!,
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify({
        prompt: `photorealistic portrait, same person, ${prompt}, professional photography, high detail, consistent lighting, front-facing, sharp focus`,
        image_url: baseImageUrl,
        strength: 0.75, // Keep most of the original image
        num_inference_steps: 28,
        guidance_scale: 3.5,
        num_images: 1,
        enable_safety_checker: false,
        output_format: 'jpeg',
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`BFL generation failed for phoneme ${phoneme}:`, error)
      throw new Error(`BFL API error: ${response.status}`)
    }

    const result = await response.json()

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

    return {
      imageUrl: pollResult.result.sample,
      phoneme,
      generationTime: Date.now() - startTime,
    }
  } catch (error) {
    console.error('Black Forest Labs API generation error:', error)
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
 * Generate all 9 mouth variations for a base image
 * This creates a complete set for lip-sync animation
 */
export async function generateAllMouthVariations(
  env: Env,
  baseImageUrl: string,
  onProgress?: (phoneme: string, index: number, total: number) => void,
  provider: 'bfl' | 'fal' | 'replicate' | 'auto' = 'auto'
): Promise<Record<string, string>> {
  const phonemes = ['X', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
  const results: Record<string, string> = {}

  let completed = 0
  const total = phonemes.length

  // Generate sequentially to avoid rate limits
  for (const phoneme of phonemes) {
    try {
      onProgress?.(phoneme, completed, total)

      const result = await generateMouthVariation(env, baseImageUrl, phoneme, provider)
      results[phoneme] = result.imageUrl

      completed++
      console.log(
        `✅ Generated phoneme ${phoneme} (${completed}/${total}) in ${result.generationTime}ms`
      )

      // Small delay to respect rate limits
      if (completed < total) {
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    } catch (error) {
      console.error(`❌ Failed to generate phoneme ${phoneme}:`, error)
      // Continue with other phonemes even if one fails
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
