import { 
  generatePasswordResetToken, 
  validatePasswordResetToken, 
  resetPassword,
  createPasswordResetRequest
} from '../password-reset'
import { testDataStore, mockCosmosService } from './test-helpers'
import { hashPassword } from '../auth'

// 必要なモックを設定
jest.mock('@/lib/cosmos', () => ({
  getCosmosService: () => mockCosmosService
}))

jest.mock('@/lib/auth', () => ({
  hashPassword: jest.fn().mockResolvedValue('new-hashed-password')
}))

const mockHashPassword = hashPassword as jest.MockedFunction<typeof hashPassword>

describe('Password Reset Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    testDataStore.clear()
  })

  describe('generatePasswordResetToken', () => {
    it('一意のパスワードリセットトークンを生成する', () => {
      const token1 = generatePasswordResetToken()
      const token2 = generatePasswordResetToken()

      expect(token1).toBeDefined()
      expect(token2).toBeDefined()
      expect(token1).not.toBe(token2)
      expect(token1).toHaveLength(32) // 16バイト = 32文字のhex
    })

    it('適切な形式のトークンを生成する', () => {
      const token = generatePasswordResetToken()
      
      // hexadecimal文字列かチェック
      expect(token).toMatch(/^[a-f0-9]{32}$/)
    })
  })

  describe('createPasswordResetRequest', () => {
    beforeEach(async () => {
      // テストユーザーを作成
      await testDataStore.createItem('users', {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'current-hash',
        groupId: 'group-1',
        isAdmin: false
      })
    })

    it('有効なメールアドレスでパスワードリセット要求を作成する', async () => {
      const result = await createPasswordResetRequest('test@example.com')

      expect(result.success).toBe(true)
      expect(result.token).toBeDefined()
      expect(result.token).toMatch(/^[a-f0-9]{32}$/)
      expect(result.expiresAt).toBeDefined()
      
      // 24時間後に期限切れになることを確認
      const expiryTime = new Date(result.expiresAt!)
      const expectedExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const timeDiff = Math.abs(expiryTime.getTime() - expectedExpiry.getTime())
      expect(timeDiff).toBeLessThan(1000) // 1秒以内の誤差
    })

    it('存在しないメールアドレスでもセキュリティのため成功を返す', async () => {
      const result = await createPasswordResetRequest('nonexistent@example.com')

      expect(result.success).toBe(true)
      expect(result.token).toBeUndefined() // 実際にはトークンは生成されない
      expect(result.message).toContain('If the email exists')
    })

    it('パスワードリセットトークンをデータベースに保存する', async () => {
      const result = await createPasswordResetRequest('test@example.com')

      expect(result.success).toBe(true)
      
      // password_reset_tokensコンテナにトークンが保存されることを確認
      const tokens = await testDataStore.queryItems('password_reset_tokens', 'SELECT * FROM c')
      expect(tokens).toHaveLength(1)
      expect(tokens[0].userId).toBe('user-123')
      expect(tokens[0].token).toBe(result.token)
    })

    it('既存のリセットトークンがある場合は無効化する', async () => {
      // 最初のリセット要求
      const firstResult = await createPasswordResetRequest('test@example.com')
      expect(firstResult.success).toBe(true)

      // 2回目のリセット要求
      const secondResult = await createPasswordResetRequest('test@example.com')
      expect(secondResult.success).toBe(true)

      // 古いトークンは無効化され、新しいトークンのみが有効
      const tokens = await testDataStore.queryItems('password_reset_tokens', 'SELECT * FROM c WHERE c.isValid = true')
      expect(tokens).toHaveLength(1)
      expect(tokens[0].token).toBe(secondResult.token)
    })

    it('データベースエラー時に適切にエラーを処理する', async () => {
      jest.spyOn(mockCosmosService, 'queryItems').mockRejectedValue(new Error('Database error'))

      const result = await createPasswordResetRequest('test@example.com')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Database error')
    })
  })

  describe('validatePasswordResetToken', () => {
    beforeEach(async () => {
      // テストユーザーを作成
      await testDataStore.createItem('users', {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'current-hash',
        groupId: 'group-1',
        isAdmin: false
      })

      // 有効なリセットトークンを作成
      await testDataStore.createItem('password_reset_tokens', {
        id: 'token-123',
        userId: 'user-123',
        token: 'valid-token-123',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1時間後
        isValid: true,
        createdAt: new Date()
      })
    })

    it('有効なトークンを正しく検証する', async () => {
      const result = await validatePasswordResetToken('valid-token-123')

      expect(result.valid).toBe(true)
      expect(result.userId).toBe('user-123')
      expect(result.error).toBeUndefined()
    })

    it('存在しないトークンを拒否する', async () => {
      const result = await validatePasswordResetToken('nonexistent-token')

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Invalid or expired token')
      expect(result.userId).toBeUndefined()
    })

    it('期限切れトークンを拒否する', async () => {
      // 期限切れトークンを作成
      await testDataStore.createItem('password_reset_tokens', {
        id: 'expired-token',
        userId: 'user-123',
        token: 'expired-token-123',
        expiresAt: new Date(Date.now() - 60 * 60 * 1000), // 1時間前
        isValid: true,
        createdAt: new Date()
      })

      const result = await validatePasswordResetToken('expired-token-123')

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Token has expired')
      expect(result.userId).toBeUndefined()
    })

    it('無効化されたトークンを拒否する', async () => {
      // 無効化されたトークンを作成
      await testDataStore.createItem('password_reset_tokens', {
        id: 'invalid-token',
        userId: 'user-123',
        token: 'invalid-token-123',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        isValid: false, // 無効化済み
        createdAt: new Date()
      })

      const result = await validatePasswordResetToken('invalid-token-123')

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Invalid or expired token')
    })

    it('データベースエラー時に適切にエラーを処理する', async () => {
      jest.spyOn(mockCosmosService, 'queryItems').mockRejectedValue(new Error('Database error'))

      const result = await validatePasswordResetToken('valid-token-123')

      expect(result.valid).toBe(false)
      expect(result.error).toContain('Database error')
    })
  })

  describe('resetPassword', () => {
    beforeEach(async () => {
      // テストユーザーを作成
      await testDataStore.createItem('users', {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'old-hash',
        groupId: 'group-1',
        isAdmin: false
      })

      // 有効なリセットトークンを作成
      await testDataStore.createItem('password_reset_tokens', {
        id: 'token-123',
        userId: 'user-123',
        token: 'valid-token-123',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        isValid: true,
        createdAt: new Date()
      })
    })

    it('有効なトークンでパスワードを正常にリセットする', async () => {
      const result = await resetPassword('valid-token-123', 'NewPassword123!')

      expect(result.success).toBe(true)
      expect(result.message).toContain('successfully reset')
      expect(mockHashPassword).toHaveBeenCalledWith('NewPassword123!')

      // ユーザーのパスワードハッシュが更新されることを確認
      const updatedUser = await testDataStore.getItem('users', 'user-123')
      expect(updatedUser.passwordHash).toBe('new-hashed-password')

      // トークンが無効化されることを確認
      const usedToken = await testDataStore.getItem('password_reset_tokens', 'token-123')
      expect(usedToken.isValid).toBe(false)
    })

    it('パスワードの複雑性要件を検証する', async () => {
      const weakPasswords = [
        'weak',           // 短すぎる
        'password',       // 数字なし
        '12345678',       // 文字なし
        'Password123',    // 記号なし
        'password123!'    // 大文字なし
      ]

      for (const weakPassword of weakPasswords) {
        const result = await resetPassword('valid-token-123', weakPassword)
        expect(result.success).toBe(false)
        expect(result.error).toContain('Password does not meet requirements')
      }
    })

    it('無効なトークンでパスワードリセットを拒否する', async () => {
      const result = await resetPassword('invalid-token', 'NewPassword123!')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid or expired token')
      expect(mockHashPassword).not.toHaveBeenCalled()
    })

    it('期限切れトークンでパスワードリセットを拒否する', async () => {
      // 期限切れトークンを作成
      await testDataStore.createItem('password_reset_tokens', {
        id: 'expired-token',
        userId: 'user-123',
        token: 'expired-token-123',
        expiresAt: new Date(Date.now() - 60 * 60 * 1000),
        isValid: true,
        createdAt: new Date()
      })

      const result = await resetPassword('expired-token-123', 'NewPassword123!')

      expect(result.success).toBe(false)
      expect(result.error).toContain('expired')
      expect(mockHashPassword).not.toHaveBeenCalled()
    })

    it('データベースエラー時に適切にエラーを処理する', async () => {
      jest.spyOn(mockCosmosService, 'replaceItem').mockRejectedValue(new Error('Database error'))

      const result = await resetPassword('valid-token-123', 'NewPassword123!')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Database error')
    })

    it('同じトークンを複数回使用できないことを確認する', async () => {
      // 最初のリセット
      const firstResult = await resetPassword('valid-token-123', 'NewPassword123!')
      expect(firstResult.success).toBe(true)

      // 同じトークンで2回目のリセット試行
      const secondResult = await resetPassword('valid-token-123', 'AnotherPassword123!')
      expect(secondResult.success).toBe(false)
      expect(secondResult.error).toContain('Invalid or expired token')
    })
  })

  describe('セキュリティ要件', () => {
    it('トークンが推測困難であることを確認する', () => {
      const tokens = new Set()
      
      // 1000個のトークンを生成して重複がないことを確認
      for (let i = 0; i < 1000; i++) {
        const token = generatePasswordResetToken()
        expect(tokens.has(token)).toBe(false)
        tokens.add(token)
      }
    })

    it('パスワード複雑性要件を正しく実装する', async () => {
      const validPasswords = [
        'Password123!',
        'ComplexP@ss1',
        'MyStr0ng#Password'
      ]

      // セットアップ: 有効なトークンを作成
      await testDataStore.createItem('users', {
        id: 'user-456',
        username: 'testuser2',
        email: 'test2@example.com',
        passwordHash: 'old-hash',
        groupId: 'group-1',
        isAdmin: false
      })

      for (const password of validPasswords) {
        const tokenId = `token-${Math.random()}`
        const token = `valid-token-${Math.random()}`
        
        await testDataStore.createItem('password_reset_tokens', {
          id: tokenId,
          userId: 'user-456',
          token: token,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          isValid: true,
          createdAt: new Date()
        })

        const result = await resetPassword(token, password)
        expect(result.success).toBe(true, `Password "${password}" should be valid`)
      }
    })
  })
})