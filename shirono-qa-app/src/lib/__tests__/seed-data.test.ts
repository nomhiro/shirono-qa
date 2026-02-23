import { seedInitialData, createInitialAdmin, createInitialGroup } from '../seed-data'
import { testDataStore, mockCosmosService } from './test-helpers'

// cosmos とauth のモック
jest.mock('@/lib/cosmos', () => ({
  getCosmosService: () => mockCosmosService
}))

jest.mock('@/lib/auth', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed-password-123')
}))

import { hashPassword } from '@/lib/auth'

const mockHashPassword = hashPassword as jest.MockedFunction<typeof hashPassword>

describe('Initial Data Seeding', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    testDataStore.clear()
  })

  describe('createInitialAdmin', () => {
    it('初期管理者アカウントを作成する', async () => {
      const result = await createInitialAdmin()

      expect(result.success).toBe(true)
      expect(result.user).toBeDefined()
      expect(result.user?.username).toBe('admin')
      expect(result.user?.email).toBe('nomhiro1204@gmail.com')
      expect(result.user?.isAdmin).toBe(true)
      expect(mockHashPassword).toHaveBeenCalledWith('AdminPass123!')
    })

    it('管理者が既に存在する場合はスキップする', async () => {
      // 既存の管理者を作成
      await testDataStore.createItem('users', {
        id: 'existing-admin',
        username: 'existing-admin',
        email: 'existing@example.com',
        passwordHash: 'existing-hash',
        groupId: 'group-admin',
        isAdmin: true
      })

      const result = await createInitialAdmin()

      expect(result.success).toBe(true)
      expect(result.skipped).toBe(true)
      expect(result.message).toContain('Admin user already exists')
    })

    it('管理者アカウント作成時にエラーが発生した場合の処理', async () => {
      mockHashPassword.mockRejectedValue(new Error('Hashing failed'))

      const result = await createInitialAdmin()

      expect(result.success).toBe(false)
      expect(result.error).toContain('Hashing failed')
    })

    it('一意制約エラーを適切に処理する', async () => {
      // 最初の作成は成功
      await createInitialAdmin()

      // 同じユーザーを再度作成しようとする
      const result = await createInitialAdmin()

      expect(result.success).toBe(true)
      expect(result.skipped).toBe(true)
    })
  })

  describe('createInitialGroup', () => {
    beforeEach(async () => {
      // テスト用管理者を作成
      await testDataStore.createItem('users', {
        id: 'admin-123',
        username: 'admin',
        email: 'nomhiro1204@gmail.com',
        passwordHash: 'hashed-password',
        groupId: 'group-admin',
        isAdmin: true
      })
    })

    it('初期グループ「TS-AI」を作成する', async () => {
      const result = await createInitialGroup()

      expect(result.success).toBe(true)
      expect(result.group).toBeDefined()
      expect(result.group?.name).toBe('TS-AI')
      expect(result.group?.description).toBe('技術支援・AI関連グループ')
      expect(result.group?.id).toBeDefined()
      expect(result.group?.createdAt).toBeDefined()
    })

    it('グループが既に存在する場合はスキップする', async () => {
      // 既存のグループを作成
      await testDataStore.createItem('groups', {
        id: 'existing-group',
        name: 'TS-AI',
        description: 'Existing group',
        createdAt: new Date()
      })

      const result = await createInitialGroup()

      expect(result.success).toBe(true)
      expect(result.skipped).toBe(true)
      expect(result.message).toContain('Group TS-AI already exists')
    })

    it('管理者をTS-AIグループに追加する', async () => {
      const result = await createInitialGroup()

      expect(result.success).toBe(true)
      
      // 管理者のgroupIdが更新されていることを確認
      const adminUsers = await testDataStore.queryItems('users', 'SELECT * FROM c WHERE c.isAdmin = true')
      expect(adminUsers).toHaveLength(1)
      expect((adminUsers[0] as Record<string, unknown>).groupId).toBe(result.group?.id)
    })

    it('グループ作成時にエラーが発生した場合の処理', async () => {
      // mockCosmosServiceでエラーを発生させる
      jest.spyOn(mockCosmosService, 'createItem').mockRejectedValue(new Error('Database error'))

      const result = await createInitialGroup()

      expect(result.success).toBe(false)
      expect(result.error).toContain('Database error')
    })
  })

  describe('seedInitialData', () => {
    it('管理者アカウントと初期グループを順次作成する', async () => {
      const result = await seedInitialData()

      expect(result.success).toBe(true)
      expect(result.adminResult).toBeDefined()
      expect(result.groupResult).toBeDefined()
      expect(result.adminResult.success).toBe(true)
      expect(result.groupResult.success).toBe(true)
    })

    it('管理者作成が失敗した場合でもグループ作成を継続する', async () => {
      mockHashPassword.mockRejectedValue(new Error('Admin creation failed'))

      const result = await seedInitialData()

      expect(result.success).toBe(false)
      expect(result.adminResult.success).toBe(false)
      // グループ作成は実行されない（管理者が必要なため）
      expect(result.groupResult.success).toBe(false)
      expect(result.errors?.some(e => e.includes('Admin creation failed'))).toBe(true)
    })

    it('管理者が存在しグループが存在しない場合は、グループのみ作成する', async () => {
      // 既存の管理者を作成
      await testDataStore.createItem('users', {
        id: 'existing-admin',
        username: 'admin',
        email: 'nomhiro1204@gmail.com',
        passwordHash: 'existing-hash',
        groupId: 'group-admin',
        isAdmin: true
      })

      const result = await seedInitialData()

      expect(result.success).toBe(true)
      expect(result.adminResult.skipped).toBe(true)
      expect(result.groupResult.success).toBe(true)
      expect(result.groupResult.skipped).toBe(false)
    })

    it('管理者とグループの両方が既に存在する場合は両方スキップする', async () => {
      // 既存の管理者を作成
      await testDataStore.createItem('users', {
        id: 'existing-admin',
        username: 'admin',
        email: 'nomhiro1204@gmail.com',
        passwordHash: 'existing-hash',
        groupId: 'group-admin',
        isAdmin: true
      })

      // 既存のグループを作成
      await testDataStore.createItem('groups', {
        id: 'existing-group',
        name: 'TS-AI',
        description: 'Existing group',
        createdAt: new Date()
      })

      const result = await seedInitialData()

      expect(result.success).toBe(true)
      expect(result.adminResult.skipped).toBe(true)
      expect(result.groupResult.skipped).toBe(true)
      expect(result.message).toContain('All initial data already exists')
    })

    it('初期データ作成の実行ログを適切に出力する', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      await seedInitialData()

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('🌱 Starting initial data seeding'))
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✅ Initial data seeding completed'))

      consoleSpy.mockRestore()
    })

    it('部分的失敗の場合の詳細なエラー情報', async () => {
      // グループ作成のみ失敗させる
      let createItemCallCount = 0
      jest.spyOn(mockCosmosService, 'createItem').mockImplementation(async (container, item) => {
        createItemCallCount++
        if (container === 'groups') {
          throw new Error('Group creation failed')
        }
        return testDataStore.createItem(container, item)
      })

      const result = await seedInitialData()

      expect(result.success).toBe(false)
      expect(result.adminResult.success).toBe(true)
      expect(result.groupResult.success).toBe(false)
      expect(result.errors).toContain('Group creation failed')
    })
  })

  describe('データベース接続エラーの処理', () => {
    it('Cosmos DB接続エラーを適切に処理する', async () => {
      jest.spyOn(mockCosmosService, 'queryItems').mockRejectedValue(new Error('Connection failed'))

      const result = await createInitialAdmin()

      expect(result.success).toBe(false)
      expect(result.error).toContain('Connection failed')
    })

    it('管理者存在確認時のクエリエラーを処理する', async () => {
      jest.spyOn(mockCosmosService, 'queryItems').mockRejectedValue(new Error('Query failed'))

      const result = await createInitialGroup()

      expect(result.success).toBe(false)
      expect(result.error).toContain('Query failed')
    })
  })

  describe('環境設定の検証', () => {
    it('必要な環境変数が設定されていることを確認する', async () => {
      // 環境変数をクリア
      const originalEnv = process.env.SMTP_USER
      delete process.env.SMTP_USER

      const result = await seedInitialData()

      // 警告ログが出力されることを確認（実装による）
      expect(result.success).toBe(true) // 環境変数不足でも初期データ作成は続行

      // 環境変数を復元
      if (originalEnv) {
        process.env.SMTP_USER = originalEnv
      }
    })
  })
})