/**
 * Chat handler with memory system
 */

import type { Env } from '../index'
import { jsonResponse } from '../utils/cors'
import { SupabaseClient } from '../utils/supabase'
import { checkUsageLimits, incrementUsage } from '../utils/limits'
// import { extractFacts } from '../services/factExtraction' // Legacy - now using MemoryManager
import { generateResponse } from '../services/llm'
import { MemoryManager } from '../services/memoryManager'

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
    const memoryManager = new MemoryManager(env)

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

    // Get professional memory summary
    const memoryProfile = await memoryManager.getMemoryProfile(sessionId, userId)

    // Convert memory profile to facts format for LLM compatibility
    const facts: Array<{ type: string; value: string }> = []
    for (const [category, categoryFacts] of Object.entries(memoryProfile)) {
      for (const [subcategory, fact] of Object.entries(categoryFacts)) {
        if (fact && fact.importance !== 'low') { // Only include medium/high importance facts
          facts.push({
            type: `${category}.${subcategory}`,
            value: fact.value,
          })
        }
      }
    }

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

    // Extract facts from conversation every 3 messages using professional memory manager
    const messageCount = await db.select('messages', {
      session_id: sessionId,
      select: 'id',
    })

    if (messageCount.length % 6 === 0) {
      // Extract facts in background using professional memory manager
      extractAndStoreFacts(memoryManager, sessionId, userId, recentMessages).catch((error) =>
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
  memoryManager: MemoryManager,
  sessionId: string,
  userId: string | undefined,
  messages: Array<{ role: string; content: string }>
): Promise<void> {
  try {
    const conversationText = messages
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n')

    // Use professional memory manager for advanced fact extraction
    const facts = await memoryManager.extractFacts(conversationText, sessionId, userId)

    // Store facts using the professional memory manager
    await memoryManager.storeFacts(facts)

    console.log(`Extracted and stored ${facts.length} facts for session ${sessionId}`)
  } catch (error) {
    console.error('Error extracting and storing facts:', error)
  }
}
