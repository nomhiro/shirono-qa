import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  validateUserData,
  validateGroupData
} from '../admin'
import { testDataStore, mockCosmosService } from './test-helpers'
import { User } from '@/types/auth'

// CosmosServiceをモック
jest.mock('../cosmos', () => ({
  getCosmosService: () => mockCosmosService
}))

// Auth libraryをモック
jest.mock('../auth', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed-password'),
  validatePassword: jest.fn().mockReturnValue({ valid: true, errors: [] })
}))

describe('Admin Library', () => {
  beforeEach(() => {
    testDataStore.clear()
  })

  describe('User Management', () => {
    describe('getUsers', () => {
      it('should return all users', async () => {
        // テストユーザーを作成
        await testDataStore.createItem('users', {
          id: 'user-1',
          username: 'alice',
          email: 'alice@example.com',
          passwordHash: 'hashed',
          groupId: 'group-1',
          isAdmin: false,
          createdAt: new Date(),
          lastLoginAt: new Date(),
        })

        await testDataStore.createItem('users', {
          id: 'user-2',
          username: 'bob',
          email: 'bob@example.com',
          passwordHash: 'hashed',
          groupId: 'group-1',
          isAdmin: true,
          createdAt: new Date(),
          lastLoginAt: new Date(),
        })

        const result = await getUsers()

        expect(result.success).toBe(true)
        expect(result.users).toHaveLength(2)
        expect(result.users![0].username).toBe('alice')
        expect(result.users![1].username).toBe('bob')
      })

      it('should filter users by group', async () => {
        await testDataStore.createItem('users', {
          id: 'user-1',
          username: 'alice',
          email: 'alice@example.com',
          passwordHash: 'hashed',
          groupId: 'group-1',
          isAdmin: false,
          createdAt: new Date(),
          lastLoginAt: new Date(),
        })

        await testDataStore.createItem('users', {
          id: 'user-2',
          username: 'bob',
          email: 'bob@example.com',
          passwordHash: 'hashed',
          groupId: 'group-2',
          isAdmin: false,
          createdAt: new Date(),
          lastLoginAt: new Date(),
        })

        const result = await getUsers({ groupId: 'group-1' })

        expect(result.success).toBe(true)
        expect(result.users).toHaveLength(1)
        expect(result.users![0].username).toBe('alice')
      })

      it('should search users by username', async () => {
        await testDataStore.createItem('users', {
          id: 'user-1',
          username: 'alice_smith',
          email: 'alice@example.com',
          passwordHash: 'hashed',
          groupId: 'group-1',
          isAdmin: false,
          createdAt: new Date(),
          lastLoginAt: new Date(),
        })

        await testDataStore.createItem('users', {
          id: 'user-2',
          username: 'bob_jones',
          email: 'bob@example.com',
          passwordHash: 'hashed',
          groupId: 'group-1',
          isAdmin: false,
          createdAt: new Date(),
          lastLoginAt: new Date(),
        })

        const result = await getUsers({ search: 'alice' })

        expect(result.success).toBe(true)
        expect(result.users).toHaveLength(1)
        expect(result.users![0].username).toBe('alice_smith')
      })
    })

    describe('createUser', () => {
      it('should create new user successfully', async () => {
        const userData = {
          username: 'newuser',
          email: 'newuser@example.com',
          password: 'Password123!',
          groupId: 'group-1',
          isAdmin: false
        }

        const result = await createUser(userData)

        expect(result.success).toBe(true)
        expect(result.user?.username).toBe('newuser')
        expect(result.user?.email).toBe('newuser@example.com')
        expect(result.user?.groupId).toBe('group-1')
        expect(result.user?.isAdmin).toBe(false)
        expect(result.user?.passwordHash).toBe('hashed-password')
      })

      it('should validate user data', async () => {
        const invalidData = {
          username: '', // Empty username
          email: 'invalid-email', // Invalid email
          password: '123', // Weak password
          groupId: 'group-1',
          isAdmin: false
        }

        const result = await createUser(invalidData)

        expect(result.success).toBe(false)
        expect(result.error).toContain('Username is required')
      })

      it('should check for duplicate username', async () => {
        // 既存ユーザーを作成
        await testDataStore.createItem('users', {
          id: 'user-1',
          username: 'existing',
          email: 'existing@example.com',
          passwordHash: 'hashed',
          groupId: 'group-1',
          isAdmin: false,
          createdAt: new Date(),
          lastLoginAt: new Date(),
        })

        const userData = {
          username: 'existing', // 重複ユーザー名
          email: 'new@example.com',
          password: 'Password123!',
          groupId: 'group-1',
          isAdmin: false
        }

        const result = await createUser(userData)

        expect(result.success).toBe(false)
        expect(result.error).toContain('Username already exists')
      })

      it('should check for duplicate email', async () => {
        await testDataStore.createItem('users', {
          id: 'user-1',
          username: 'existing',
          email: 'existing@example.com',
          passwordHash: 'hashed',
          groupId: 'group-1',
          isAdmin: false,
          createdAt: new Date(),
          lastLoginAt: new Date(),
        })

        const userData = {
          username: 'newuser',
          email: 'existing@example.com', // 重複メール
          password: 'Password123!',
          groupId: 'group-1',
          isAdmin: false
        }

        const result = await createUser(userData)

        expect(result.success).toBe(false)
        expect(result.error).toContain('Email already exists')
      })
    })

    describe('updateUser', () => {
      beforeEach(async () => {
        await testDataStore.createItem('users', {
          id: 'user-1',
          username: 'alice',
          email: 'alice@example.com',
          passwordHash: 'hashed',
          groupId: 'group-1',
          isAdmin: false,
          createdAt: new Date(),
          lastLoginAt: new Date(),
        })
      })

      it('should update user successfully', async () => {
        const updateData = {
          username: 'alice_updated',
          email: 'alice_updated@example.com',
          groupId: 'group-2',
          isAdmin: true
        }

        const result = await updateUser('user-1', updateData)

        expect(result.success).toBe(true)
        expect(result.user?.username).toBe('alice_updated')
        expect(result.user?.email).toBe('alice_updated@example.com')
        expect(result.user?.groupId).toBe('group-2')
        expect(result.user?.isAdmin).toBe(true)
      })

      it('should return error for non-existent user', async () => {
        const result = await updateUser('non-existent', { username: 'new' })

        expect(result.success).toBe(false)
        expect(result.error).toBe('User not found')
      })

      it('should validate update data', async () => {
        const invalidData = {
          email: 'invalid-email'
        }

        const result = await updateUser('user-1', invalidData)

        expect(result.success).toBe(false)
        expect(result.error).toContain('Invalid email format')
      })
    })

    describe('deleteUser', () => {
      beforeEach(async () => {
        await testDataStore.createItem('users', {
          id: 'user-1',
          username: 'alice',
          email: 'alice@example.com',
          passwordHash: 'hashed',
          groupId: 'group-1',
          isAdmin: false,
          createdAt: new Date(),
          lastLoginAt: new Date(),
        })
      })

      it('should delete user successfully', async () => {
        const result = await deleteUser('user-1')

        expect(result.success).toBe(true)
        expect(result.message).toBe('User deleted successfully')

        // ユーザーが削除されていることを確認
        const deletedUser = await testDataStore.getItem('users', 'user-1')
        expect(deletedUser).toBeNull()
      })

      it('should return error for non-existent user', async () => {
        const result = await deleteUser('non-existent')

        expect(result.success).toBe(false)
        expect(result.error).toBe('User not found')
      })

      it('should prevent deletion of last admin user', async () => {
        // 管理者ユーザーに更新
        await testDataStore.updateItem('users', 'user-1', {
          id: 'user-1',
          username: 'alice',
          email: 'alice@example.com',
          passwordHash: 'hashed',
          groupId: 'group-1',
          isAdmin: true,
          createdAt: new Date(),
          lastLoginAt: new Date(),
        })

        const result = await deleteUser('user-1')

        expect(result.success).toBe(false)
        expect(result.error).toContain('Cannot delete the last admin user')
      })
    })
  })

  describe('Group Management', () => {
    describe('getGroups', () => {
      it('should return all groups', async () => {
        await testDataStore.createItem('groups', {
          id: 'group-1',
          name: 'TS-AI',
          description: 'Technical Support AI',
          createdAt: new Date(),
        })

        await testDataStore.createItem('groups', {
          id: 'group-2',
          name: 'Admins',
          description: 'Administrators',
          createdAt: new Date(),
        })

        const result = await getGroups()

        expect(result.success).toBe(true)
        expect(result.groups).toHaveLength(2)
        expect(result.groups![0].name).toBe('TS-AI')
        expect(result.groups![1].name).toBe('Admins')
      })
    })

    describe('createGroup', () => {
      it('should create new group successfully', async () => {
        const groupData = {
          name: 'New Group',
          description: 'Description for new group'
        }

        const result = await createGroup(groupData)

        expect(result.success).toBe(true)
        expect(result.group?.name).toBe('New Group')
        expect(result.group?.description).toBe('Description for new group')
      })

      it('should validate group data', async () => {
        const invalidData = {
          name: '', // Empty name
          description: 'Valid description'
        }

        const result = await createGroup(invalidData)

        expect(result.success).toBe(false)
        expect(result.error).toContain('Group name is required')
      })

      it('should check for duplicate group name', async () => {
        await testDataStore.createItem('groups', {
          id: 'group-1',
          name: 'Existing Group',
          description: 'Description',
          createdAt: new Date(),
        })

        const groupData = {
          name: 'Existing Group',
          description: 'Another description'
        }

        const result = await createGroup(groupData)

        expect(result.success).toBe(false)
        expect(result.error).toContain('Group name already exists')
      })
    })

    describe('updateGroup', () => {
      beforeEach(async () => {
        await testDataStore.createItem('groups', {
          id: 'group-1',
          name: 'Original Group',
          description: 'Original description',
          createdAt: new Date(),
        })
      })

      it('should update group successfully', async () => {
        const updateData = {
          name: 'Updated Group',
          description: 'Updated description'
        }

        const result = await updateGroup('group-1', updateData)

        expect(result.success).toBe(true)
        expect(result.group?.name).toBe('Updated Group')
        expect(result.group?.description).toBe('Updated description')
      })

      it('should return error for non-existent group', async () => {
        const result = await updateGroup('non-existent', { name: 'New Name' })

        expect(result.success).toBe(false)
        expect(result.error).toBe('Group not found')
      })
    })

    describe('deleteGroup', () => {
      beforeEach(async () => {
        await testDataStore.createItem('groups', {
          id: 'group-1',
          name: 'Test Group',
          description: 'Test description',
          createdAt: new Date(),
        })
      })

      it('should delete group successfully', async () => {
        const result = await deleteGroup('group-1')

        expect(result.success).toBe(true)
        expect(result.message).toBe('Group deleted successfully')
      })

      it('should return error for non-existent group', async () => {
        const result = await deleteGroup('non-existent')

        expect(result.success).toBe(false)
        expect(result.error).toBe('Group not found')
      })

      it('should prevent deletion of group with users', async () => {
        // グループにユーザーを追加
        await testDataStore.createItem('users', {
          id: 'user-1',
          username: 'alice',
          email: 'alice@example.com',
          passwordHash: 'hashed',
          groupId: 'group-1',
          isAdmin: false,
          createdAt: new Date(),
          lastLoginAt: new Date(),
        })

        const result = await deleteGroup('group-1')

        expect(result.success).toBe(false)
        expect(result.error).toContain('Cannot delete group with existing users')
      })
    })
  })

  describe('Validation Functions', () => {
    describe('validateUserData', () => {
      it('should validate correct user data', () => {
        const userData = {
          username: 'validuser',
          email: 'valid@example.com',
          password: 'ValidPass123!',
          groupId: 'group-1',
          isAdmin: false
        }

        const result = validateUserData(userData)

        expect(result.valid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('should reject invalid user data', () => {
        const userData = {
          username: 'ab', // Too short
          email: 'invalid-email',
          password: '123', // Too weak
          groupId: '',
          isAdmin: false
        }

        const result = validateUserData(userData)

        expect(result.valid).toBe(false)
        expect(result.errors.length).toBeGreaterThan(0)
      })
    })

    describe('validateGroupData', () => {
      it('should validate correct group data', () => {
        const groupData = {
          name: 'Valid Group Name',
          description: 'Valid description'
        }

        const result = validateGroupData(groupData)

        expect(result.valid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('should reject invalid group data', () => {
        const groupData = {
          name: '', // Empty name
          description: 'A'.repeat(501) // Too long
        }

        const result = validateGroupData(groupData)

        expect(result.valid).toBe(false)
        expect(result.errors.length).toBeGreaterThan(0)
      })
    })
  })
})