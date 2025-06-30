import {
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getQuestion,
  getQuestions,
  validateQuestionData
} from '../questions'
import { QuestionStatus, QuestionPriority } from '../../types/question'
import { testDataStore, mockCosmosService } from './test-helpers'

// CosmosServiceをモック
jest.mock('../cosmos', () => ({
  getCosmosService: () => mockCosmosService
}))

describe('Questions Library', () => {
  beforeEach(() => {
    // テストデータをクリア
    testDataStore.clear()
  })

  describe('validateQuestionData', () => {
    it('should reject empty title', () => {
      const result = validateQuestionData({
        title: '',
        content: 'Valid content',
        priority: QuestionPriority.MEDIUM
      })
      
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Title is required')
    })

    it('should reject title longer than 100 characters', () => {
      const result = validateQuestionData({
        title: 'A'.repeat(101),
        content: 'Valid content',
        priority: QuestionPriority.MEDIUM
      })
      
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Title must be 100 characters or less')
    })

    it('should reject empty content', () => {
      const result = validateQuestionData({
        title: 'Valid title',
        content: '',
        priority: QuestionPriority.MEDIUM
      })
      
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Content is required')
    })

    it('should reject content longer than 10000 characters', () => {
      const result = validateQuestionData({
        title: 'Valid title',
        content: 'A'.repeat(10001),
        priority: QuestionPriority.MEDIUM
      })
      
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Content must be 10000 characters or less')
    })

    it('should accept valid question data', () => {
      const result = validateQuestionData({
        title: 'Valid title',
        content: 'Valid content',
        priority: QuestionPriority.MEDIUM
      })
      
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('createQuestion', () => {
    it('should create a question with valid data', async () => {
      const questionData = {
        title: 'How to implement authentication?',
        content: 'I need help with implementing JWT authentication in Next.js',
        priority: QuestionPriority.HIGH
      }
      const authorId = 'user123'
      const groupId = 'group456'

      const result = await createQuestion(questionData, authorId, groupId)

      expect(result.success).toBe(true)
      expect(result.question).toBeDefined()
      expect(result.question?.title).toBe(questionData.title)
      expect(result.question?.content).toBe(questionData.content)
      expect(result.question?.priority).toBe(questionData.priority)
      expect(result.question?.authorId).toBe(authorId)
      expect(result.question?.groupId).toBe(groupId)
      expect(result.question?.status).toBe(QuestionStatus.UNANSWERED)
      expect(result.question?.tags).toBeInstanceOf(Array)
    })

    it('should reject invalid question data', async () => {
      const questionData = {
        title: '',
        content: 'Valid content',
        priority: QuestionPriority.MEDIUM
      }
      const authorId = 'user123'
      const groupId = 'group456'

      const result = await createQuestion(questionData, authorId, groupId)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid question data')
      expect(result.error).toContain('Title is required')
      expect(result.question).toBeUndefined()
    })
  })

  describe('updateQuestion', () => {
    it('should update question title', async () => {
      // 事前に質問を作成
      const createResult = await createQuestion({
        title: 'Original title',
        content: 'Original content',
        priority: QuestionPriority.MEDIUM
      }, 'user123', 'group456')
      
      expect(createResult.success).toBe(true)
      const questionId = createResult.question!.id
      
      const updateData = {
        title: 'Updated title'
      }

      const result = await updateQuestion(questionId, updateData)

      expect(result.success).toBe(true)
      expect(result.question?.title).toBe(updateData.title)
    })

    it('should update question status', async () => {
      // 事前に質問を作成
      const createResult = await createQuestion({
        title: 'Original title',
        content: 'Original content',
        priority: QuestionPriority.MEDIUM
      }, 'user123', 'group456')
      
      expect(createResult.success).toBe(true)
      const questionId = createResult.question!.id
      
      const updateData = {
        status: QuestionStatus.RESOLVED
      }

      const result = await updateQuestion(questionId, updateData)

      expect(result.success).toBe(true)
      expect(result.question?.status).toBe(updateData.status)
    })

    it('should return error for non-existent question', async () => {
      const questionId = 'nonexistent'
      const updateData = {
        title: 'Updated title'
      }

      const result = await updateQuestion(questionId, updateData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Question not found')
    })
  })

  describe('getQuestion', () => {
    it('should return question by id', async () => {
      // 事前に質問を作成
      const createResult = await createQuestion({
        title: 'Test question',
        content: 'Test content',
        priority: QuestionPriority.MEDIUM
      }, 'user123', 'group456')
      
      expect(createResult.success).toBe(true)
      const questionId = createResult.question!.id

      const result = await getQuestion(questionId)

      expect(result.success).toBe(true)
      expect(result.question).toBeDefined()
      expect(result.question?.id).toBe(questionId)
    })

    it('should return error for non-existent question', async () => {
      const questionId = 'nonexistent'

      const result = await getQuestion(questionId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Question not found')
    })
  })

  describe('getQuestions', () => {
    it('should return paginated questions', async () => {
      const query = {
        page: 1,
        limit: 10,
        groupId: 'group123'
      }

      const result = await getQuestions(query)

      expect(result.success).toBe(true)
      expect(result.questions).toBeInstanceOf(Array)
      expect(result.total).toBeGreaterThanOrEqual(0)
      expect(result.page).toBe(1)
    })

    it('should filter by status', async () => {
      const query = {
        status: QuestionStatus.UNANSWERED,
        groupId: 'group123'
      }

      const result = await getQuestions(query)

      expect(result.success).toBe(true)
      expect(result.questions?.every(q => q.status === QuestionStatus.UNANSWERED)).toBe(true)
    })

    it('should search by keyword', async () => {
      const query = {
        search: 'authentication',
        groupId: 'group123'
      }

      const result = await getQuestions(query)

      expect(result.success).toBe(true)
      expect(result.questions).toBeInstanceOf(Array)
    })
  })

  describe('deleteQuestion', () => {
    it('should delete existing question', async () => {
      // 事前に質問を作成
      const createResult = await createQuestion({
        title: 'To be deleted',
        content: 'This will be deleted',
        priority: QuestionPriority.MEDIUM
      }, 'user123', 'group456')
      
      expect(createResult.success).toBe(true)
      const questionId = createResult.question!.id

      const result = await deleteQuestion(questionId)

      expect(result.success).toBe(true)
    })

    it('should return error for non-existent question', async () => {
      const questionId = 'nonexistent'

      const result = await deleteQuestion(questionId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Question not found')
    })
  })
})