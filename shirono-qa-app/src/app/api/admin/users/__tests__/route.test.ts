import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import { testDataStore, mockCosmosService } from '@/lib/__tests__/test-helpers'

// モック設定
jest.mock('@/lib/cosmos', () => ({
  getCosmosService: () => mockCosmosService
}))

jest.mock('@/lib/auth', () => ({
  validateSession: jest.fn(),
  hashPassword: jest.fn().mockResolvedValue('hashed-password'),
  validatePassword: jest.fn().mockReturnValue({ valid: true, errors: [] })
}))

import { validateSession } from '@/lib/auth'

const mockValidateSession = validateSession as jest.MockedFunction<typeof validateSession>

const mockAdminUser = {
  id: 'admin-123',
  username: 'admin',
  email: 'admin@example.com',
  groupId: 'group-admin',
  isAdmin: true,
  createdAt: new Date(),
  lastLoginAt: null,
}

const mockRegularUser = {
  id: 'user-123',
  username: 'testuser',
  email: 'test@example.com',
  groupId: 'group-ts-ai',
  isAdmin: false,
  createdAt: new Date(),
  lastLoginAt: null,
}

describe('/api/admin/users', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    testDataStore.clear()
  })

  describe('GET /api/admin/users', () => {
    beforeEach(async () => {
      // テストユーザーを作成
      await testDataStore.createItem('users', {
        id: 'user-1',
        username: 'alice',
        email: 'alice@example.com',
        passwordHash: 'hashed',
        groupId: 'group-ts-ai',
        isAdmin: false,
        createdAt: new Date('2024-01-01'),
        lastLoginAt: new Date('2024-01-15'),
      })

      await testDataStore.createItem('users', {
        id: 'user-2',
        username: 'bob',
        email: 'bob@example.com',
        passwordHash: 'hashed',
        groupId: 'group-ts-ai',
        isAdmin: false,
        createdAt: new Date('2024-01-02'),
        lastLoginAt: new Date('2024-01-14'),
      })

      await testDataStore.createItem('users', {
        id: 'admin-1',
        username: 'admin',
        email: 'admin@example.com',
        passwordHash: 'hashed',
        groupId: 'group-admin',
        isAdmin: true,
        createdAt: new Date('2024-01-01'),
        lastLoginAt: new Date('2024-01-16'),
      })
    })

    it('should return all users for admin', async () => {
      mockValidateSession.mockResolvedValue({
        valid: true,
        user: mockAdminUser
      })

      const request = new NextRequest('http://localhost:3000/api/admin/users', {
        method: 'GET',
        headers: {
          'Cookie': 'session=admin-session-token'
        }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.users).toHaveLength(3)
      expect(data.users.some((u: any) => u.username === 'alice')).toBe(true)
      expect(data.users.some((u: any) => u.username === 'bob')).toBe(true)
      expect(data.users.some((u: any) => u.username === 'admin')).toBe(true)
    })

    it('should filter users by group', async () => {
      mockValidateSession.mockResolvedValue({
        valid: true,
        user: mockAdminUser
      })

      const request = new NextRequest('http://localhost:3000/api/admin/users?groupId=group-ts-ai', {
        method: 'GET',
        headers: {
          'Cookie': 'session=admin-session-token'
        }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.users).toHaveLength(2)
      expect(data.users.every((u: any) => u.groupId === 'group-ts-ai')).toBe(true)
    })

    it('should search users by username', async () => {
      mockValidateSession.mockResolvedValue({
        valid: true,
        user: mockAdminUser
      })

      const request = new NextRequest('http://localhost:3000/api/admin/users?search=alice', {
        method: 'GET',
        headers: {
          'Cookie': 'session=admin-session-token'
        }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.users).toHaveLength(1)
      expect(data.users[0].username).toBe('alice')
    })

    it('should filter users by role', async () => {
      mockValidateSession.mockResolvedValue({
        valid: true,
        user: mockAdminUser
      })

      const request = new NextRequest('http://localhost:3000/api/admin/users?isAdmin=true', {
        method: 'GET',
        headers: {
          'Cookie': 'session=admin-session-token'
        }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.users).toHaveLength(1)
      expect(data.users[0].isAdmin).toBe(true)
    })

    it('should return 403 for non-admin users', async () => {
      mockValidateSession.mockResolvedValue({
        valid: true,
        user: mockRegularUser
      })

      const request = new NextRequest('http://localhost:3000/api/admin/users', {
        method: 'GET',
        headers: {
          'Cookie': 'session=user-session-token'
        }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error.code).toBe('FORBIDDEN')
    })

    it('should return 401 for unauthenticated requests', async () => {
      mockValidateSession.mockResolvedValue({ valid: false })

      const request = new NextRequest('http://localhost:3000/api/admin/users', {
        method: 'GET'
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })
  })

  describe('POST /api/admin/users', () => {
    beforeEach(async () => {
      // テストグループを作成
      await testDataStore.createItem('groups', {
        id: 'group-ts-ai',
        name: 'TS-AI',
        description: 'Technical Support AI',
        createdAt: new Date(),
      })
    })

    it('should create new user successfully', async () => {
      mockValidateSession.mockResolvedValue({
        valid: true,
        user: mockAdminUser
      })

      const userData = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'NewPassword123!',
        groupId: 'group-ts-ai',
        isAdmin: false
      }

      const request = new NextRequest('http://localhost:3000/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=admin-session-token'
        },
        body: JSON.stringify(userData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.user.username).toBe('newuser')
      expect(data.user.email).toBe('newuser@example.com')
      expect(data.user.groupId).toBe('group-ts-ai')
      expect(data.user.isAdmin).toBe(false)
      expect(data.user.passwordHash).toBe('hashed-password')
    })

    it('should validate required fields', async () => {
      mockValidateSession.mockResolvedValue({
        valid: true,
        user: mockAdminUser
      })

      const invalidData = {
        username: '', // Empty username
        email: 'valid@example.com',
        password: 'ValidPassword123!',
        groupId: 'group-ts-ai',
        isAdmin: false
      }

      const request = new NextRequest('http://localhost:3000/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=admin-session-token'
        },
        body: JSON.stringify(invalidData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toContain('Username is required')
    })

    it('should check for duplicate username', async () => {
      mockValidateSession.mockResolvedValue({
        valid: true,
        user: mockAdminUser
      })

      // 既存ユーザーを作成
      await testDataStore.createItem('users', {
        id: 'existing-user',
        username: 'existing',
        email: 'existing@example.com',
        passwordHash: 'hashed',
        groupId: 'group-ts-ai',
        isAdmin: false,
        createdAt: new Date(),
        lastLoginAt: new Date(),
      })

      const userData = {
        username: 'existing', // 重複ユーザー名
        email: 'new@example.com',
        password: 'NewPassword123!',
        groupId: 'group-ts-ai',
        isAdmin: false
      }

      const request = new NextRequest('http://localhost:3000/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=admin-session-token'
        },
        body: JSON.stringify(userData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toContain('Username already exists')
    })

    it('should check for duplicate email', async () => {
      mockValidateSession.mockResolvedValue({
        valid: true,
        user: mockAdminUser
      })

      await testDataStore.createItem('users', {
        id: 'existing-user',
        username: 'existing',
        email: 'existing@example.com',
        passwordHash: 'hashed',
        groupId: 'group-ts-ai',
        isAdmin: false,
        createdAt: new Date(),
        lastLoginAt: new Date(),
      })

      const userData = {
        username: 'newuser',
        email: 'existing@example.com', // 重複メール
        password: 'NewPassword123!',
        groupId: 'group-ts-ai',
        isAdmin: false
      }

      const request = new NextRequest('http://localhost:3000/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=admin-session-token'
        },
        body: JSON.stringify(userData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toContain('Email already exists')
    })

    it('should return 403 for non-admin users', async () => {
      mockValidateSession.mockResolvedValue({
        valid: true,
        user: mockRegularUser
      })

      const userData = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'NewPassword123!',
        groupId: 'group-ts-ai',
        isAdmin: false
      }

      const request = new NextRequest('http://localhost:3000/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=user-session-token'
        },
        body: JSON.stringify(userData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error.code).toBe('FORBIDDEN')
    })
  })
})