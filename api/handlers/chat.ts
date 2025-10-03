/**
 * Chat handler with memory system
 */

import type { Env } from '../index'
import { jsonResponse } from '../utils/cors'
import { SupabaseClient } from '../utils/supabase'
import { checkUsageLimits, incrementUsage } from '../utils/limits'
import { extractFacts } from '../services/factExtraction'
import { generateResponse } from '../services/llm'

interface ChatRequest {
  sessionId: string
  message: string
  language: 'en' | 'de'
  userId?: string
}

export async function handleChat(request: Request, env: Env): Promise<Response> {
  try {
    const body: ChatRequest = await request.json()
    const { sessionId, message, language, userId } = body

    if (!sessionId || !message || !language) {
      return jsonResponse(
        {
          success: false,
          error: 'Missing required fields: sessionId, message, language',
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

    const db = new SupabaseClient(env)

    // Ensure session exists
    await ensureSession(db, sessionId, userId, language)

    // Store user message
    await db.insert('messages', {
      session_id: sessionId,
      user_id: userId || null,
      role: 'user',
      content: message,
      language,
    })

    // Get conversation history (last 10 messages)
    const history = await db.select('messages', {
      session_id: sessionId,
      select: '*',
      order: 'created_at.desc',
      limit: 10,
    })

    const recentMessages = history.reverse().map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }))

    // Get user facts
    const factsQuery: any = { session_id: sessionId, select: '*' }
    if (userId) {
      factsQuery.user_id = userId
    }

    const userFacts = await db.select('user_facts', factsQuery)

    const facts = userFacts.map((fact: any) => ({
      type: fact.fact_type,
      value: fact.fact_value,
    }))

    const memoryUsed = facts.length > 0

    // Generate response using LLM
    const aiResponse = await generateResponse(env, {
      message,
      language,
      history: recentMessages,
      facts,
    })

    // Store assistant message
    await db.insert('messages', {
      session_id: sessionId,
      user_id: userId || null,
      role: 'assistant',
      content: aiResponse,
      language,
    })

    // Extract facts from conversation every 3 messages
    const messageCount = await db.select('messages', {
      session_id: sessionId,
      select: 'id',
    })

    if (messageCount.length % 6 === 0) {
      // Extract facts in background (don't await)
      extractAndStoreFacts(db, sessionId, userId, recentMessages).catch((error) =>
        console.error('Error extracting facts:', error)
      )
    }

    // Increment usage
    await incrementUsage(env, sessionId, userId)

    return jsonResponse({
      success: true,
      response: aiResponse,
      memoryUsed,
      facts: facts.map((f: any) => ({
        id: crypto.randomUUID(),
        factType: f.type,
        factValue: f.value,
        confidence: 1.0,
        createdAt: new Date().toISOString(),
      })),
    })
  } catch (error) {
    console.error('Chat error:', error)
    return jsonResponse(
      {
        success: false,
        error: 'Failed to process chat request',
      },
      500
    )
  }
}

async function ensureSession(
  db: SupabaseClient,
  sessionId: string,
  userId: string | undefined,
  language: string
): Promise<void> {
  try {
    const existing = await db.select('sessions', { session_id: sessionId })

    if (!existing || existing.length === 0) {
      await db.insert('sessions', {
        session_id: sessionId,
        user_id: userId || null,
        language,
        avatar_config: {},
      })
    } else {
      // Update last active
      await db.update(
        'sessions',
        { last_active: new Date().toISOString() },
        { session_id: sessionId }
      )
    }
  } catch (error) {
    console.error('Error ensuring session:', error)
  }
}

async function extractAndStoreFacts(
  db: SupabaseClient,
  sessionId: string,
  userId: string | undefined,
  messages: Array<{ role: string; content: string }>
): Promise<void> {
  try {
    // This would call the LLM to extract facts
    // For now, we'll implement basic pattern matching
    const conversationText = messages
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n')

    // Simple fact extraction (in production, use LLM)
    const facts = await extractFacts(conversationText)

    // Store new facts
    for (const fact of facts) {
      // Check if fact already exists
      const existing = await db.select('user_facts', {
        session_id: sessionId,
        fact_type: fact.type,
        fact_value: fact.value,
      })

      if (!existing || existing.length === 0) {
        await db.insert('user_facts', {
          user_id: userId || null,
          session_id: sessionId,
          fact_type: fact.type,
          fact_value: fact.value,
          confidence: fact.confidence || 0.8,
        })
      }
    }
  } catch (error) {
    console.error('Error extracting and storing facts:', error)
  }
}
