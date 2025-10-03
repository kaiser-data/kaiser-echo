/**
 * Simple router for Cloudflare Workers
 */

import type { Env } from './index'

type Handler = (
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  params?: Record<string, string>
) => Promise<Response> | Response

interface Route {
  method: string
  pattern: RegExp
  handler: Handler
  keys: string[]
}

export class Router {
  private routes: Route[] = []

  private addRoute(method: string, path: string, handler: Handler) {
    const keys: string[] = []
    const pattern = new RegExp(
      '^' +
        path
          .replace(/\//g, '\\/')
          .replace(/:\w+/g, (match) => {
            keys.push(match.slice(1))
            return '([^/]+)'
          })
          .replace(/\*/g, '.*') +
        '$'
    )

    this.routes.push({ method, pattern, keys, handler })
  }

  get(path: string, handler: Handler) {
    this.addRoute('GET', path, handler)
  }

  post(path: string, handler: Handler) {
    this.addRoute('POST', path, handler)
  }

  put(path: string, handler: Handler) {
    this.addRoute('PUT', path, handler)
  }

  delete(path: string, handler: Handler) {
    this.addRoute('DELETE', path, handler)
  }

  options(path: string, handler: Handler) {
    this.addRoute('OPTIONS', path, handler)
  }

  async handle(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)
    const method = request.method

    for (const route of this.routes) {
      if (route.method !== method && route.method !== '*') continue

      const match = url.pathname.match(route.pattern)
      if (match) {
        const params: Record<string, string> = {}
        route.keys.forEach((key, index) => {
          params[key] = match[index + 1]
        })

        return await route.handler(request, env, ctx, params)
      }
    }

    return new Response('Not Found', { status: 404 })
  }
}
