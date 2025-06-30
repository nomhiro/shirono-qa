import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import { QuestionPriority } from '@/types/question'
import { testDataStore, mockCosmosService } from '@/lib/__tests__/test-helpers'

// モック設定
jest.mock('@/lib/cosmos', () => ({
  getCosmosService: () => mockCosmosService
}))

jest.mock('@/lib/auth', () => ({
  validateSession: jest.fn(),
}))

jest.mock('@/lib/openai', () => ({
  generateTags: jest.fn(),
}))

import { validateSession } from '@/lib/auth'
import { generateTags } from '@/lib/openai'

const mockValidateSession = validateSession as jest.MockedFunction<typeof validateSession>
const mockGenerateTags = generateTags as jest.MockedFunction<typeof generateTags>

describe('/api/questions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    testDataStore.clear()
    
    // デフォルトのモック設定
    mockValidateSession.mockResolvedValue({
      valid: true,
      user: {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        groupId: 'group-ts-ai',
        isAdmin: false,
      }
    })
    
    mockGenerateTags.mockResolvedValue({
      tags: ['test', 'api'],
      confidence: 0.9
    })
  })

  describe('GET /api/questions', () => {
    it('should return paginated questions', async () => {
      // テスト用質問データを作成
      await testDataStore.createItem('questions', {
        id: 'question-1',
        title: 'Test Question 1',
        content: 'Test content 1',
        authorId: 'user-123',
        groupId: 'group-ts-ai',
        status: 'UNANSWERED',
        priority: QuestionPriority.MEDIUM,
        tags: ['test'],
        attachments: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const request = new NextRequest('http://localhost:3000/api/questions?page=1&limit=10', {
        method: 'GET',
        headers: {
          'Cookie': 'session=test-session-token'
        }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.questions).toHaveLength(1)
      expect(data.questions[0].title).toBe('Test Question 1')
      expect(data.total).toBe(1)
      expect(data.page).toBe(1)
    })

    it('should filter questions by group', async () => {
      // 異なるグループの質問を作成
      await testDataStore.createItem('questions', {
        id: 'question-1',
        title: 'Question in TS-AI group',
        content: 'Content 1',
        authorId: 'user-123',
        groupId: 'group-ts-ai',
        status: 'UNANSWERED',
        priority: QuestionPriority.MEDIUM,
        tags: [],
        attachments: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await testDataStore.createItem('questions', {
        id: 'question-2',
        title: 'Question in different group',
        content: 'Content 2',
        authorId: 'user-456',
        groupId: 'group-other',
        status: 'UNANSWERED',
        priority: QuestionPriority.MEDIUM,
        tags: [],
        attachments: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const request = new NextRequest('http://localhost:3000/api/questions', {
        method: 'GET',
        headers: {
          'Cookie': 'session=test-session-token'
        }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.questions).toHaveLength(1)
      expect(data.questions[0].groupId).toBe('group-ts-ai')
    })

    it('should return 401 for unauthenticated requests', async () => {
      mockValidateSession.mockResolvedValue({ valid: false })

      const request = new NextRequest('http://localhost:3000/api/questions', {
        method: 'GET'
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })
  })

  describe('POST /api/questions', () => {
    it('should create a new question', async () => {
      const questionData = {
        title: 'How to implement JWT authentication?',
        content: 'I need help with JWT implementation in Next.js',
        priority: QuestionPriority.HIGH
      }

      const request = new NextRequest('http://localhost:3000/api/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=test-session-token'
        },
        body: JSON.stringify(questionData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.question.title).toBe(questionData.title)
      expect(data.question.content).toBe(questionData.content)
      expect(data.question.priority).toBe(questionData.priority)
      expect(data.question.authorId).toBe('user-123')
      expect(data.question.groupId).toBe('group-ts-ai')
      expect(data.question.status).toBe('UNANSWERED')
      expect(data.question.tags).toEqual(['test', 'api'])
    })

    it('should validate required fields', async () => {
      const invalidData = {
        title: '', // Empty title
        content: 'Valid content',
        priority: QuestionPriority.MEDIUM
      }

      const request = new NextRequest('http://localhost:3000/api/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=test-session-token'
        },
        body: JSON.stringify(invalidData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toContain('Title is required')
    })

    it('should validate content length', async () => {
      const invalidData = {
        title: 'Valid title',
        content: 'A'.repeat(10001), // Too long content
        priority: QuestionPriority.MEDIUM
      }

      const request = new NextRequest('http://localhost:3000/api/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=test-session-token'
        },
        body: JSON.stringify(invalidData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toContain('Content must be 10000 characters or less')
    })

    it('should return 401 for unauthenticated requests', async () => {
      mockValidateSession.mockResolvedValue({ valid: false })

      const request = new NextRequest('http://localhost:3000/api/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Test',
          content: 'Test content',
          priority: QuestionPriority.MEDIUM
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should handle AI tagging failure gracefully', async () => {
      mockGenerateTags.mockRejectedValue(new Error('AI service unavailable'))

      const questionData = {
        title: 'Test question',
        content: 'Test content',
        priority: QuestionPriority.MEDIUM
      }

      const request = new NextRequest('http://localhost:3000/api/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=test-session-token'
        },
        body: JSON.stringify(questionData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.question.tags).toEqual([]) // Empty tags when AI fails
    })
  })
})