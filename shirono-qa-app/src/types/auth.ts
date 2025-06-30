export interface User {
  id: string
  username: string
  email: string
  groupId: string
  isAdmin: boolean
  createdAt: Date
  lastLoginAt: Date | null
}

export interface Session {
  id: string
  userId: string
  sessionToken: string
  expiresAt: Date
  createdAt: Date
  lastAccessedAt: Date
}

export interface Group {
  id: string
  name: string
  description: string
  createdAt: Date
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResult {
  success: boolean
  user?: User
  sessionToken?: string
  error?: string
}

export interface LogoutResult {
  success: boolean
  error?: string
}

export interface PasswordValidationResult {
  valid: boolean
  errors: string[]
}

export enum AuthErrorCodes {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  MISSING_CREDENTIALS = 'MISSING_CREDENTIALS',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  INVALID_SESSION = 'INVALID_SESSION',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  WEAK_PASSWORD = 'WEAK_PASSWORD'
}

export interface AuthError {
  code: AuthErrorCodes
  message: string
  details?: Record<string, unknown>
}