import { NextRequest } from 'next/server'

interface RateLimitEntry {
  count: number
  resetTime: number
}

class InMemoryRateLimit {
  private store = new Map<string, RateLimitEntry>()

  async isRateLimited(key: string, limit: number, windowMs: number): Promise<boolean> {
    const now = Date.now()
    const entry = this.store.get(key)

    if (!entry || now > entry.resetTime) {
      // First request or window expired
      this.store.set(key, {
        count: 1,
        resetTime: now + windowMs
      })
      return false
    }

    if (entry.count >= limit) {
      return true
    }

    entry.count++
    return false
  }

  cleanup() {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key)
      }
    }
  }
}

const rateLimiter = new InMemoryRateLimit()

// Cleanup expired entries every 10 minutes
setInterval(() => rateLimiter.cleanup(), 10 * 60 * 1000)

export interface RateLimitConfig {
  requests: number
  windowMs: number
}

export const RATE_LIMITS = {
  API_DEFAULT: { requests: 100, windowMs: 15 * 60 * 1000 }, // 100 requests per 15 minutes
  AUTH_LOGIN: { requests: 5, windowMs: 15 * 60 * 1000 },    // 5 login attempts per 15 minutes
  FILE_UPLOAD: { requests: 10, windowMs: 60 * 1000 },       // 10 uploads per minute
  SEARCH: { requests: 20, windowMs: 60 * 1000 },            // 20 searches per minute
} as const

export async function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  identifier?: string
): Promise<boolean> {
  // Use provided identifier or fall back to IP
  const key = identifier || getClientIdentifier(request)
  
  return await rateLimiter.isRateLimited(
    `${key}:${config.requests}:${config.windowMs}`,
    config.requests,
    config.windowMs
  )
}

function getClientIdentifier(request: NextRequest): string {
  // Try to get real IP from headers (Static Web Apps forwarded headers)
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const clientIp = request.headers.get('x-client-ip')
  
  const ip = forwardedFor?.split(',')[0]?.trim() ||
            realIp ||
            clientIp ||
            'unknown'
  
  return ip
}

export class RateLimitError extends Error {
  constructor(message: string = 'Rate limit exceeded') {
    super(message)
    this.name = 'RateLimitError'
  }
}