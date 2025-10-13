/**
 * Memory management API endpoints
 * Professional memory analytics and management
 */

import type { Env } from '../index'
import { jsonResponse } from '../utils/cors'
import { MemoryManager } from '../services/memoryManager'
import { checkUsageLimits } from '../utils/limits'

interface MemoryRequest {
  sessionId: string
  userId?: string
}

interface UpdateFactRequest extends MemoryRequest {
  factId: string
  value?: string
  verified?: boolean
  importance?: 'low' | 'medium' | 'high'
}

interface DeleteFactRequest extends MemoryRequest {
  factId: string
}

/**
 * Get memory profile and analytics
 */
export async function handleGetMemory(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url)
    const sessionId = url.searchParams.get('sessionId')
    const userId = url.searchParams.get('userId') || undefined

    if (!sessionId) {
      return jsonResponse(
        {
          success: false,
          error: 'Missing required parameter: sessionId',
        },
        400
      )
    }

    // Check usage limits
    const limitCheck = await checkUsageLimits(env, sessionId, userId)
    if (!limitCheck.allowed) {
      return jsonResponse(
        {
          success: false,
          error: limitCheck.error,
        },
        429
      )
    }

    const memoryManager = new MemoryManager(env)

    // Get memory profile and analytics
    const [profile, analytics, summary] = await Promise.all([
      memoryManager.getMemoryProfile(sessionId, userId),
      memoryManager.getMemoryAnalytics(sessionId, userId),
      memoryManager.generateMemorySummary(sessionId, userId)
    ])

    return jsonResponse({
      success: true,
      data: {
        profile,
        analytics,
        summary,
        timestamp: Date.now()
      }
    })

  } catch (error) {
    console.error('Memory retrieval error:', error)
    return jsonResponse(
      {
        success: false,
        error: 'Failed to retrieve memory data',
      },
      500
    )
  }
}

/**
 * Update a specific fact
 */
