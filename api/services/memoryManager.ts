/**
 * Professional Memory Management System
 * Advanced fact extraction, validation, and organization for Kaiser Echo
 */

import type { Env } from '../index'
import { SupabaseClient } from '../utils/supabase'

// Enhanced fact types with subcategories
export type FactType =
  | 'identity.name'
  | 'identity.age'
  | 'identity.gender'
  | 'location.residence'
  | 'location.workplace'
  | 'location.origin'
  | 'profession.title'
  | 'profession.company'
  | 'profession.industry'
  | 'profession.experience'
  | 'interests.hobby'
  | 'interests.sport'
  | 'interests.music'
  | 'interests.technology'
  | 'interests.entertainment'
  | 'preferences.food'
  | 'preferences.language'
  | 'preferences.style'
  | 'relationships.family'
  | 'relationships.friends'
  | 'relationships.status'
  | 'goals.personal'
  | 'goals.professional'
  | 'goals.learning'
  | 'context.recent_topic'
  | 'context.current_project'

export interface MemoryFact {
  id?: string
  type: FactType
  value: string
  confidence: number
  context?: string
  source: 'conversation' | 'explicit' | 'inferred'
  timestamp: number
  sessionId: string
  userId?: string
  verified: boolean
  importance: 'low' | 'medium' | 'high'
  expires?: number // timestamp for temporary facts
}

export interface MemoryProfile {
  identity: Record<string, MemoryFact>
  location: Record<string, MemoryFact>
  profession: Record<string, MemoryFact>
  interests: Record<string, MemoryFact>
  preferences: Record<string, MemoryFact>
  relationships: Record<string, MemoryFact>
  goals: Record<string, MemoryFact>
  context: Record<string, MemoryFact>
}

export interface ConversationContext {
  recentTopics: string[]
  emotionalState: 'positive' | 'neutral' | 'negative'
  interactionPattern: 'first_time' | 'returning' | 'frequent'
  preferredLanguage: 'en' | 'de'
  lastInteraction: number
}

export class MemoryManager {
  private db: SupabaseClient
  private env: Env

  constructor(env: Env) {
    this.env = env
    this.db = new SupabaseClient(env)
  }

  /**
   * Extract facts from conversation using advanced LLM-based analysis
   */
  async extractFacts(
    conversationText: string,
    sessionId: string,
    userId?: string
  ): Promise<MemoryFact[]> {
    const facts: MemoryFact[] = []

    // Use LLM for intelligent fact extraction
    const extractedFacts = await this.llmFactExtraction(conversationText)

    for (const fact of extractedFacts) {
      const memoryFact: MemoryFact = {
        type: fact.type,
        value: fact.value,
        confidence: fact.confidence,
        context: fact.context,
        source: 'conversation',
        timestamp: Date.now(),
        sessionId,
        userId,
        verified: fact.confidence > 0.8,
        importance: this.assessImportance(fact.type, fact.value),
        expires: this.shouldExpire(fact.type) ? Date.now() + (24 * 60 * 60 * 1000) : undefined
      }
      facts.push(memoryFact)
    }

    return facts
  }

