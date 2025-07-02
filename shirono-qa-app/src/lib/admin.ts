import crypto from 'crypto'
import { getCosmosService } from './cosmos'
import { hashPassword, validatePassword } from './auth'
import { User, Group } from '@/types/auth'

export interface UserCreateData {
  username: string
  email: string
  password: string
  groupId: string
  isAdmin: boolean
}

export interface UserUpdateData {
  username?: string
  email?: string
  groupId?: string
  isAdmin?: boolean
}

export interface GroupCreateData {
  name: string
  description: string
}

export interface GroupUpdateData {
  name?: string
  description?: string
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export interface GetUsersQuery {
  groupId?: string
  search?: string
  isAdmin?: boolean
}

/**
 * 全ユーザーを取得
 */
export async function getUsers(query?: GetUsersQuery): Promise<{
  success: boolean
  users?: User[]
  error?: string
}> {
  try {
    const cosmosService = getCosmosService()

    let cosmosQuery = 'SELECT * FROM c'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parameters: { name: string; value: any }[] = []
    const conditions: string[] = []

    if (query?.groupId) {
      conditions.push('c.groupId = @groupId')
      parameters.push({ name: '@groupId', value: query.groupId })
    }

    if (query?.isAdmin !== undefined) {
      conditions.push('c.isAdmin = @isAdmin')
      parameters.push({ name: '@isAdmin', value: query.isAdmin })
    }

    if (query?.search) {
      conditions.push('CONTAINS(UPPER(c.username), UPPER(@search))')
      parameters.push({ name: '@search', value: query.search })
    }

    if (conditions.length > 0) {
      cosmosQuery += ' WHERE ' + conditions.join(' AND ')
    }

    cosmosQuery += ' ORDER BY c.createdAt DESC'

    const users = await cosmosService.queryItems<User>('users', cosmosQuery, parameters)

    return {
      success: true,
      users
    }
  } catch (error) {
    console.error('Error getting users:', error)
    return {
      success: false,
      error: 'Failed to retrieve users'
    }
  }
}

/**
 * 新しいユーザーを作成
 */
export async function createUser(userData: UserCreateData): Promise<{
  success: boolean
  user?: User
  error?: string
}> {
  try {
    // データ検証
    const validation = validateUserData(userData)
    if (!validation.valid) {
      return {
        success: false,
        error: validation.errors.join(', ')
      }
    }

    const cosmosService = getCosmosService()

    // ユーザー名の重複チェック
    const existingUserByUsername = await cosmosService.queryItems<User>(
      'users',
      'SELECT * FROM c WHERE c.username = @username',
      [{ name: '@username', value: userData.username }]
    )

    if (existingUserByUsername.length > 0) {
      return {
        success: false,
        error: 'Username already exists'
      }
    }

    // メールアドレスの重複チェック
    const existingUserByEmail = await cosmosService.queryItems<User>(
      'users',
      'SELECT * FROM c WHERE c.email = @email',
      [{ name: '@email', value: userData.email }]
    )

    if (existingUserByEmail.length > 0) {
      return {
        success: false,
        error: 'Email already exists'
      }
    }

    // パスワードハッシュ化
    const passwordHash = await hashPassword(userData.password)

    // ユーザー作成
    const newUser: User = {
      id: crypto.randomUUID(),
      username: userData.username,
      email: userData.email,
      passwordHash,
      groupId: userData.groupId,
      isAdmin: userData.isAdmin,
      createdAt: new Date(),
      lastLoginAt: new Date()
    }

    const createdUser = await cosmosService.createItem<User>('users', newUser)

    return {
      success: true,
      user: createdUser
    }
  } catch (error) {
    console.error('Error creating user:', error)
    return {
      success: false,
      error: 'Failed to create user'
    }
  }
}

/**
 * ユーザーを更新
 */
export async function updateUser(userId: string, updateData: UserUpdateData): Promise<{
  success: boolean
  user?: User
  error?: string
}> {
  try {
    const cosmosService = getCosmosService()

    // 既存ユーザー取得
    const existingUser = await cosmosService.getItem<User>('users', userId)
    if (!existingUser) {
      return {
        success: false,
        error: 'User not found'
      }
    }

    // 更新データ検証
    const dataToValidate = {
      username: updateData.username || existingUser.username,
      email: updateData.email || existingUser.email,
      password: 'dummy', // パスワードは更新時検証しない
      groupId: updateData.groupId || existingUser.groupId,
      isAdmin: updateData.isAdmin !== undefined ? updateData.isAdmin : existingUser.isAdmin
    }

    const validation = validateUserData(dataToValidate, true) // 更新モード
    if (!validation.valid) {
      return {
        success: false,
        error: validation.errors.join(', ')
      }
    }

    // ユーザー名重複チェック（自分以外）
    if (updateData.username && updateData.username !== existingUser.username) {
      const existingUserByUsername = await cosmosService.queryItems<User>(
        'users',
        'SELECT * FROM c WHERE c.username = @username AND c.id != @userId',
        [
          { name: '@username', value: updateData.username },
          { name: '@userId', value: userId }
        ]
      )

      if (existingUserByUsername.length > 0) {
        return {
          success: false,
          error: 'Username already exists'
        }
      }
    }

    // メール重複チェック（自分以外）
    if (updateData.email && updateData.email !== existingUser.email) {
      const existingUserByEmail = await cosmosService.queryItems<User>(
        'users',
        'SELECT * FROM c WHERE c.email = @email AND c.id != @userId',
        [
          { name: '@email', value: updateData.email },
          { name: '@userId', value: userId }
        ]
      )

      if (existingUserByEmail.length > 0) {
        return {
          success: false,
          error: 'Email already exists'
        }
      }
    }

    // ユーザー更新
    const updatedUser: User = {
      ...existingUser,
      ...updateData,
      updatedAt: new Date()
    }

    const result = await cosmosService.updateItem<User>('users', userId, updatedUser)

    return {
      success: true,
      user: result
    }
  } catch (error) {
    console.error('Error updating user:', error)
    return {
      success: false,
      error: 'Failed to update user'
    }
  }
}

/**
 * ユーザーを削除
 */
export async function deleteUser(userId: string): Promise<{
  success: boolean
  message?: string
  error?: string
}> {
  try {
    const cosmosService = getCosmosService()

    // 既存ユーザー取得
    const existingUser = await cosmosService.getItem<User>('users', userId)
    if (!existingUser) {
      return {
        success: false,
        error: 'User not found'
      }
    }

    // 最後の管理者ユーザーかチェック
    if (existingUser.isAdmin) {
      const adminUsers = await cosmosService.queryItems<User>(
        'users',
        'SELECT * FROM c WHERE c.isAdmin = true',
        []
      )

      if (adminUsers.length <= 1) {
        return {
          success: false,
          error: 'Cannot delete the last admin user'
        }
      }
    }

    // ユーザー削除
    await cosmosService.deleteItem('users', userId)

    return {
      success: true,
      message: 'User deleted successfully'
    }
  } catch (error) {
    console.error('Error deleting user:', error)
    return {
      success: false,
      error: 'Failed to delete user'
    }
  }
}

/**
 * 全グループを取得
 */
export async function getGroups(): Promise<{
  success: boolean
  groups?: Group[]
  error?: string
}> {
  try {
    const cosmosService = getCosmosService()

    const groups = await cosmosService.queryItems<Group>(
      'groups',
      'SELECT * FROM c ORDER BY c.createdAt ASC',
      []
    )

    return {
      success: true,
      groups
    }
  } catch (error) {
    console.error('Error getting groups:', error)
    return {
      success: false,
      error: 'Failed to retrieve groups'
    }
  }
}

/**
 * 新しいグループを作成
 */
export async function createGroup(groupData: GroupCreateData): Promise<{
  success: boolean
  group?: Group
  error?: string
}> {
  try {
    // データ検証
    const validation = validateGroupData(groupData)
    if (!validation.valid) {
      return {
        success: false,
        error: validation.errors.join(', ')
      }
    }

    const cosmosService = getCosmosService()

    // グループ名の重複チェック
    const existingGroups = await cosmosService.queryItems<Group>(
      'groups',
      'SELECT * FROM c WHERE c.name = @name',
      [{ name: '@name', value: groupData.name }]
    )

    if (existingGroups.length > 0) {
      return {
        success: false,
        error: 'Group name already exists'
      }
    }

    // グループ作成
    const newGroup: Group = {
      id: crypto.randomUUID(),
      name: groupData.name,
      description: groupData.description,
      createdAt: new Date()
    }

    const createdGroup = await cosmosService.createItem<Group>('groups', newGroup)

    return {
      success: true,
      group: createdGroup
    }
  } catch (error) {
    console.error('Error creating group:', error)
    return {
      success: false,
      error: 'Failed to create group'
    }
  }
}

/**
 * グループを更新
 */
export async function updateGroup(groupId: string, updateData: GroupUpdateData): Promise<{
  success: boolean
  group?: Group
  error?: string
}> {
  try {
    const cosmosService = getCosmosService()

    // 既存グループ取得
    const existingGroup = await cosmosService.getItem<Group>('groups', groupId)
    if (!existingGroup) {
      return {
        success: false,
        error: 'Group not found'
      }
    }

    // 更新データ検証
    const dataToValidate = {
      name: updateData.name || existingGroup.name,
      description: updateData.description || existingGroup.description
    }

    const validation = validateGroupData(dataToValidate)
    if (!validation.valid) {
      return {
        success: false,
        error: validation.errors.join(', ')
      }
    }

    // グループ名重複チェック（自分以外）
    if (updateData.name && updateData.name !== existingGroup.name) {
      const existingGroups = await cosmosService.queryItems<Group>(
        'groups',
        'SELECT * FROM c WHERE c.name = @name AND c.id != @groupId',
        [
          { name: '@name', value: updateData.name },
          { name: '@groupId', value: groupId }
        ]
      )

      if (existingGroups.length > 0) {
        return {
          success: false,
          error: 'Group name already exists'
        }
      }
    }

    // グループ更新
    const updatedGroup: Group = {
      ...existingGroup,
      ...updateData
    }

    const result = await cosmosService.updateItem<Group>('groups', groupId, updatedGroup)

    return {
      success: true,
      group: result
    }
  } catch (error) {
    console.error('Error updating group:', error)
    return {
      success: false,
      error: 'Failed to update group'
    }
  }
}

/**
 * グループを削除
 */
export async function deleteGroup(groupId: string): Promise<{
  success: boolean
  message?: string
  error?: string
}> {
  try {
    const cosmosService = getCosmosService()

    // 既存グループ取得
    const existingGroup = await cosmosService.getItem<Group>('groups', groupId)
    if (!existingGroup) {
      return {
        success: false,
        error: 'Group not found'
      }
    }

    // グループにユーザーが存在するかチェック
    const usersInGroup = await cosmosService.queryItems<User>(
      'users',
      'SELECT * FROM c WHERE c.groupId = @groupId',
      [{ name: '@groupId', value: groupId }]
    )

    if (usersInGroup.length > 0) {
      return {
        success: false,
        error: 'Cannot delete group with existing users. Please reassign users to another group first.'
      }
    }

    // グループ削除
    await cosmosService.deleteItem('groups', groupId)

    return {
      success: true,
      message: 'Group deleted successfully'
    }
  } catch (error) {
    console.error('Error deleting group:', error)
    return {
      success: false,
      error: 'Failed to delete group'
    }
  }
}

/**
 * ユーザーデータを検証
 */
export function validateUserData(userData: UserCreateData | Record<string, unknown>, isUpdate = false): ValidationResult {
  const errors: string[] = []

  // ユーザー名検証
  if (!userData.username || userData.username.trim().length === 0) {
    errors.push('Username is required')
  } else if (userData.username.length < 3) {
    errors.push('Username must be at least 3 characters long')
  } else if (userData.username.length > 50) {
    errors.push('Username must be 50 characters or less')
  } else if (!/^[a-zA-Z0-9_-]+$/.test(userData.username)) {
    errors.push('Username can only contain letters, numbers, hyphens, and underscores')
  }

  // メール検証
  if (!userData.email || userData.email.trim().length === 0) {
    errors.push('Email is required')
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
    errors.push('Invalid email format')
  }

  // パスワード検証（新規作成時のみ）
  if (!isUpdate && userData.password) {
    const passwordValidation = validatePassword(userData.password)
    if (!passwordValidation.valid) {
      errors.push(...passwordValidation.errors)
    }
  }

  // グループID検証
  if (!userData.groupId || userData.groupId.trim().length === 0) {
    errors.push('Group is required')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * グループデータを検証
 */
export function validateGroupData(groupData: GroupCreateData): ValidationResult {
  const errors: string[] = []

  // グループ名検証
  if (!groupData.name || groupData.name.trim().length === 0) {
    errors.push('Group name is required')
  } else if (groupData.name.length < 2) {
    errors.push('Group name must be at least 2 characters long')
  } else if (groupData.name.length > 100) {
    errors.push('Group name must be 100 characters or less')
  }

  // 説明検証
  if (!groupData.description || groupData.description.trim().length === 0) {
    errors.push('Group description is required')
  } else if (groupData.description.length > 500) {
    errors.push('Group description must be 500 characters or less')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}