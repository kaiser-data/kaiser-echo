/**
 * API route for generating avatar mouth variations
 */

import type { Env } from '../index'
import { generateAllMouthVariations } from '../services/flux'

export interface GenerateRequest {
  imageUrl: string
  sessionId: string
  provider?: 'fal' | 'replicate' | 'auto'
}

export interface GenerateResponse {
  success: boolean
  variations?: Record<string, string>
  error?: string
  progress?: {
    current: number
    total: number
    phoneme: string
  }
}

/**
 * POST /api/generate-variations
 * Generates 9 mouth variations for uploaded avatar image
 */
export async function handleGenerateVariations(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const { imageUrl, sessionId, provider = 'auto' }: GenerateRequest = await request.json()

    if (!imageUrl) {
      return Response.json(
        {
          success: false,
          error: 'Image URL is required',
        } as GenerateResponse,
        { status: 400 }
      )
    }

    console.log(`🎨 Starting mouth variation generation for session ${sessionId} using provider: ${provider}`)

    // Generate all variations
    const variations = await generateAllMouthVariations(
      env,
      imageUrl,
      (phoneme, current, total) => {
        console.log(`Progress: ${phoneme} (${current + 1}/${total})`)
        // TODO: Send progress updates via WebSocket or Server-Sent Events
      },
      provider
    )

    console.log(`✅ Generated ${Object.keys(variations).length} mouth variations`)

    return Response.json({
      success: true,
      variations,
    } as GenerateResponse)
  } catch (error) {
    console.error('Generation error:', error)

    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      } as GenerateResponse,
      { status: 500 }
    )
  }
}

/**
 * GET /api/generate-status/:sessionId
 * Check generation status (for long-running generations)
 */
export async function handleGenerateStatus(
  request: Request,
  env: Env,
  sessionId: string
): Promise<Response> {
  // TODO: Implement status checking using Durable Objects or KV
  return Response.json({
    success: true,
    status: 'unknown',
    message: 'Status checking not implemented yet',
  })
}
