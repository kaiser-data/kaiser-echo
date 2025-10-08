/**
 * Kaiser Echo API - Cloudflare Worker
 *
 * Main backend API for the voice agent application.
 * Handles chat, authentication, and memory management.
 */

import { Router } from './router'
import { handleChat } from './handlers/chat'
import { handleGetFacts } from './handlers/facts'
import { handleSendMagicLink, handleVerifyMagicLink } from './handlers/auth'
import { handleCustomizeAvatar } from './handlers/avatar'
import { handleGenerateVariations } from './routes/generate'
import { corsHeaders, handleCors } from './utils/cors'

export interface Env {
  GROQ_API_KEY: string
  GOOGLE_TTS_API_KEY: string
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
  FAL_API_KEY?: string
  REPLICATE_API_KEY?: string
  ENVIRONMENT: string
}

const router = new Router()

// CORS preflight
router.options('*', handleCors)

// API routes
router.post('/api/chat', handleChat)
router.get('/api/facts', handleGetFacts)
router.post('/api/auth/send-magic-link', handleSendMagicLink)
router.post('/api/auth/verify', handleVerifyMagicLink)
router.post('/api/customize-avatar', handleCustomizeAvatar)
router.post('/api/generate-variations', handleGenerateVariations)

// Health check
router.get('/api/health', () => {
  return new Response(
    JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
})

// Main worker handler
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      return await router.handle(request, env, ctx)
    } catch (error) {
      console.error('Worker error:', error)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Internal server error',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }
  },
}
