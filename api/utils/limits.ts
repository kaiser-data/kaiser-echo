/**
 * Usage tracking and cost control utilities
 */

import { SupabaseClient } from './supabase'
import type { Env } from '../index'

const DAILY_LIMIT = 20
const MONTHLY_LIMIT = 2000

export async function checkUsageLimits(
  env: Env,
  sessionId: string,
  userId?: string
): Promise<{ allowed: boolean; error?: string; remaining?: number }> {
  const db = new SupabaseClient(env)
  const today = new Date().toISOString().split('T')[0]

  try {
    // Check user daily limit
    const userUsageQuery: any = { date: today }
    if (userId) {
      userUsageQuery.user_id = userId
    } else {
      userUsageQuery.session_id = sessionId
    }

    const userUsage = await db.select('daily_usage', userUsageQuery)
    const conversationsToday = userUsage[0]?.conversation_count || 0

    if (conversationsToday >= DAILY_LIMIT) {
      return {
        allowed: false,
        error: 'Daily limit reached (20 conversations). Try again tomorrow!',
        remaining: 0,
      }
    }

    // Check system monthly limit
    const monthStart = new Date().toISOString().slice(0, 7) + '-01'
    const monthlyUsage = await db.select('daily_usage', {
      select: 'conversation_count',
      date: `gte.${monthStart}`,
    })

    const totalMonthly = monthlyUsage.reduce(
      (sum: number, row: any) => sum + (row.conversation_count || 0),
      0
    )

    if (totalMonthly >= MONTHLY_LIMIT) {
      return {
        allowed: false,
        error: 'Demo capacity reached this month (2000 conversations). Try next month!',
        remaining: 0,
      }
    }

    return {
      allowed: true,
      remaining: DAILY_LIMIT - conversationsToday,
    }
  } catch (error) {
    console.error('Error checking usage limits:', error)
    // Allow request on error to avoid blocking users
    return { allowed: true }
  }
}

export async function incrementUsage(
  env: Env,
  sessionId: string,
  userId?: string
): Promise<void> {
  const db = new SupabaseClient(env)
  const today = new Date().toISOString().split('T')[0]

  try {
    // Try to update existing record
    const existing = await db.select('daily_usage', {
      date: today,
      [userId ? 'user_id' : 'session_id']: userId || sessionId,
    })

    if (existing && existing.length > 0) {
      await db.update(
        'daily_usage',
        {
          conversation_count: existing[0].conversation_count + 1,
          message_count: existing[0].message_count + 1,
        },
        {
          id: existing[0].id,
        }
      )
    } else {
      // Insert new record
      await db.insert('daily_usage', {
        date: today,
        user_id: userId || null,
        session_id: sessionId,
        conversation_count: 1,
        message_count: 1,
      })
    }
  } catch (error) {
    console.error('Error incrementing usage:', error)
    // Don't throw - we don't want to block the user if tracking fails
  }
}
