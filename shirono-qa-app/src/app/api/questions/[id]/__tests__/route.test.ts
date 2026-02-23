import { NextRequest } from 'next/server'
import { GET, PUT, DELETE } from '../route'
import { QuestionStatus, QuestionPriority } from '@/types/question'
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

const mockQuestion = {
  id: 'question-123',
  title: 'Test Question',
  content: 'Test content for the question',
  authorId: 'user-123',
  groupId: 'group-ts-ai',
  status: QuestionStatus.UNANSWERED,
  priority: QuestionPriority.MEDIUM,
  tags: ['test', 'api'],
  attachments: [],
  createdAt: new Date('2024-01-15T10:00:00Z'),
  updatedAt: new Date('2024-01-15T10:00:00Z'),
}

describe('/api/questions/[id]', () => {
  beforeEach(async () => {
    jest.clearAllMocks()
    testDataStore.clear()
    
    // テスト用質問データを作成
    await testDataStore.createItem('questions', mockQuestion)
    
    // デフォルトのモック設定
    mockValidateSession.mockResolvedValue({
      valid: true,
      user: {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        groupId: 'group-ts-ai',
        isAdmin: false,
        createdAt: new Date(),
        lastLoginAt: null,
      }
    })
  })

  describe('GET /api/questions/[id]', () => {
    it('should return question details', async () => {
      const request = new NextRequest('http://localhost:3000/api/questions/question-123', {
        method: 'GET',
        headers: {
          'Cookie': 'session=test-session-token'
        }
      })

      const response = await GET(request, { params: Promise.resolve({ id: 'question-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.question.id).toBe('question-123')
      expect(data.question.title).toBe('Test Question')
      expect(data.question.authorId).toBe('user-123')
    })

    it('should return 404 for non-existent question', async () => {
      const request = new NextRequest('http://localhost:3000/api/questions/non-existent', {
        method: 'GET',
        headers: {
          'Cookie': 'session=test-session-token'
        }
      })

      const response = await GET(request, { params: Promise.resolve({ id: 'non-existent' }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error.code).toBe('NOT_FOUND')
      expect(data.error.message).toBe('Question not found')
    })

    it('should return 403 for questions in different group', async () => {
      // 異なるグループの質問を作成
      await testDataStore.createItem('questions', {
        ...mockQuestion,
        id: 'question-other-group',
        groupId: 'group-other'
      })

      const request = new NextRequest('http://localhost:3000/api/questions/question-other-group', {
        method: 'GET',
        headers: {
          'Cookie': 'session=test-session-token'
        }
      })

      const response = await GET(request, { params: Promise.resolve({ id: 'question-other-group' }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error.code).toBe('FORBIDDEN')
    })

    it('should allow admin to access questions in any group', async () => {
      mockValidateSession.mockResolvedValue({
        valid: true,
        user: {
          id: 'admin-user',
          username: 'admin',
          email: 'admin@example.com',
          groupId: 'group-admin',
          isAdmin: true,
          createdAt: new Date(),
          lastLoginAt: null,
        }
      })

      // 異なるグループの質問を作成
      await testDataStore.createItem('questions', {
        ...mockQuestion,
        id: 'question-other-group',
        groupId: 'group-other'
      })

      const request = new NextRequest('http://localhost:3000/api/questions/question-other-group', {
        method: 'GET',
        headers: {
          'Cookie': 'session=test-session-token'
        }
      })

      const response = await GET(request, { params: Promise.resolve({ id: 'question-other-group' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('PUT /api/questions/[id]', () => {
    it('should update question by author', async () => {
      const updateData = {
        title: 'Updated Question Title',
        content: 'Updated content',
        priority: QuestionPriority.HIGH
      }

      const request = new NextRequest('http://localhost:3000/api/questions/question-123', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=test-session-token'
        },
        body: JSON.stringify(updateData)
      })

      const response = await PUT(request, { params: Promise.resolve({ id: 'question-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.question.title).toBe('Updated Question Title')
      expect(data.question.content).toBe('Updated content')
      expect(data.question.priority).toBe(QuestionPriority.HIGH)
      expect(data.question.authorId).toBe('user-123') // Should not change
    })

    it('should update question status by admin', async () => {
      mockValidateSession.mockResolvedValue({
        valid: true,
        user: {
          id: 'admin-user',
          username: 'admin',
          email: 'admin@example.com',
          groupId: 'group-ts-ai',
          isAdmin: true,
          createdAt: new Date(),
          lastLoginAt: null,
        }
      })

      const updateData = {
        status: QuestionStatus.ANSWERED
      }

      const request = new NextRequest('http://localhost:3000/api/questions/question-123', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=test-session-token'
        },
        body: JSON.stringify(updateData)
      })

      const response = await PUT(request, { params: Promise.resolve({ id: 'question-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.question.status).toBe(QuestionStatus.ANSWERED)
    })

    it('should return 403 for non-author non-admin users', async () => {
      mockValidateSession.mockResolvedValue({
        valid: true,
        user: {
          id: 'different-user',
          username: 'otheruser',
          email: 'other@example.com',
          groupId: 'group-ts-ai',
          isAdmin: false,
          createdAt: new Date(),
          lastLoginAt: null,
        }
      })

      const updateData = {
        title: 'Updated Title'
      }

      const request = new NextRequest('http://localhost:3000/api/questions/question-123', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=test-session-token'
        },
        body: JSON.stringify(updateData)
      })

      const response = await PUT(request, { params: Promise.resolve({ id: 'question-123' }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error.code).toBe('FORBIDDEN')
    })

    it('should validate update data', async () => {
      const invalidData = {
        title: 'A'.repeat(101), // Too long title
        content: 'Valid content'
      }

      const request = new NextRequest('http://localhost:3000/api/questions/question-123', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=test-session-token'
        },
        body: JSON.stringify(invalidData)
      })

      const response = await PUT(request, { params: Promise.resolve({ id: 'question-123' }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toContain('Title must be 100 characters or less')
    })
  })

  describe('DELETE /api/questions/[id]', () => {
    it('should delete question by author', async () => {
      const request = new NextRequest('http://localhost:3000/api/questions/question-123', {
        method: 'DELETE',
        headers: {
          'Cookie': 'session=test-session-token'
        }
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: 'question-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Question deleted successfully')

      // 質問が削除されたことを確認
      const deletedQuestion = await testDataStore.getItem('questions', 'question-123')
      expect(deletedQuestion).toBeNull()
    })

    it('should delete question by admin', async () => {
      mockValidateSession.mockResolvedValue({
        valid: true,
        user: {
          id: 'admin-user',
          username: 'admin',
          email: 'admin@example.com',
          groupId: 'group-ts-ai',
          isAdmin: true,
          createdAt: new Date(),
          lastLoginAt: null,
        }
      })

      const request = new NextRequest('http://localhost:3000/api/questions/question-123', {
        method: 'DELETE',
        headers: {
          'Cookie': 'session=test-session-token'
        }
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: 'question-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should return 403 for non-author non-admin users', async () => {
      mockValidateSession.mockResolvedValue({
        valid: true,
        user: {
          id: 'different-user',
          username: 'otheruser',
          email: 'other@example.com',
          groupId: 'group-ts-ai',
          isAdmin: false,
          createdAt: new Date(),
          lastLoginAt: null,
        }
      })

      const request = new NextRequest('http://localhost:3000/api/questions/question-123', {
        method: 'DELETE',
        headers: {
          'Cookie': 'session=test-session-token'
        }
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: 'question-123' }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error.code).toBe('FORBIDDEN')
    })

    it('should return 404 for non-existent question', async () => {
      const request = new NextRequest('http://localhost:3000/api/questions/non-existent', {
        method: 'DELETE',
        headers: {
          'Cookie': 'session=test-session-token'
        }
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: 'non-existent' }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error.code).toBe('NOT_FOUND')
    })
  })
})