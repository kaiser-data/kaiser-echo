/**
 * Authentication handlers with magic links
 */

import type { Env } from '../index'
import { jsonResponse } from '../utils/cors'
import { SupabaseClient } from '../utils/supabase'

export async function handleSendMagicLink(request: Request, env: Env): Promise<Response> {
  try {
    const body: { email: string; sessionId: string } = await request.json()
    const { email, sessionId } = body

    if (!email || !sessionId) {
      return jsonResponse(
        {
          success: false,
          error: 'Missing required fields: email, sessionId',
        },
        400
      )
    }

    const db = new SupabaseClient(env)

    // Generate token
    const token = generateToken()
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes

    // Store token
    await db.insert('magic_tokens', {
      token,
      email,
      session_id: sessionId,
      expires_at: expiresAt.toISOString(),
      used: false,
    })

    // Send email (in production, use a proper email service)
    // For demo, we'll just log it
    const magicLink = `${new URL(request.url).origin}/verify?token=${token}`
    console.log(`Magic link for ${email}: ${magicLink}`)

    // TODO: Integrate with email service (SendGrid, Resend, etc.)
    // await sendEmail(email, magicLink)

    return jsonResponse({
      success: true,
      message: 'Magic link sent! Check your email.',
      // For demo purposes, include the link (REMOVE IN PRODUCTION)
      magicLink: env.ENVIRONMENT === 'development' ? magicLink : undefined,
    })
  } catch (error) {
    console.error('Send magic link error:', error)
    return jsonResponse(
      {
        success: false,
        error: 'Failed to send magic link',
      },
      500
    )
  }
}

export async function handleVerifyMagicLink(request: Request, env: Env): Promise<Response> {
  try {
    const body: { token: string } = await request.json()
    const { token } = body

    if (!token) {
      return jsonResponse(
        {
          success: false,
          error: 'Missing token',
        },
        400
      )
    }

    const db = new SupabaseClient(env)

    // Get token
    const tokens = await db.select('magic_tokens', { token })

    if (!tokens || tokens.length === 0) {
      return jsonResponse(
        {
          success: false,
          error: 'Invalid token',
        },
        400
      )
    }

    const tokenData = tokens[0]

    // Check if token is expired or used
    if (tokenData.used) {
      return jsonResponse(
        {
          success: false,
          error: 'Token already used',
        },
        400
      )
    }

    if (new Date(tokenData.expires_at) < new Date()) {
      return jsonResponse(
        {
          success: false,
          error: 'Token expired',
        },
        400
      )
    }

    // Mark token as used
    await db.update('magic_tokens', { used: true }, { token })

    // Get or create user
    let users = await db.select('users', { email: tokenData.email })
    let userId: string

    if (users && users.length > 0) {
      userId = users[0].user_id
    } else {
      const newUser = await db.insert('users', { email: tokenData.email })
      userId = newUser[0].user_id
    }

    // Update session with user_id
    await db.update('sessions', { user_id: userId }, { session_id: tokenData.session_id })

    // Update all messages and facts with user_id
    await db.update(
      'messages',
      { user_id: userId },
      { session_id: tokenData.session_id }
    )

    await db.update(
      'user_facts',
      { user_id: userId },
      { session_id: tokenData.session_id }
    )

    return jsonResponse({
      success: true,
      userId,
      email: tokenData.email,
    })
  } catch (error) {
    console.error('Verify magic link error:', error)
    return jsonResponse(
      {
        success: false,
        error: 'Failed to verify token',
      },
      500
    )
  }
}

function generateToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
}
