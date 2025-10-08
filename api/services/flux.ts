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
 */
export async function generateMouthVariation(
  env: Env,
  baseImageUrl: string,
  phoneme: string
): Promise<FluxGenerationResult> {
  const apiKey = env.FAL_API_KEY || env.BLACK_FOREST_API_KEY

  if (!apiKey) {
    throw new Error('FAL_API_KEY or BLACK_FOREST_API_KEY not configured')
  }

  const startTime = Date.now()
  const prompt = PHONEME_PROMPTS[phoneme] || PHONEME_PROMPTS.A

  try {
    // Use FLUX Redux for face-consistent generation
    const response = await fetch('https://fal.run/fal-ai/flux-lora', {
      method: 'POST',
      headers: {
        Authorization: `Key ${apiKey}`,
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
    console.error('FLUX generation error:', error)
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
  onProgress?: (phoneme: string, index: number, total: number) => void
): Promise<Record<string, string>> {
  const phonemes = ['X', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
  const results: Record<string, string> = {}

  let completed = 0
  const total = phonemes.length

  // Generate sequentially to avoid rate limits
  for (const phoneme of phonemes) {
    try {
      onProgress?.(phoneme, completed, total)

      const result = await generateMouthVariation(env, baseImageUrl, phoneme)
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
  phonemes: string[]
): Promise<Record<string, string>> {
  const apiKey = env.FAL_API_KEY || env.BLACK_FOREST_API_KEY

  if (!apiKey) {
    throw new Error('API key not configured')
  }

  // Generate all phonemes in parallel for speed
  const promises = phonemes.map((phoneme) =>
    generateMouthVariation(env, baseImageUrl, phoneme)
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
