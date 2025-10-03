/**
 * Facts retrieval handler
 */

import type { Env } from '../index'
import { jsonResponse } from '../utils/cors'
import { SupabaseClient } from '../utils/supabase'

export async function handleGetFacts(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url)
    const sessionId = url.searchParams.get('sessionId')
    const userId = url.searchParams.get('userId')

    if (!sessionId) {
      return jsonResponse(
        {
          success: false,
          error: 'Missing sessionId parameter',
        },
        400
      )
    }

    const db = new SupabaseClient(env)

    const query: any = { session_id: sessionId, select: '*' }
    if (userId) {
      query.user_id = userId
    }

    const facts = await db.select('user_facts', query)

    const formattedFacts = facts.map((fact: any) => ({
      id: fact.id,
      factType: fact.fact_type,
      factValue: fact.fact_value,
      confidence: fact.confidence,
      createdAt: fact.created_at,
    }))

    return jsonResponse({
      success: true,
      data: formattedFacts,
    })
  } catch (error) {
    console.error('Get facts error:', error)
    return jsonResponse(
      {
        success: false,
        error: 'Failed to retrieve facts',
      },
      500
    )
  }
}
