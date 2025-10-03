import type { ChatRequest, ChatResponse, ApiResponse, UserFact } from '../types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787'

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Request failed',
        }
      }

      return {
        success: true,
        data,
      }
    } catch (error) {
      console.error('API request error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  async chat(request: ChatRequest): Promise<ApiResponse<ChatResponse>> {
    return this.request<ChatResponse>('/api/chat', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  async getFacts(sessionId: string, userId?: string): Promise<ApiResponse<UserFact[]>> {
    const params = new URLSearchParams({ sessionId })
    if (userId) params.append('userId', userId)

    return this.request<UserFact[]>(`/api/facts?${params}`)
  }

  async sendMagicLink(email: string, sessionId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/api/auth/send-magic-link', {
      method: 'POST',
      body: JSON.stringify({ email, sessionId }),
    })
  }

  async verifyMagicLink(token: string): Promise<ApiResponse<{ userId: string; email: string }>> {
    return this.request<{ userId: string; email: string }>('/api/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
  }

  async customizeAvatar(
    sessionId: string,
    avatarConfig: object
  ): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/api/customize-avatar', {
      method: 'POST',
      body: JSON.stringify({ sessionId, avatarConfig }),
    })
  }
}

export const apiClient = new ApiClient(API_URL)