  /**
   * LLM-based fact extraction using structured prompts
   */
  private async llmFactExtraction(conversationText: string): Promise<any[]> {
    const prompt = `Extract personal facts from this conversation. Return a JSON array of facts with this structure:
{
  "type": "category.subcategory" (like "identity.name", "profession.title", "interests.hobby"),
  "value": "extracted value",
  "confidence": 0.0-1.0,
  "context": "surrounding context"
}

Categories:
- identity: name, age, gender
- location: residence, workplace, origin
- profession: title, company, industry, experience
- interests: hobby, sport, music, technology, entertainment
- preferences: food, language, style
- relationships: family, friends, status
- goals: personal, professional, learning
- context: recent_topic, current_project

Conversation:
${conversationText}

Extract only clear, factual information. Avoid assumptions or inferences unless confidence is very high.`

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 1000,
        }),
      })

      if (!response.ok) {
        console.error('LLM fact extraction failed:', await response.text())
        return []
      }

      const data = await response.json()
      const content = data.choices[0].message.content

      // Try to parse JSON response
      try {
        return JSON.parse(content)
      } catch {
        // Fallback to pattern matching if JSON parsing fails
        return this.fallbackPatternMatching(conversationText)
      }
    } catch (error) {
      console.error('Error in LLM fact extraction:', error)
      return this.fallbackPatternMatching(conversationText)
    }
  }

  /**
   * Fallback pattern matching for fact extraction
   */
  private fallbackPatternMatching(conversationText: string): any[] {
    const facts: any[] = []

    // Enhanced patterns with better categorization
    const patterns = [
      // Identity
      {
        type: 'identity.name',
        pattern: /(?:my name is|i'm|i am|call me|ich heiße|ich bin)\s+([A-Z][a-zA-Z]+)/i,
        confidence: 0.9
      },
      {
        type: 'identity.age',
        pattern: /(?:i am|i'm)\s+(\d+)\s+years?\s+old/i,
        confidence: 0.95
      },

      // Location
      {
        type: 'location.residence',
        pattern: /(?:i live in|i'm from|based in|ich wohne in)\s+([A-Z][a-zA-Z\s]+)/i,
        confidence: 0.85
      },
      {
        type: 'location.workplace',
        pattern: /(?:work in|working in|office in)\s+([A-Z][a-zA-Z\s]+)/i,
        confidence: 0.8
      },

      // Profession
      {
        type: 'profession.title',
        pattern: /(?:i work as|i'm a|i am a|my job is|ich arbeite als)\s+(?:a\s+)?([a-zA-Z\s]+(?:developer|engineer|designer|manager|teacher|doctor|nurse|artist|writer|consultant|analyst))/i,
        confidence: 0.9
      },
      {
        type: 'profession.company',
        pattern: /(?:work at|working at|employed at)\s+([A-Z][a-zA-Z\s&]+)/i,
        confidence: 0.85
      },

      // Interests
      {
        type: 'interests.hobby',
        pattern: /(?:my hobby is|i enjoy|hobby|hobbies.*include)\s+([a-zA-Z\s]+)/i,
        confidence: 0.8
      },
      {
        type: 'interests.technology',
        pattern: /(?:i use|working with|interested in|love|like)\s+(python|javascript|react|node|docker|kubernetes|ai|machine learning|programming)/i,
        confidence: 0.85
      },

      // Goals
      {
        type: 'goals.learning',
        pattern: /(?:want to learn|learning|studying)\s+([a-zA-Z\s]+)/i,
        confidence: 0.8
      },
      {
        type: 'goals.professional',
        pattern: /(?:want to become|goal is to|planning to)\s+([a-zA-Z\s]+)/i,
        confidence: 0.75
      }
    ]

    for (const { type, pattern, confidence } of patterns) {
      const match = conversationText.match(pattern)
      if (match && match[1]) {
        facts.push({
          type,
          value: match[1].trim(),
          confidence,
          context: match[0]
        })
      }
    }

    return facts
  }

  /**
   * Store facts in database with deduplication and validation
   */
  async storeFacts(facts: MemoryFact[]): Promise<void> {
    for (const fact of facts) {
      // Check for existing similar facts
      const existing = await this.db.select('user_facts', {
        session_id: fact.sessionId,
        fact_type: fact.type,
      })

      let shouldStore = true
      let shouldUpdate = false
      let existingId: string | undefined

      for (const existingFact of existing as any[]) {
        const similarity = this.calculateSimilarity(fact.value, existingFact.fact_value)

        if (similarity > 0.8) {
          // Very similar fact exists
          if (fact.confidence > existingFact.confidence) {
            // New fact has higher confidence, update existing
            shouldUpdate = true
            existingId = existingFact.id
            shouldStore = false
          } else {
            // Keep existing fact
            shouldStore = false
          }
          break
        }
      }

      if (shouldStore) {
        await this.db.insert('user_facts', {
          user_id: fact.userId || null,
          session_id: fact.sessionId,
          fact_type: fact.type,
          fact_value: fact.value,
          confidence: fact.confidence,
          context: fact.context,
          source: fact.source,
          verified: fact.verified,
          importance: fact.importance,
          expires_at: fact.expires ? new Date(fact.expires).toISOString() : null,
        })
      } else if (shouldUpdate && existingId) {
        await this.db.update('user_facts', {
          fact_value: fact.value,
          confidence: fact.confidence,
          context: fact.context,
          verified: fact.verified,
          importance: fact.importance,
        }, { id: existingId })
      }
    }
  }

  /**
   * Retrieve organized memory profile for a user/session
   */
  async getMemoryProfile(sessionId: string, userId?: string): Promise<MemoryProfile> {
    const query: any = { session_id: sessionId, select: '*' }
    if (userId) {
      query.user_id = userId
    }

    // Remove expired facts
    await this.cleanupExpiredFacts(sessionId)

    const facts = await this.db.select('user_facts', query) as any[]

    const profile: MemoryProfile = {
      identity: {},
      location: {},
      profession: {},
      interests: {},
      preferences: {},
      relationships: {},
      goals: {},
      context: {}
    }

    for (const fact of facts) {
      const [category, subcategory] = fact.fact_type.split('.')
      if (profile[category as keyof MemoryProfile]) {
        profile[category as keyof MemoryProfile][subcategory] = {
          id: fact.id,
          type: fact.fact_type,
          value: fact.fact_value,
          confidence: fact.confidence,
          context: fact.context,
          source: fact.source,
          timestamp: new Date(fact.created_at).getTime(),
          sessionId: fact.session_id,
          userId: fact.user_id,
          verified: fact.verified,
          importance: fact.importance,
          expires: fact.expires_at ? new Date(fact.expires_at).getTime() : undefined
        }
      }
    }

    return profile
  }

  /**
   * Generate contextual memory summary for LLM
   */
  async generateMemorySummary(sessionId: string, userId?: string): Promise<string> {
    const profile = await this.getMemoryProfile(sessionId, userId)
    const summary: string[] = []

    // Identity
    if (profile.identity.name) {
      summary.push(`Name: ${profile.identity.name.value}`)
    }
    if (profile.identity.age) {
      summary.push(`Age: ${profile.identity.age.value}`)
    }

    // Professional
    if (profile.profession.title) {
      summary.push(`Profession: ${profile.profession.title.value}`)
    }
    if (profile.profession.company) {
      summary.push(`Company: ${profile.profession.company.value}`)
    }

    // Location
    if (profile.location.residence) {
      summary.push(`Lives in: ${profile.location.residence.value}`)
    }

    // Interests (high importance only)
    const interests = Object.values(profile.interests)
      .filter(fact => fact.importance === 'high')
      .map(fact => fact.value)
    if (interests.length > 0) {
      summary.push(`Interests: ${interests.join(', ')}`)
    }

    // Recent context
    const recentContext = Object.values(profile.context)
      .filter(fact => Date.now() - fact.timestamp < 24 * 60 * 60 * 1000) // Last 24 hours
      .map(fact => fact.value)
    if (recentContext.length > 0) {
      summary.push(`Recent topics: ${recentContext.join(', ')}`)
    }

    return summary.join(' • ')
  }

  /**
   * Assess importance of a fact based on type and value
   */
  private assessImportance(type: FactType, value: string): 'low' | 'medium' | 'high' {
    // High importance facts
    if (type.includes('identity.') || type.includes('profession.title') || type.includes('location.residence')) {
      return 'high'
    }

    // Medium importance facts
    if (type.includes('profession.') || type.includes('goals.') || type.includes('interests.')) {
      return 'medium'
    }

    // Low importance facts (context, temporary preferences)
    return 'low'
  }

  /**
   * Determine if a fact type should expire
   */
  private shouldExpire(type: FactType): boolean {
    return type.includes('context.') || type.includes('preferences.')
  }

  /**
   * Calculate similarity between two strings
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1

    if (longer.length === 0) {
      return 1.0
    }

    const editDistance = this.levenshteinDistance(longer, shorter)
    return (longer.length - editDistance) / longer.length
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = []

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }

    return matrix[str2.length][str1.length]
  }

  /**
   * Clean up expired facts
   */
  private async cleanupExpiredFacts(sessionId: string): Promise<void> {
    const now = new Date().toISOString()

    // Delete expired facts
    await this.db.delete('user_facts', {
      session_id: sessionId,
      expires_at: { lt: now }
    })
  }

  /**
   * Get memory analytics and insights
   */
  async getMemoryAnalytics(sessionId: string, userId?: string): Promise<{
    totalFacts: number
    factsByCategory: Record<string, number>
    averageConfidence: number
    verifiedFacts: number
    recentActivity: number
  }> {
    const query: any = { session_id: sessionId, select: '*' }
    if (userId) {
      query.user_id = userId
    }

    const facts = await this.db.select('user_facts', query) as any[]

    const analytics = {
      totalFacts: facts.length,
      factsByCategory: {} as Record<string, number>,
      averageConfidence: 0,
      verifiedFacts: 0,
      recentActivity: 0
    }

    let totalConfidence = 0
    const dayAgo = Date.now() - (24 * 60 * 60 * 1000)

    for (const fact of facts) {
      // Count by category
      const category = fact.fact_type.split('.')[0]
      analytics.factsByCategory[category] = (analytics.factsByCategory[category] || 0) + 1

      // Sum confidence
      totalConfidence += fact.confidence

      // Count verified facts
      if (fact.verified) {
        analytics.verifiedFacts++
      }

      // Count recent activity
      if (new Date(fact.created_at).getTime() > dayAgo) {
        analytics.recentActivity++
      }
    }

    analytics.averageConfidence = facts.length > 0 ? totalConfidence / facts.length : 0

    return analytics
  }
}