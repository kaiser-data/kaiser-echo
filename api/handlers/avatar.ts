/**
 * Avatar customization handler
 */

import type { Env } from '../index'
import { jsonResponse } from '../utils/cors'
import { SupabaseClient } from '../utils/supabase'

export async function handleCustomizeAvatar(request: Request, env: Env): Promise<Response> {
  try {
    const body: { sessionId: string; avatarConfig: object } = await request.json()
    const { sessionId, avatarConfig } = body

    if (!sessionId || !avatarConfig) {
      return jsonResponse(
        {
          success: false,
          error: 'Missing required fields: sessionId, avatarConfig',
        },
        400
      )
    }

    const db = new SupabaseClient(env)

    // Update session with avatar config
    await db.update(
      'sessions',
      { avatar_config: avatarConfig },
      { session_id: sessionId }
    )

    return jsonResponse({
      success: true,
      message: 'Avatar customized successfully',
    })
  } catch (error) {
    console.error('Customize avatar error:', error)
    return jsonResponse(
      {
        success: false,
        error: 'Failed to customize avatar',
      },
      500
    )
  }
}
