import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { 
  getUserByUsername,
  getUserById,
  createSession, 
  updateUserLastLogin,
  getSessionByToken,
  deleteSession,
  updateSessionAccess
} from './database'
import { 
  User, 
  Session,
  LoginResult, 
  LogoutResult, 
  PasswordValidationResult,
  // AuthErrorCodes,
  // AuthError
} from '../types/auth'
import { /* ErrorHandler, */ isAppError } from './errors'

const PASSWORD_MIN_LENGTH = 8
const BCRYPT_SALT_ROUNDS = 12

const PASSWORD_RULES = {
  minLength: PASSWORD_MIN_LENGTH,
  requireNumbers: /\d/,
  requireLetters: /[a-zA-Z]/,
  requireSpecialChars: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/
} as const

export function validatePassword(password: string): PasswordValidationResult {
  if (typeof password !== 'string') {
    return {
      valid: false,
      errors: ['Password must be a string']
    }
  }

  const errors: string[] = []

  if (password.length < PASSWORD_RULES.minLength) {
    errors.push(`Password must be at least ${PASSWORD_RULES.minLength} characters long`)
  }

  if (!PASSWORD_RULES.requireNumbers.test(password)) {
    errors.push('Password must contain at least one number')
  }

  if (!PASSWORD_RULES.requireLetters.test(password)) {
    errors.push('Password must contain at least one letter')
  }

  if (!PASSWORD_RULES.requireSpecialChars.test(password)) {
    errors.push('Password must contain at least one special character')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

export async function hashPassword(password: string): Promise<string> {
  if (typeof password !== 'string' || password.length === 0) {
    throw new Error('Password must be a non-empty string')
  }
  
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (typeof password !== 'string' || typeof hash !== 'string') {
    return false
  }
  
  try {
    return await bcrypt.compare(password, hash)
  } catch {
    return false
  }
}

/**
 * セキュアなセッショントークンを生成
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * ユーザーログイン
 */
export async function login(username: string, password: string): Promise<LoginResult> {
  try {
    // 入力値検証
    if (!username.trim() || !password.trim()) {
      return {
        success: false,
        error: 'ユーザー名とパスワードは必須です'
      }
    }

    // ユーザー取得
    const user = await getUserByUsername(username.trim())
    if (!user) {
      return {
        success: false,
        error: 'ユーザー名またはパスワードが正しくありません'
      }
    }

    // パスワード検証
    const isValidPassword = await verifyPassword(password, user.passwordHash)
    if (!isValidPassword) {
      return {
        success: false,
        error: 'ユーザー名またはパスワードが正しくありません'
      }
    }

    // セッション作成
    const session = await createSession(user.id)
    
    // 最終ログイン時刻更新
    await updateUserLastLogin(user.id)

    return {
      success: true,
      user: {
        ...user,
        lastLoginAt: new Date()
      },
      sessionToken: session.sessionToken
    }
  } catch (error) {
    console.error('Login failed:', error)
    return {
      success: false,
      error: 'ログインに失敗しました。しばらく時間をおいてから再度お試しください。'
    }
  }
}

/**
 * ユーザーログアウト
 */
export async function logout(sessionToken: string): Promise<LogoutResult> {
  try {
    // セッション取得
    const session = await getSessionByToken(sessionToken)
    if (!session) {
      return {
        success: false,
        error: '無効なセッションです'
      }
    }

    // セッション削除
    await deleteSession(session.id, session.userId)

    return {
      success: true
    }
  } catch (error) {
    console.error('Logout failed:', error)
    return {
      success: false,
      error: 'ログアウトに失敗しました'
    }
  }
}

/**
 * セッション検証
 */
export async function validateSession(sessionToken: string): Promise<{ valid: boolean; user?: User; session?: Session }> {
  try {
    if (!sessionToken) {
      return { valid: false }
    }

    // セッション取得
    const session = await getSessionByToken(sessionToken)
    if (!session) {
      return { valid: false }
    }

    // セッション有効期限チェック
    if (session.expiresAt < new Date()) {
      // 期限切れセッションを削除
      await deleteSession(session.id, session.userId)
      return { valid: false }
    }

    // ユーザー取得
    const user = await getUserById(session.userId)
    if (!user) {
      return { valid: false }
    }

    // セッションアクセス時刻更新
    await updateSessionAccess(session.id, session.userId)

    return { 
      valid: true, 
      user, 
      session: {
        ...session,
        lastAccessedAt: new Date()
      }
    }
  } catch (error) {
    console.error('Session validation failed:', error)
    // エラーの詳細をログ出力
    if (isAppError(error)) {
      console.error('AppError details:', error)
    }
    return { valid: false }
  }
}

/**
 * セッションを自動的に延長
 */
export async function refreshSession(sessionToken: string): Promise<{ success: boolean; sessionToken?: string; error?: string }> {
  try {
    const validation = await validateSession(sessionToken)
    if (!validation.valid || !validation.user || !validation.session) {
      return {
        success: false,
        error: '無効なセッションです'
      }
    }

    // 既存セッション削除
    await deleteSession(validation.session.id, validation.session.userId)

    // 新しいセッション作成
    const newSession = await createSession(validation.user.id)

    return {
      success: true,
      sessionToken: newSession.sessionToken
    }
  } catch (error) {
    console.error('Session refresh failed:', error)
    return {
      success: false,
      error: 'セッションの更新に失敗しました'
    }
  }
}