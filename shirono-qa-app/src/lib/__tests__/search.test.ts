import {
  searchQuestions,
  findSimilarQuestions,
  generateAutoTags,
  getSearchSuggestions,
  calculateSimilarity,
  highlightSearchTerms
} from '../search'
import { embedText } from '../openai'
import { SearchSortField } from '../../types/search'
import { testDataStore, mockCosmosService } from './test-helpers'

// Mock Azure OpenAI
jest.mock('../openai', () => ({
  embedText: jest.fn(),
  generateTags: jest.fn(),
  chatCompletion: jest.fn()
}))

// CosmosServiceをモック
jest.mock('../cosmos', () => ({
  getCosmosService: () => mockCosmosService
}))

import { embedText as mockEmbedText, generateTags as mockGenerateTags } from '../openai'

const mockEmbedTextFn = mockEmbedText as jest.MockedFunction<typeof mockEmbedText>
const mockGenerateTagsFn = mockGenerateTags as jest.MockedFunction<typeof mockGenerateTags>

describe('Search and AI Library', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    testDataStore.clear()
  })

  describe('searchQuestions', () => {
    it('should search questions by keyword', async () => {
      const query = {
        q: 'Next.js authentication',
        page: 1,
        limit: 10
      }

      const result = await searchQuestions(query)

      expect(result.success).toBe(true)
      expect(result.results).toBeInstanceOf(Array)
      expect(result.total).toBeGreaterThanOrEqual(0)
      expect(result.page).toBe(1)
    })

    it('should filter questions by tags', async () => {
      const query = {
        q: 'authentication',
        tags: ['security', 'next.js'],
        groupId: 'group123'
      }

      const result = await searchQuestions(query)

      expect(result.success).toBe(true)
      expect(result.results?.every(r => 
        r.question.tags.some(tag => query.tags!.includes(tag.toLowerCase()))
      )).toBe(true)
    })

    it('should sort results by relevance by default', async () => {
      const query = {
        q: 'database optimization',
        sortBy: SearchSortField.RELEVANCE
      }

      const result = await searchQuestions(query)

      expect(result.success).toBe(true)
      if (result.results && result.results.length > 1) {
        // Check that results are sorted by score descending
        for (let i = 0; i < result.results.length - 1; i++) {
          expect(result.results[i].score).toBeGreaterThanOrEqual(result.results[i + 1].score)
        }
      }
    })

    it('should provide search suggestions for typos', async () => {
      const query = {
        q: 'autentication' // intentional typo
      }

      const result = await searchQuestions(query)

      expect(result.success).toBe(true)
      expect(result.suggestions).toContain('authentication')
    })

    it('should highlight search terms in results', async () => {
      const query = {
        q: 'JWT token'
      }

      const result = await searchQuestions(query)

      expect(result.success).toBe(true)
      if (result.results && result.results.length > 0) {
        const firstResult = result.results[0]
        expect(firstResult.highlights).toBeInstanceOf(Array)
        expect(firstResult.snippet).toContain('...')
      }
    })

    it('should handle empty search gracefully', async () => {
      const query = {
        q: ''
      }

      const result = await searchQuestions(query)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Search query is required')
    })
  })

  describe('findSimilarQuestions', () => {
    beforeEach(() => {
      mockEmbedTextFn.mockResolvedValue(new Array(3072).fill(0.1))
    })

    it('should find similar questions using vector search', async () => {
      const queryText = 'How to implement JWT authentication in Next.js'
      const excludeId = 'current-question-123'

      const result = await findSimilarQuestions(queryText, excludeId, 5)

      expect(result.success).toBe(true)
      expect(result.questions).toBeInstanceOf(Array)
      expect(result.questions?.length).toBeLessThanOrEqual(5)
      expect(mockEmbedTextFn).toHaveBeenCalledWith(queryText)

      // Verify excluded question is not in results
      expect(result.questions?.some(q => q.id === excludeId)).toBe(false)
    })

    it('should order results by similarity score', async () => {
      const result = await findSimilarQuestions('React hooks tutorial')

      expect(result.success).toBe(true)
      if (result.questions && result.questions.length > 1) {
        for (let i = 0; i < result.questions.length - 1; i++) {
          expect(result.questions[i].similarity).toBeGreaterThanOrEqual(result.questions[i + 1].similarity)
        }
      }
    })

    it('should filter by similarity threshold', async () => {
      const result = await findSimilarQuestions('Azure deployment', undefined, 10)

      expect(result.success).toBe(true)
      expect(result.questions?.every(q => q.similarity >= 0.7)).toBe(true)
    })

    it('should handle no similar questions found', async () => {
      const result = await findSimilarQuestions('very unique specific question that has no matches')

      expect(result.success).toBe(true)
      expect(result.questions).toEqual([])
    })

    it('should handle embedding API failure', async () => {
      mockEmbedTextFn.mockRejectedValue(new Error('OpenAI API error'))

      const result = await findSimilarQuestions('test query')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to find similar questions')
    })
  })

  describe('generateAutoTags', () => {
    beforeEach(() => {
      mockGenerateTagsFn.mockResolvedValue({
        tags: ['next.js', 'authentication', 'security'],
        confidence: 0.95
      })
    })

    it('should generate tags from question title and content', async () => {
      const title = 'JWT Authentication in Next.js'
      const content = 'I need help implementing JWT authentication with proper security practices'

      const result = await generateAutoTags(title, content)

      expect(result.success).toBe(true)
      expect(result.tags).toEqual(['next.js', 'authentication', 'security'])
      expect(result.confidence).toBe(0.95)
      expect(mockGenerateTagsFn).toHaveBeenCalledWith(title, content)
    })

    it('should handle empty input gracefully', async () => {
      const result = await generateAutoTags('', '')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Title and content are required for tag generation')
    })

    it('should handle AI API failure', async () => {
      mockGenerateTagsFn.mockRejectedValue(new Error('OpenAI API error'))

      const result = await generateAutoTags('Test title', 'Test content')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to generate tags')
    })

    it('should limit number of generated tags', async () => {
      mockGenerateTagsFn.mockResolvedValue({
        tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6', 'tag7'],
        confidence: 0.8
      })

      const result = await generateAutoTags('Title', 'Content')

      expect(result.success).toBe(true)
      expect(result.tags?.length).toBeLessThanOrEqual(5) // Max 5 tags
    })
  })

  describe('getSearchSuggestions', () => {
    it('should return search suggestions', async () => {
      const result = await getSearchSuggestions('auth')

      expect(result.success).toBe(true)
      expect(result.suggestions).toBeInstanceOf(Array)
      expect(result.suggestions?.some(s => s.includes('auth'))).toBe(true)
    })

    it('should handle empty query', async () => {
      const result = await getSearchSuggestions('')

      expect(result.success).toBe(true)
      expect(result.suggestions).toEqual([])
    })

    it('should limit number of suggestions', async () => {
      const result = await getSearchSuggestions('test')

      expect(result.success).toBe(true)
      expect(result.suggestions?.length).toBeLessThanOrEqual(10)
    })
  })

  describe('utility functions', () => {
    describe('calculateSimilarity', () => {
      it('should calculate cosine similarity correctly', () => {
        const vector1 = [1, 0, 0]
        const vector2 = [1, 0, 0]
        const similarity = calculateSimilarity(vector1, vector2)
        expect(similarity).toBeCloseTo(1.0, 2)
      })

      it('should handle orthogonal vectors', () => {
        const vector1 = [1, 0, 0]
        const vector2 = [0, 1, 0]
        const similarity = calculateSimilarity(vector1, vector2)
        expect(similarity).toBeCloseTo(0.0, 2)
      })

      it('should handle opposite vectors', () => {
        const vector1 = [1, 0, 0]
        const vector2 = [-1, 0, 0]
        const similarity = calculateSimilarity(vector1, vector2)
        expect(similarity).toBeCloseTo(-1.0, 2)
      })
    })

    describe('highlightSearchTerms', () => {
      it('should highlight search terms in text', () => {
        const text = 'This is a test about JWT authentication'
        const terms = ['JWT', 'authentication']
        const highlighted = highlightSearchTerms(text, terms)
        
        expect(highlighted).toContain('<mark>JWT</mark>')
        expect(highlighted).toContain('<mark>authentication</mark>')
      })

      it('should be case insensitive', () => {
        const text = 'Next.js Authentication Guide'
        const terms = ['next.js', 'AUTHENTICATION']
        const highlighted = highlightSearchTerms(text, terms)
        
        expect(highlighted).toContain('<mark>Next.js</mark>')
        expect(highlighted).toContain('<mark>Authentication</mark>')
      })

      it('should handle overlapping terms', () => {
        const text = 'authentication and authorize'
        const terms = ['auth', 'authentication']
        const highlighted = highlightSearchTerms(text, terms)
        
        // Should highlight the longer term 'authentication' instead of 'auth'
        expect(highlighted).toContain('authentication')
        expect(highlighted).not.toContain('<mark><mark>')
      })
    })
  })
})