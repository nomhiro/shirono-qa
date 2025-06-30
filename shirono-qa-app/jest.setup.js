import '@testing-library/jest-dom'

// Mock for Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    }
  },
}))

// Mock for Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Global test environment setup
global.fetch = jest.fn()

// Mock Next.js server-side APIs
// Note: Don't override Request for Next.js 13+ App Router compatibility

// Mock NextResponse and NextRequest for API route testing
jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((url, options = {}) => ({
    url,
    method: options.method || 'GET',
    headers: new Map(Object.entries(options.headers || {})),
    nextUrl: {
      searchParams: new URLSearchParams(url.split('?')[1] || '')
    },
    cookies: {
      get: jest.fn().mockReturnValue({ value: options.headers?.Cookie?.split('=')[1] || null })
    },
    json: jest.fn().mockImplementation(() => {
      try {
        return Promise.resolve(JSON.parse(options.body || '{}'))
      } catch (error) {
        return Promise.reject(new SyntaxError('Unexpected token in JSON'))
      }
    }),
    text: jest.fn().mockResolvedValue(options.body || '')
  })),
  NextResponse: {
    json: jest.fn((body, options = {}) => ({
      json: jest.fn().mockResolvedValue(body),
      status: options.status || 200,
      headers: new Map(Object.entries(options.headers || {}))
    }))
  }
}))

global.Response = class Response {
  constructor(body, options = {}) {
    this.body = body
    this.status = options.status || 200
    this.headers = new Map(Object.entries(options.headers || {}))
  }
  
  async json() {
    return JSON.parse(this.body)
  }
}

beforeEach(() => {
  jest.clearAllMocks()
})