/**
 * Supabase client utilities
 */

import type { Env } from '../index'

export class SupabaseClient {
  private url: string
  private key: string

  constructor(env: Env) {
    this.url = env.SUPABASE_URL
    this.key = env.SUPABASE_SERVICE_KEY
  }

  private async request(path: string, options: RequestInit = {}) {
    const response = await fetch(`${this.url}/rest/v1${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        apikey: this.key,
        Authorization: `Bearer ${this.key}`,
        Prefer: 'return=representation',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Supabase request failed: ${error}`)
    }

    const text = await response.text()
    return text ? JSON.parse(text) : null
  }

  async select(table: string, query: Record<string, any> = {}) {
    const params = new URLSearchParams()
    Object.entries(query).forEach(([key, value]) => {
      if (key === 'select') {
        params.append('select', value)
      } else if (key === 'order') {
        params.append('order', value)
      } else if (key === 'limit') {
        params.append('limit', value.toString())
      } else {
        // Check if value already has an operator (gte., lt., etc.)
        const hasOperator = typeof value === 'string' && /^(eq|gte|gt|lte|lt|neq|like|ilike|is|in|cs|cd|sl|sr|nxl|nxr|adj|ov|fts|plfts|phfts|wfts)\./.test(value)
        params.append(key, hasOperator ? value : `eq.${value}`)
      }
    })

    return this.request(`/${table}?${params.toString()}`)
  }

  async insert(table: string, data: any) {
    return this.request(`/${table}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async update(table: string, data: any, query: Record<string, any>) {
    const params = new URLSearchParams()
    Object.entries(query).forEach(([key, value]) => {
      params.append(key, `eq.${value}`)
    })

    return this.request(`/${table}?${params.toString()}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async upsert(table: string, data: any) {
    return this.request(`/${table}`, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        Prefer: 'resolution=merge-duplicates',
      },
    })
  }

  async delete(table: string, query: Record<string, any>) {
    const params = new URLSearchParams()
    Object.entries(query).forEach(([key, value]) => {
      params.append(key, `eq.${value}`)
    })

    return this.request(`/${table}?${params.toString()}`, {
      method: 'DELETE',
    })
  }

  async rpc(functionName: string, params: Record<string, any> = {}) {
    return this.request(`/rpc/${functionName}`, {
      method: 'POST',
      body: JSON.stringify(params),
    })
  }
}
