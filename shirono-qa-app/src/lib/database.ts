import { User, Session } from '../types/auth'
import { getCosmosService } from './cosmos'
import { generateSessionToken } from './auth'
import { ErrorHandler } from './errors'

/**
 * ユーザー名でユーザーを取得
 */
export async function getUserByUsername(username: string): Promise<User | null> {
  try {
    const cosmosService = getCosmosService()

    const query = 'SELECT * FROM c WHERE c.username = @username'
    const parameters = [{ name: '@username', value: username }]

    const users = await cosmosService.queryItems<User>('users', query, parameters)

    return users.length > 0 ? users[0] : null
  } catch (error) {
    console.error('Failed to get user by username:', error)
    throw ErrorHandler.createInternalError('Failed to retrieve user')
  }
}

/**
 * ユーザーIDでユーザーを取得
 */
export async function getUserById(userId: string): Promise<User | null> {
  try {
    const cosmosService = getCosmosService()
    return await cosmosService.getItem<User>('users', userId)
  } catch (error) {
    console.error('Failed to get user by ID:', error)
    throw ErrorHandler.createInternalError('Failed to retrieve user')
  }
}

/**
 * ユーザーを作成
 */
export async function createUser(user: Omit<User, 'id' | 'createdAt' | 'lastLoginAt'>): Promise<User> {
  try {
    const cosmosService = getCosmosService()

    // ユーザー名の重複チェック
    const existingUser = await getUserByUsername(user.username)
    if (existingUser) {
      throw ErrorHandler.createValidationError('Username already exists')
    }

    const newUser: User = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...user,
      createdAt: new Date(),
      lastLoginAt: null
    }

    return await cosmosService.createItem<User>('users', newUser)
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error) {
      throw error
    }
    console.error('Failed to create user:', error)
    throw ErrorHandler.createInternalError('Failed to create user')
  }
}

/**
 * ユーザーの最終ログイン時刻を更新
 */
export async function updateUserLastLogin(userId: string): Promise<void> {
  try {
    const cosmosService = getCosmosService()

    const user = await getUserById(userId)
    if (!user) {
      throw ErrorHandler.createNotFoundError('User')
    }

    const updatedUser = {
      ...user,
      lastLoginAt: new Date()
    }

    await cosmosService.updateItem('users', userId, updatedUser)
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error) {
      throw error
    }
    console.error('Failed to update user last login:', error)
    throw ErrorHandler.createInternalError('Failed to update user login time')
  }
}

/**
 * セッションを作成
 */
export async function createSession(userId: string): Promise<Session> {
  try {
    const cosmosService = getCosmosService()

    const now = new Date()
    const expiresAt = new Date(now.getTime() + 6 * 60 * 60 * 1000) // 6時間

    const session: Session = {
      id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      sessionToken: generateSessionToken(),
      expiresAt,
      createdAt: now,
      lastAccessedAt: now
    }

    return await cosmosService.createItem<Session>('sessions', session)
  } catch (error) {
    console.error('Failed to create session:', error)
    throw ErrorHandler.createInternalError('Failed to create session')
  }
}

/**
 * セッショントークンでセッションを取得
 */
export async function getSessionByToken(sessionToken: string): Promise<Session | null> {
  try {
    const cosmosService = getCosmosService()

    const query = 'SELECT * FROM c WHERE c.sessionToken = @sessionToken AND c.expiresAt > @now'
    const parameters = [
      { name: '@sessionToken', value: sessionToken },
      { name: '@now', value: new Date().toISOString() }
    ]

    const sessions = await cosmosService.queryItems<Session>('sessions', query, parameters)

    return sessions.length > 0 ? sessions[0] : null
  } catch (error) {
    console.error('Failed to get session by token:', error)
    throw ErrorHandler.createInternalError('Failed to retrieve session')
  }
}

/**
 * セッションの最終アクセス時刻を更新
 */
export async function updateSessionAccess(sessionId: string, userId: string): Promise<void> {
  try {
    const cosmosService = getCosmosService()

    const session = await cosmosService.getItem<Session>('sessions', sessionId, userId)
    if (!session) {
      throw ErrorHandler.createNotFoundError('Session')
    }

    const updatedSession = {
      ...session,
      lastAccessedAt: new Date()
    }

    await cosmosService.updateItem('sessions', sessionId, updatedSession, userId)
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error) {
      throw error
    }
    console.error('Failed to update session access:', error)
    throw ErrorHandler.createInternalError('Failed to update session access time')
  }
}

/**
 * セッションを削除
 */
export async function deleteSession(sessionId: string, userId: string): Promise<void> {
  try {
    const cosmosService = getCosmosService()
    await cosmosService.deleteItem('sessions', sessionId, userId)
  } catch (error) {
    console.error('Failed to delete session:', error)
    throw ErrorHandler.createInternalError('Failed to delete session')
  }
}

/**
 * ユーザーの全セッションを削除
 */
export async function deleteUserSessions(userId: string): Promise<void> {
  try {
    const cosmosService = getCosmosService()

    const query = 'SELECT * FROM c WHERE c.userId = @userId'
    const parameters = [{ name: '@userId', value: userId }]

    const sessions = await cosmosService.queryItems<Session>('sessions', query, parameters)

    for (const session of sessions) {
      await cosmosService.deleteItem('sessions', session.id, session.userId)
    }
  } catch (error) {
    console.error('Failed to delete user sessions:', error)
    throw ErrorHandler.createInternalError('Failed to delete user sessions')
  }
}

/**
 * 期限切れセッションをクリーンアップ
 */
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const cosmosService = getCosmosService()

    const query = 'SELECT * FROM c WHERE c.expiresAt < @now'
    const parameters = [{ name: '@now', value: new Date().toISOString() }]

    const expiredSessions = await cosmosService.queryItems<Session>('sessions', query, parameters)

    for (const session of expiredSessions) {
      await cosmosService.deleteItem('sessions', session.id, session.userId)
    }

    return expiredSessions.length
  } catch (error) {
    console.error('Failed to cleanup expired sessions:', error)
    throw ErrorHandler.createInternalError('Failed to cleanup expired sessions')
  }
}