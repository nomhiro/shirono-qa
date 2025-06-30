import {
  createAnswer,
  updateAnswer,
  deleteAnswer,
  getAnswersByQuestion,
  validateAnswerData,
  createComment,
  deleteComment,
  getCommentsByQuestion,
  getCommentsByAnswer,
  validateCommentData
} from '../answers'
import { testDataStore, mockCosmosService } from './test-helpers'

// CosmosServiceをモック
jest.mock('../cosmos', () => ({
  getCosmosService: () => mockCosmosService
}))

// Blob Storage をモック
jest.mock('../blob-storage', () => ({
  uploadFile: jest.fn().mockResolvedValue({
    fileName: 'mocked-file.txt',
    fileSize: 1024,
    blobUrl: 'https://mock-storage.blob.core.windows.net/container/mocked-file.txt'
  })
}))

describe('Answers and Comments Library', () => {
  beforeEach(() => {
    // テストデータをクリア
    testDataStore.clear()
  })

  describe('validateAnswerData', () => {
    it('should reject empty content', () => {
      const result = validateAnswerData({
        content: ''
      })
      
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Content is required')
    })

    it('should reject content longer than 10000 characters', () => {
      const result = validateAnswerData({
        content: 'A'.repeat(10001)
      })
      
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Must be 10000 characters or less')
    })

    it('should accept valid answer data', () => {
      const result = validateAnswerData({
        content: 'This is a valid answer content'
      })
      
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should validate attachment limits', () => {
      const largeFiles = Array(6).fill(null).map(() => 
        new File(['content'], 'test.txt', { type: 'text/plain' })
      )
      
      const result = validateAnswerData({
        content: 'Valid content',
        attachments: largeFiles
      })
      
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Maximum 5 files allowed')
    })
  })

  describe('createAnswer', () => {
    it('should create answer with valid data', async () => {
      const answerData = {
        content: 'This is a helpful answer'
      }
      const questionId = 'question123'
      const authorId = 'user456'

      const result = await createAnswer(answerData, questionId, authorId)

      expect(result.success).toBe(true)
      expect(result.answer).toBeDefined()
      expect(result.answer?.content).toBe(answerData.content)
      expect(result.answer?.questionId).toBe(questionId)
      expect(result.answer?.authorId).toBe(authorId)
      expect(result.answer?.attachments).toEqual([])
    })

    it('should reject invalid answer data', async () => {
      const answerData = {
        content: ''
      }
      const questionId = 'question123'
      const authorId = 'user456'

      const result = await createAnswer(answerData, questionId, authorId)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid answer data')
      expect(result.answer).toBeUndefined()
    })

    it('should handle file attachments', async () => {
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
      const answerData = {
        content: 'Answer with attachment',
        attachments: [file]
      }
      const questionId = 'question123'
      const authorId = 'user456'

      const result = await createAnswer(answerData, questionId, authorId)

      expect(result.success).toBe(true)
      expect(result.answer?.attachments).toHaveLength(1)
      expect(result.answer?.attachments[0].fileName).toBe('test.txt')
    })
  })

  describe('updateAnswer', () => {
    it('should update answer content', async () => {
      const answerId = 'answer123'
      const updateData = {
        content: 'Updated answer content'
      }

      const result = await updateAnswer(answerId, updateData)

      expect(result.success).toBe(true)
      expect(result.answer?.content).toBe(updateData.content)
    })

    it('should return error for non-existent answer', async () => {
      const answerId = 'nonexistent'
      const updateData = {
        content: 'Updated content'
      }

      const result = await updateAnswer(answerId, updateData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Answer not found')
    })
  })

  describe('deleteAnswer', () => {
    it('should delete existing answer', async () => {
      const answerId = 'answer123'

      const result = await deleteAnswer(answerId)

      expect(result.success).toBe(true)
    })

    it('should return error for non-existent answer', async () => {
      const answerId = 'nonexistent'

      const result = await deleteAnswer(answerId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Answer not found')
    })
  })

  describe('getAnswersByQuestion', () => {
    it('should return answers for a question', async () => {
      const questionId = 'question123'

      const result = await getAnswersByQuestion(questionId)

      expect(result.success).toBe(true)
      expect(result.answers).toBeInstanceOf(Array)
    })

    it('should return empty array for question with no answers', async () => {
      const questionId = 'no-answers-question'

      const result = await getAnswersByQuestion(questionId)

      expect(result.success).toBe(true)
      expect(result.answers).toEqual([])
    })
  })

  describe('validateCommentData', () => {
    it('should reject empty content', () => {
      const result = validateCommentData({
        content: ''
      })
      
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Content is required')
    })

    it('should reject content longer than 1000 characters', () => {
      const result = validateCommentData({
        content: 'A'.repeat(1001)
      })
      
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Must be 1000 characters or less')
    })

    it('should accept valid comment data', () => {
      const result = validateCommentData({
        content: 'This is a valid comment'
      })
      
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('createComment', () => {
    it('should create comment on question', async () => {
      const commentData = {
        content: 'This is a comment on the question'
      }
      const questionId = 'question123'
      const authorId = 'user456'

      const result = await createComment(commentData, questionId, authorId)

      expect(result.success).toBe(true)
      expect(result.comment).toBeDefined()
      expect(result.comment?.content).toBe(commentData.content)
      expect(result.comment?.questionId).toBe(questionId)
      expect(result.comment?.authorId).toBe(authorId)
      expect(result.comment?.answerId).toBeUndefined()
    })

    it('should create comment on answer', async () => {
      const commentData = {
        content: 'This is a comment on the answer',
        answerId: 'answer123'
      }
      const questionId = 'question123'
      const authorId = 'user456'

      const result = await createComment(commentData, questionId, authorId)

      expect(result.success).toBe(true)
      expect(result.comment?.answerId).toBe('answer123')
    })

    it('should reject invalid comment data', async () => {
      const commentData = {
        content: ''
      }
      const questionId = 'question123'
      const authorId = 'user456'

      const result = await createComment(commentData, questionId, authorId)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid comment data')
    })
  })

  describe('getCommentsByQuestion', () => {
    it('should return comments for a question', async () => {
      const questionId = 'question123'

      const result = await getCommentsByQuestion(questionId)

      expect(result.success).toBe(true)
      expect(result.comments).toBeInstanceOf(Array)
    })
  })

  describe('getCommentsByAnswer', () => {
    it('should return comments for an answer', async () => {
      const answerId = 'answer123'

      const result = await getCommentsByAnswer(answerId)

      expect(result.success).toBe(true)
      expect(result.comments).toBeInstanceOf(Array)
    })
  })

  describe('deleteComment', () => {
    it('should delete existing comment', async () => {
      const commentId = 'comment123'

      const result = await deleteComment(commentId)

      expect(result.success).toBe(true)
    })

    it('should return error for non-existent comment', async () => {
      const commentId = 'nonexistent'

      const result = await deleteComment(commentId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Comment not found')
    })
  })
})