export async function handleUpdateFact(request: Request, env: Env): Promise<Response> {
  try {
    const body: UpdateFactRequest = await request.json()
    const { sessionId, userId, factId, value, verified, importance } = body

    if (!sessionId || !factId) {
      return jsonResponse(
        {
          success: false,
          error: 'Missing required fields: sessionId, factId',
        },
        400
      )
    }

    // Check usage limits
    const limitCheck = await checkUsageLimits(env, sessionId, userId)
    if (!limitCheck.allowed) {
      return jsonResponse(
        {
          success: false,
          error: limitCheck.error,
        },
        429
      )
    }

    const memoryManager = new MemoryManager(env)

    // Update the fact in database
    const updateData: any = {}
    if (value !== undefined) updateData.fact_value = value
    if (verified !== undefined) updateData.verified = verified
    if (importance !== undefined) updateData.importance = importance

    await memoryManager['db'].update('user_facts', updateData, { id: factId })

    return jsonResponse({
      success: true,
      message: 'Fact updated successfully',
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('Fact update error:', error)
    return jsonResponse(
      {
        success: false,
        error: 'Failed to update fact',
      },
      500
    )
  }
}

/**
 * Delete a specific fact
 */
export async function handleDeleteFact(request: Request, env: Env): Promise<Response> {
  try {
    const body: DeleteFactRequest = await request.json()
    const { sessionId, userId, factId } = body

    if (!sessionId || !factId) {
      return jsonResponse(
        {
          success: false,
          error: 'Missing required fields: sessionId, factId',
        },
        400
      )
    }

    // Check usage limits
    const limitCheck = await checkUsageLimits(env, sessionId, userId)
    if (!limitCheck.allowed) {
      return jsonResponse(
        {
          success: false,
          error: limitCheck.error,
        },
        429
      )
    }

    const memoryManager = new MemoryManager(env)

    // Delete the fact
    await memoryManager['db'].delete('user_facts', { id: factId })

    return jsonResponse({
      success: true,
      message: 'Fact deleted successfully',
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('Fact deletion error:', error)
    return jsonResponse(
      {
        success: false,
        error: 'Failed to delete fact',
      },
      500
    )
  }
}

/**
 * Force fact extraction from recent conversation
 */
export async function handleExtractFacts(request: Request, env: Env): Promise<Response> {
  try {
    const body: MemoryRequest = await request.json()
    const { sessionId, userId } = body

    if (!sessionId) {
      return jsonResponse(
        {
          success: false,
          error: 'Missing required field: sessionId',
        },
        400
      )
    }

    // Check usage limits
    const limitCheck = await checkUsageLimits(env, sessionId, userId)
    if (!limitCheck.allowed) {
      return jsonResponse(
        {
          success: false,
          error: limitCheck.error,
        },
        429
      )
    }

    const memoryManager = new MemoryManager(env)

    // Get recent conversation
    const db = memoryManager['db']
    const recentMessages = await db.select('messages', {
      session_id: sessionId,
      select: '*',
      order: 'created_at.desc',
      limit: 20
    })

    const conversationText = recentMessages
      .reverse()
      .map((msg: any) => `${msg.role}: ${msg.content}`)
      .join('\n')

    // Extract and store facts
    const facts = await memoryManager.extractFacts(conversationText, sessionId, userId)
    await memoryManager.storeFacts(facts)

    return jsonResponse({
      success: true,
      message: `Extracted ${facts.length} facts from recent conversation`,
      factsExtracted: facts.length,
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('Fact extraction error:', error)
    return jsonResponse(
      {
        success: false,
        error: 'Failed to extract facts',
      },
      500
    )
  }
}

/**
 * Get memory insights and recommendations
 */
export async function handleMemoryInsights(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url)
    const sessionId = url.searchParams.get('sessionId')
    const userId = url.searchParams.get('userId') || undefined

    if (!sessionId) {
      return jsonResponse(
        {
          success: false,
          error: 'Missing required parameter: sessionId',
        },
        400
      )
    }

    const memoryManager = new MemoryManager(env)
    const analytics = await memoryManager.getMemoryAnalytics(sessionId, userId)

    // Generate insights
    const insights = {
      completeness: calculateCompleteness(analytics),
      recommendations: generateRecommendations(analytics),
      quality: assessQuality(analytics),
      engagement: calculateEngagement(analytics)
    }

    return jsonResponse({
      success: true,
      data: {
        analytics,
        insights,
        timestamp: Date.now()
      }
    })

  } catch (error) {
    console.error('Memory insights error:', error)
    return jsonResponse(
      {
        success: false,
        error: 'Failed to generate memory insights',
      },
      500
    )
  }
}

// Helper functions for insights
function calculateCompleteness(analytics: any): number {
  const totalCategories = 8 // identity, location, profession, interests, preferences, relationships, goals, context
  const filledCategories = Object.keys(analytics.factsByCategory).length
  return Math.min(filledCategories / totalCategories, 1.0)
}

function generateRecommendations(analytics: any): string[] {
  const recommendations: string[] = []

  if (analytics.totalFacts < 5) {
    recommendations.push('Encourage more personal sharing to build a richer memory profile')
  }

  if (analytics.averageConfidence < 0.7) {
    recommendations.push('Consider asking clarifying questions to improve fact confidence')
  }

  if (!analytics.factsByCategory.profession) {
    recommendations.push('Ask about their work or profession to understand their professional context')
  }

  if (!analytics.factsByCategory.interests) {
    recommendations.push('Explore their hobbies and interests for more engaging conversations')
  }

  if (analytics.recentActivity === 0) {
    recommendations.push('Recent conversation lacks new personal information - consider deeper engagement')
  }

  return recommendations
}

function assessQuality(analytics: any): {
  score: number
  factors: Record<string, number>
} {
  const factors = {
    quantity: Math.min(analytics.totalFacts / 20, 1.0),
    confidence: analytics.averageConfidence,
    verification: analytics.verifiedFacts / (analytics.totalFacts || 1),
    diversity: Math.min(Object.keys(analytics.factsByCategory).length / 8, 1.0),
    recency: Math.min(analytics.recentActivity / 5, 1.0)
  }

  const score = Object.values(factors).reduce((sum, value) => sum + value, 0) / Object.keys(factors).length

  return { score, factors }
}

function calculateEngagement(analytics: any): {
  level: 'low' | 'medium' | 'high'
  score: number
} {
  const score = (analytics.totalFacts * 0.4) + (analytics.recentActivity * 0.6)

  let level: 'low' | 'medium' | 'high'
  if (score < 3) level = 'low'
  else if (score < 8) level = 'medium'
  else level = 'high'

  return { level, score: Math.min(score / 10, 1.0) }
}