import { getCosmosService } from '@/lib/cosmos'
import { hashPassword } from '@/lib/auth'
import { User } from '@/types/auth'
import { Group } from '@/types/group'
import { v4 as uuidv4 } from 'uuid'

export interface SeedResult {
  success: boolean
  skipped?: boolean
  message?: string
  error?: string
  user?: User
  group?: Group
}

export interface FullSeedResult {
  success: boolean
  message?: string
  errors?: string[]
  adminResult: SeedResult
  groupResult: SeedResult
}

/**
 * 初期管理者アカウントを作成
 */
export async function createInitialAdmin(): Promise<SeedResult> {
  try {

    const cosmosService = getCosmosService()

    // 既存の管理者アカウントを確認
    const existingAdmins = await cosmosService.queryItems<User>(
      'users',
      'SELECT * FROM c WHERE c.isAdmin = true'
    )

    if (existingAdmins.length > 0) {
      return {
        success: true,
        skipped: true,
        message: 'Admin user already exists'
      }
    }

    // 同じユーザー名やメールアドレスの確認
    const existingUsers = await cosmosService.queryItems<User>(
      'users',
      'SELECT * FROM c WHERE c.username = @username OR c.email = @email',
      [
        { name: '@username', value: 'admin' },
        { name: '@email', value: 'nomhiro1204@gmail.com' }
      ]
    )

    if (existingUsers.length > 0) {
      return {
        success: true,
        skipped: true,
        message: 'User with admin credentials already exists'
      }
    }

    // パスワードをハッシュ化
    const hashedPassword = await hashPassword('AdminPass123!')

    // 初期管理者アカウントを作成
    const adminUser: User = {
      id: uuidv4(),
      username: 'admin',
      email: 'nomhiro1204@gmail.com',
      passwordHash: hashedPassword,
      groupId: 'group-admin', // 後でTS-AIグループに更新される
      isAdmin: true
    }

    await cosmosService.createItem('users', adminUser)

    return {
      success: true,
      message: 'Admin account created successfully',
      user: adminUser
    }

  } catch (error) {
    console.error('❌ Error creating initial admin account:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * 初期グループ「TS-AI」を作成
 */
export async function createInitialGroup(): Promise<SeedResult> {
  try {

    const cosmosService = getCosmosService()

    // 既存のTS-AIグループを確認
    const existingGroups = await cosmosService.queryItems<Group>(
      'groups',
      'SELECT * FROM c WHERE c.name = @name',
      [{ name: '@name', value: 'TS-AI' }]
    )

    if (existingGroups.length > 0) {
      return {
        success: true,
        skipped: true,
        message: 'Group TS-AI already exists'
      }
    }

    // TS-AIグループを作成
    const tsAiGroup: Group = {
      id: uuidv4(),
      name: 'TS-AI',
      description: '技術支援・AI関連グループ',
      createdAt: new Date()
    }

    await cosmosService.createItem('groups', tsAiGroup)

    // 管理者をTS-AIグループに追加
    const adminUsers = await cosmosService.queryItems<User>(
      'users',
      'SELECT * FROM c WHERE c.isAdmin = true'
    )

    if (adminUsers.length > 0) {
      const adminUser = adminUsers[0]
      const updatedAdmin: User = {
        ...adminUser,
        groupId: tsAiGroup.id
      }

      await cosmosService.replaceItem('users', updatedAdmin.id, updatedAdmin)
    }

    return {
      success: true,
      message: 'TS-AI group created successfully',
      group: tsAiGroup
    }

  } catch (error) {
    console.error('❌ Error creating initial group:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * すべての初期データを作成
 */
export async function seedInitialData(): Promise<FullSeedResult> {

  const errors: string[] = []

  try {
    // 1. 初期管理者アカウントを作成
    const adminResult = await createInitialAdmin()
    if (!adminResult.success) {
      errors.push(`Admin creation failed: ${adminResult.error}`)
    }

    // 2. 初期グループを作成（管理者が必要）
    let groupResult: SeedResult
    if (adminResult.success || adminResult.skipped) {
      groupResult = await createInitialGroup()
      if (!groupResult.success) {
        errors.push(`Group creation failed: ${groupResult.error}`)
      }
    } else {
      groupResult = {
        success: false,
        error: 'Cannot create group without admin user'
      }
      errors.push('Group creation skipped due to admin creation failure')
    }

    const overallSuccess = adminResult.success && groupResult.success

    if (overallSuccess) {
      if (adminResult.skipped && groupResult.skipped) {
        return {
          success: true,
          message: 'All initial data already exists',
          adminResult,
          groupResult
        }
      } else {
        return {
          success: true,
          message: 'Initial data seeding completed successfully',
          adminResult,
          groupResult
        }
      }
    } else {
      return {
        success: false,
        message: 'Initial data seeding completed with errors',
        errors,
        adminResult,
        groupResult
      }
    }

  } catch (error) {
    console.error('❌ Fatal error during initial data seeding:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    errors.push(`Fatal error: ${errorMessage}`)

    return {
      success: false,
      message: 'Fatal error during initial data seeding',
      errors,
      adminResult: { success: false, error: errorMessage },
      groupResult: { success: false, error: 'Not attempted due to fatal error' }
    }
  }
}

/**
 * 開発用の追加初期データを作成（オプション）
 */
export async function seedDevelopmentData(): Promise<SeedResult> {
  try {

    const cosmosService = getCosmosService()

    // テストユーザーを作成
    const testUsers = [
      {
        id: uuidv4(),
        username: 'testuser1',
        email: 'testuser1@example.com',
        passwordHash: await hashPassword('TestPass123!'),
        groupId: '', // TS-AIグループのIDを後で設定
        isAdmin: false
      },
      {
        id: uuidv4(),
        username: 'testuser2',
        email: 'testuser2@example.com',
        passwordHash: await hashPassword('TestPass123!'),
        groupId: '', // TS-AIグループのIDを後で設定
        isAdmin: false
      }
    ]

    // TS-AIグループを取得
    const tsAiGroups = await cosmosService.queryItems<Group>(
      'groups',
      'SELECT * FROM c WHERE c.name = @name',
      [{ name: '@name', value: 'TS-AI' }]
    )

    if (tsAiGroups.length > 0) {
      const tsAiGroupId = tsAiGroups[0].id

      // テストユーザーをTS-AIグループに割り当て
      for (const testUser of testUsers) {
        testUser.groupId = tsAiGroupId

        // 既存ユーザーをチェック
        const existingUsers = await cosmosService.queryItems<User>(
          'users',
          'SELECT * FROM c WHERE c.username = @username',
          [{ name: '@username', value: testUser.username }]
        )

        if (existingUsers.length === 0) {
          await cosmosService.createItem('users', testUser)
        } else {
          console.warn(`User ${testUser.username} already exists, skipping creation`)
        }
      }
    }

    return {
      success: true,
      message: 'Development test data created successfully'
    }

  } catch (error) {
    console.error('❌ Error creating development test data:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * 環境設定の検証
 */
export function validateEnvironment(): { valid: boolean; warnings: string[] } {
  const warnings: string[] = []

  // 必須環境変数のチェック
  if (!process.env.COSMOS_DB_CONNECTION_STRING) {
    warnings.push('COSMOS_DB_CONNECTION_STRING is not set')
  }

  if (!process.env.COSMOS_DB_DATABASE_NAME) {
    warnings.push('COSMOS_DB_DATABASE_NAME is not set')
  }

  // オプション環境変数のチェック（警告のみ）
  if (!process.env.SMTP_HOST) {
    warnings.push('SMTP_HOST is not set - email notifications will be disabled')
  }

  if (!process.env.SMTP_USER) {
    warnings.push('SMTP_USER is not set - email notifications will be disabled')
  }

  if (!process.env.SMTP_PASSWORD) {
    warnings.push('SMTP_PASSWORD is not set - email notifications will be disabled')
  }

  const valid = warnings.filter(w => !w.includes('SMTP')).length === 0

  return { valid, warnings }
}