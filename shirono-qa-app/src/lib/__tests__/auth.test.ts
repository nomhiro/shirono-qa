import { login, logout, validatePassword, hashPassword, verifyPassword, validateSession, refreshSession } from '../auth'
import { createUser } from '../database'
import { hash } from 'bcryptjs'
import { testDataStore, mockCosmosService } from './test-helpers'

// CosmosServiceをモック
jest.mock('../cosmos', () => ({
  getCosmosService: () => mockCosmosService
}))

describe('Authentication Library', () => {
  describe('password validation', () => {
    it('should reject password shorter than 8 characters', () => {
      const result = validatePassword('short')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password must be at least 8 characters long')
    })

    it('should reject password without numbers', () => {
      const result = validatePassword('NoNumbersHere!')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one number')
    })

    it('should reject password without letters', () => {
      const result = validatePassword('12345678!')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one letter')
    })

    it('should reject password without special characters', () => {
      const result = validatePassword('NoSpecialChars123')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one special character')
    })

    it('should accept valid password', () => {
      const result = validatePassword('ValidPass123!')
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('password hashing', () => {
    it('should hash password with bcrypt', async () => {
      const password = 'TestPassword123!'
      const hash = await hashPassword(password)
      
      expect(hash).toBeDefined()
      expect(hash).not.toBe(password)
      expect(hash.length).toBeGreaterThan(50)
    })

    it('should verify password against hash', async () => {
      const password = 'TestPassword123!'
      const hash = await hashPassword(password)
      
      const isValid = await verifyPassword(password, hash)
      expect(isValid).toBe(true)
    })

    it('should reject wrong password', async () => {
      const password = 'TestPassword123!'
      const wrongPassword = 'WrongPassword123!'
      const hash = await hashPassword(password)
      
      const isValid = await verifyPassword(wrongPassword, hash)
      expect(isValid).toBe(false)
    })
  })

  describe('login function with real database', () => {
    beforeEach(async () => {
      // テストデータをクリア
      testDataStore.clear()
      
      // テスト用ユーザーを作成
      const adminPasswordHash = await hash('AdminPass123!', 1) // 高速化のため saltRounds=1
      const userPasswordHash = await hash('UserPass123!', 1)
      
      await createUser({
        username: 'admin',
        email: 'admin@test.com',
        passwordHash: adminPasswordHash,
        groupId: 'group-ts-ai',
        isAdmin: true
      })
      
      await createUser({
        username: 'alice',
        email: 'alice@test.com',
        passwordHash: userPasswordHash,
        groupId: 'group-ts-ai',
        isAdmin: false
      })
    })

    it('should login with valid admin credentials from database', async () => {
      // これは失敗するテスト：まだ実際のDB統合が完了していない
      const result = await login('admin', 'AdminPass123!')
      
      expect(result.success).toBe(true)
      expect(result.user).toBeDefined()
      expect(result.user?.username).toBe('admin')
      expect(result.user?.isAdmin).toBe(true)
      expect(result.sessionToken).toBeDefined()
      expect(result.sessionToken).not.toBe('mock-session-token') // 実際のトークン
      expect(result.error).toBeUndefined()
    })

    it('should login with valid user credentials from database', async () => {
      // これは失敗するテスト：まだ実際のDB統合が完了していない
      const result = await login('alice', 'UserPass123!')
      
      expect(result.success).toBe(true)
      expect(result.user).toBeDefined()
      expect(result.user?.username).toBe('alice')
      expect(result.user?.isAdmin).toBe(false)
      expect(result.user?.groupId).toBe('group-ts-ai')
      expect(result.sessionToken).toBeDefined()
      expect(result.error).toBeUndefined()
    })

    it('should return error with nonexistent username', async () => {
      const result = await login('nonexistent', 'AnyPassword123!')
      
      expect(result.success).toBe(false)
      expect(result.user).toBeUndefined()
      expect(result.sessionToken).toBeUndefined()
      expect(result.error).toBe('ユーザー名またはパスワードが正しくありません')
    })

    it('should return error with wrong password', async () => {
      const result = await login('admin', 'WrongPassword123!')
      
      expect(result.success).toBe(false)
      expect(result.user).toBeUndefined()
      expect(result.sessionToken).toBeUndefined()
      expect(result.error).toBe('ユーザー名またはパスワードが正しくありません')
    })

    it('should return error with empty credentials', async () => {
      const result = await login('', '')
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('ユーザー名とパスワードは必須です')
    })
  })

  describe('logout function', () => {
    beforeEach(async () => {
      // テストデータをクリア
      testDataStore.clear()
    })

    it('should invalidate session token', async () => {
      // まずログインしてセッションを作成
      const adminPasswordHash = await hash('AdminPass123!', 1)
      await createUser({
        username: 'admin',
        email: 'admin@test.com',
        passwordHash: adminPasswordHash,
        groupId: 'group-ts-ai',
        isAdmin: true
      })
      
      const loginResult = await login('admin', 'AdminPass123!')
      expect(loginResult.success).toBe(true)
      
      // 作成されたセッショントークンでログアウト
      const result = await logout(loginResult.sessionToken!)
      
      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should handle invalid session token', async () => {
      const sessionToken = 'invalid-session-token'
      const result = await logout(sessionToken)
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('無効なセッションです') // 日本語メッセージに修正
    })
  })

  describe('session validation', () => {
    beforeEach(async () => {
      // テストデータをクリア
      testDataStore.clear()
    })

    it('should validate active session', async () => {
      // テスト用ユーザーを作成してログイン
      const adminPasswordHash = await hash('AdminPass123!', 1)
      await createUser({
        username: 'admin',
        email: 'admin@test.com',
        passwordHash: adminPasswordHash,
        groupId: 'group-ts-ai',
        isAdmin: true
      })
      
      const loginResult = await login('admin', 'AdminPass123!')
      expect(loginResult.success).toBe(true)
      
      // セッション検証
      const validation = await validateSession(loginResult.sessionToken!)
      
      expect(validation.valid).toBe(true)
      expect(validation.user).toBeDefined()
      expect(validation.user?.username).toBe('admin')
      expect(validation.session).toBeDefined()
    })

    it('should reject invalid session token', async () => {
      const validation = await validateSession('invalid-token')
      
      expect(validation.valid).toBe(false)
      expect(validation.user).toBeUndefined()
      expect(validation.session).toBeUndefined()
    })

    it('should reject empty session token', async () => {
      const validation = await validateSession('')
      
      expect(validation.valid).toBe(false)
      expect(validation.user).toBeUndefined()
      expect(validation.session).toBeUndefined()
    })

    it('should handle expired session', async () => {
      // この失敗するテストを作成：期限切れセッションの処理
      // まず通常のセッションを作成
      const adminPasswordHash = await hash('AdminPass123!', 1)
      await createUser({
        username: 'admin',
        email: 'admin@test.com',
        passwordHash: adminPasswordHash,
        groupId: 'group-ts-ai',
        isAdmin: true
      })
      
      const loginResult = await login('admin', 'AdminPass123!')
      expect(loginResult.success).toBe(true)
      
      // セッションを手動で期限切れにする（モックデータで）
      const sessionsContainer = testDataStore.getContainer('sessions')
      const sessions = Array.from(sessionsContainer.values())
      const session = sessions.find((s: any) => s.sessionToken === loginResult.sessionToken)
      if (session) {
        session.expiresAt = new Date(Date.now() - 1000) // 1秒前に期限切れ
        sessionsContainer.set(session.id, session)
      }
      
      // 期限切れセッションは無効として扱われるはず
      const validation = await validateSession(loginResult.sessionToken!)
      
      expect(validation.valid).toBe(false)
      expect(validation.user).toBeUndefined()
      expect(validation.session).toBeUndefined()
    })
  })

  describe('session refresh', () => {
    beforeEach(async () => {
      // テストデータをクリア
      testDataStore.clear()
    })

    it('should refresh valid session', async () => {
      // テスト用ユーザーを作成してログイン
      const adminPasswordHash = await hash('AdminPass123!', 1)
      await createUser({
        username: 'admin',
        email: 'admin@test.com',
        passwordHash: adminPasswordHash,
        groupId: 'group-ts-ai',
        isAdmin: true
      })
      
      const loginResult = await login('admin', 'AdminPass123!')
      expect(loginResult.success).toBe(true)
      
      const originalToken = loginResult.sessionToken!
      
      // セッション更新
      const refreshResult = await refreshSession(originalToken)
      
      expect(refreshResult.success).toBe(true)
      expect(refreshResult.sessionToken).toBeDefined()
      expect(refreshResult.sessionToken).not.toBe(originalToken) // 新しいトークン
      expect(refreshResult.error).toBeUndefined()
    })

    it('should reject invalid session for refresh', async () => {
      const refreshResult = await refreshSession('invalid-token')
      
      expect(refreshResult.success).toBe(false)
      expect(refreshResult.sessionToken).toBeUndefined()
      expect(refreshResult.error).toBe('無効なセッションです')
    })
  })
})