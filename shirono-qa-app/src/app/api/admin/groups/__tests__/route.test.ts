import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import { testDataStore, mockCosmosService } from '@/lib/__tests__/test-helpers'

// モック設定
jest.mock('@/lib/cosmos', () => ({
  getCosmosService: () => mockCosmosService
}))

jest.mock('@/lib/auth', () => ({
  validateSession: jest.fn(),
}))

import { validateSession } from '@/lib/auth'

const mockValidateSession = validateSession as jest.MockedFunction<typeof validateSession>

const mockAdminUser = {
  id: 'admin-123',
  username: 'admin',
  email: 'admin@example.com',
  groupId: 'group-admin',
  isAdmin: true,
}

const mockRegularUser = {
  id: 'user-123',
  username: 'testuser',
  email: 'test@example.com',
  groupId: 'group-ts-ai',
  isAdmin: false,
}

describe('/api/admin/groups', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    testDataStore.clear()
  })

  describe('GET /api/admin/groups', () => {
    beforeEach(async () => {
      // テストグループを作成
      await testDataStore.createItem('groups', {
        id: 'group-1',
        name: 'TS-AI',
        description: 'Technical Support AI',
        createdAt: new Date('2024-01-01'),
      })

      await testDataStore.createItem('groups', {
        id: 'group-2',
        name: 'DevOps',
        description: 'Development Operations Team',
        createdAt: new Date('2024-01-02'),
      })

      await testDataStore.createItem('groups', {
        id: 'group-3',
        name: 'QA',
        description: 'Quality Assurance Team',
        createdAt: new Date('2024-01-03'),
      })
    })

    it('should return all groups for admin user', async () => {
      mockValidateSession.mockResolvedValue({
        valid: true,
        user: mockAdminUser
      })

      const request = new NextRequest('http://localhost:3000/api/admin/groups', {
        method: 'GET',
        headers: {
          'Cookie': 'session=admin-session-token'
        }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.groups).toHaveLength(3)
      expect(data.groups.some((g: any) => g.name === 'TS-AI')).toBe(true)
      expect(data.groups.some((g: any) => g.name === 'DevOps')).toBe(true)
      expect(data.groups.some((g: any) => g.name === 'QA')).toBe(true)
    })

    it('should return groups sorted by creation date ascending', async () => {
      mockValidateSession.mockResolvedValue({
        valid: true,
        user: mockAdminUser
      })

      const request = new NextRequest('http://localhost:3000/api/admin/groups', {
        method: 'GET',
        headers: {
          'Cookie': 'session=admin-session-token'
        }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.groups[0].name).toBe('TS-AI')
      expect(data.groups[1].name).toBe('DevOps')
      expect(data.groups[2].name).toBe('QA')
    })

    it('should return 403 for non-admin users', async () => {
      mockValidateSession.mockResolvedValue({
        valid: true,
        user: mockRegularUser
      })

      const request = new NextRequest('http://localhost:3000/api/admin/groups', {
        method: 'GET',
        headers: {
          'Cookie': 'session=user-session-token'
        }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error.code).toBe('FORBIDDEN')
      expect(data.error.message).toBe('Admin access required')
    })

    it('should return 401 for unauthenticated requests', async () => {
      mockValidateSession.mockResolvedValue({ valid: false })

      const request = new NextRequest('http://localhost:3000/api/admin/groups', {
        method: 'GET'
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should return 401 when session token is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/groups', {
        method: 'GET'
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
      expect(data.error.message).toBe('Authentication required')
    })
  })

  describe('POST /api/admin/groups', () => {
    it('should create new group successfully', async () => {
      mockValidateSession.mockResolvedValue({
        valid: true,
        user: mockAdminUser
      })

      const groupData = {
        name: 'Security',
        description: 'Security and Compliance Team'
      }

      const request = new NextRequest('http://localhost:3000/api/admin/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=admin-session-token'
        },
        body: JSON.stringify(groupData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.group.name).toBe('Security')
      expect(data.group.description).toBe('Security and Compliance Team')
      expect(data.group.id).toBeDefined()
      expect(data.group.createdAt).toBeDefined()
    })

    it('should validate required fields', async () => {
      mockValidateSession.mockResolvedValue({
        valid: true,
        user: mockAdminUser
      })

      const invalidData = {
        name: '', // Empty name
        description: 'Valid description'
      }

      const request = new NextRequest('http://localhost:3000/api/admin/groups', {
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
      expect(data.error.message).toContain('Group name is required')
    })

    it('should validate description field', async () => {
      mockValidateSession.mockResolvedValue({
        valid: true,
        user: mockAdminUser
      })

      const invalidData = {
        name: 'Valid Name',
        description: '' // Empty description
      }

      const request = new NextRequest('http://localhost:3000/api/admin/groups', {
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
      expect(data.error.message).toContain('Group description is required')
    })

    it('should check for duplicate group names', async () => {
      mockValidateSession.mockResolvedValue({
        valid: true,
        user: mockAdminUser
      })

      // 既存グループを作成
      await testDataStore.createItem('groups', {
        id: 'existing-group',
        name: 'Existing Group',
        description: 'Already exists',
        createdAt: new Date(),
      })

      const duplicateData = {
        name: 'Existing Group', // 重複名
        description: 'Another description'
      }

      const request = new NextRequest('http://localhost:3000/api/admin/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=admin-session-token'
        },
        body: JSON.stringify(duplicateData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toContain('Group name already exists')
    })

    it('should validate group name length constraints', async () => {
      mockValidateSession.mockResolvedValue({
        valid: true,
        user: mockAdminUser
      })

      const invalidData = {
        name: 'A', // Too short (less than 2 chars)
        description: 'Valid description'
      }

      const request = new NextRequest('http://localhost:3000/api/admin/groups', {
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
      expect(data.error.message).toContain('Group name must be at least 2 characters long')
    })

    it('should validate description length constraints', async () => {
      mockValidateSession.mockResolvedValue({
        valid: true,
        user: mockAdminUser
      })

      const invalidData = {
        name: 'Valid Name',
        description: 'x'.repeat(501) // Too long (over 500 chars)
      }

      const request = new NextRequest('http://localhost:3000/api/admin/groups', {
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
      expect(data.error.message).toContain('Group description must be 500 characters or less')
    })

    it('should return 403 for non-admin users', async () => {
      mockValidateSession.mockResolvedValue({
        valid: true,
        user: mockRegularUser
      })

      const groupData = {
        name: 'New Group',
        description: 'Description'
      }

      const request = new NextRequest('http://localhost:3000/api/admin/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=user-session-token'
        },
        body: JSON.stringify(groupData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error.code).toBe('FORBIDDEN')
    })

    it('should return 401 for unauthenticated requests', async () => {
      mockValidateSession.mockResolvedValue({ valid: false })

      const groupData = {
        name: 'New Group',
        description: 'Description'
      }

      const request = new NextRequest('http://localhost:3000/api/admin/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(groupData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should handle invalid JSON body', async () => {
      mockValidateSession.mockResolvedValue({
        valid: true,
        user: mockAdminUser
      })

      const request = new NextRequest('http://localhost:3000/api/admin/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=admin-session-token'
        },
        body: 'invalid json'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })
  })
})