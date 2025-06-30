import {
  SearchQuery,
  SearchResponse,
  SearchResult,
  SimilarQuestionsResult,
  AutoTagResult,
  SearchSuggestionsResult,
  SearchSortField,
  VectorSearchQuery,
  VectorSearchResult
} from '../types/search'
import { Question, QuestionStatus, QuestionPriority } from '../types/question'
import { embedText, generateTags } from './openai'

// Mock data for testing
const mockQuestions: Question[] = [
  {
    id: 'q1',
    title: 'JWT Authentication in Next.js',
    content: 'How to implement JWT authentication with proper security practices in Next.js applications?',
    authorId: 'user1',
    groupId: 'group1',
    status: QuestionStatus.ANSWERED,
    priority: QuestionPriority.HIGH,
    tags: ['next.js', 'authentication', 'security', 'jwt'],
    attachments: [],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'q2',
    title: 'Database optimization techniques',
    content: 'What are the best practices for optimizing database queries and improving performance?',
    authorId: 'user2',
    groupId: 'group1',
    status: QuestionStatus.RESOLVED,
    priority: QuestionPriority.MEDIUM,
    tags: ['database', 'performance', 'optimization', 'sql'],
    attachments: [],
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02')
  },
  {
    id: 'q3',
    title: 'React hooks best practices',
    content: 'Guidelines for using React hooks effectively and avoiding common pitfalls',
    authorId: 'user3',
    groupId: 'group1',
    status: QuestionStatus.UNANSWERED,
    priority: QuestionPriority.LOW,
    tags: ['react', 'hooks', 'frontend', 'javascript'],
    attachments: [],
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-03')
  }
]

export async function searchQuestions(query: SearchQuery): Promise<SearchResponse> {
  try {
    // Validate input
    if (!query.q || query.q.trim() === '') {
      return {
        success: false,
        error: 'Search query is required'
      }
    }

    const searchTerm = query.q.toLowerCase()
    let results = mockQuestions.slice()

    // Filter by search term
    results = results.filter(question => 
      question.title.toLowerCase().includes(searchTerm) ||
      question.content.toLowerCase().includes(searchTerm) ||
      question.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    )

    // Apply filters
    if (query.tags && query.tags.length > 0) {
      results = results.filter(question =>
        query.tags!.some(tag => 
          question.tags.some(qTag => qTag.toLowerCase().includes(tag.toLowerCase()))
        )
      )
    }

    if (query.status) {
      results = results.filter(question => question.status === query.status)
    }

    if (query.priority) {
      results = results.filter(question => question.priority === query.priority)
    }

    if (query.authorId) {
      results = results.filter(question => question.authorId === query.authorId)
    }

    if (query.groupId) {
      results = results.filter(question => question.groupId === query.groupId)
    }

    // Date filtering
    if (query.dateFrom) {
      results = results.filter(question => question.createdAt >= query.dateFrom!)
    }

    if (query.dateTo) {
      results = results.filter(question => question.createdAt <= query.dateTo!)
    }

    // Calculate relevance scores and create search results
    const searchResults: SearchResult[] = results.map(question => {
      let score = 0

      // Title match gets higher score
      if (question.title.toLowerCase().includes(searchTerm)) {
        score += 0.8
      }

      // Content match
      if (question.content.toLowerCase().includes(searchTerm)) {
        score += 0.6
      }

      // Tag match
      if (question.tags.some(tag => tag.toLowerCase().includes(searchTerm))) {
        score += 0.7
      }

      // Exact match bonus
      if (question.title.toLowerCase() === searchTerm) {
        score += 0.2
      }

      return {
        question,
        score: Math.min(score, 1.0),
        highlights: generateHighlights(question, [searchTerm]),
        snippet: generateSnippet(question.content, searchTerm)
      }
    })

    // Sort results
    const sortBy = query.sortBy || SearchSortField.RELEVANCE
    const sortOrder = query.sortOrder || 'desc'

    searchResults.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case SearchSortField.RELEVANCE:
          comparison = a.score - b.score
          break
        case SearchSortField.CREATED_AT:
          comparison = a.question.createdAt.getTime() - b.question.createdAt.getTime()
          break
        case SearchSortField.UPDATED_AT:
          comparison = a.question.updatedAt.getTime() - b.question.updatedAt.getTime()
          break
        case SearchSortField.PRIORITY:
          const priorityOrder = { high: 3, medium: 2, low: 1 }
          comparison = priorityOrder[a.question.priority as keyof typeof priorityOrder] - 
                      priorityOrder[b.question.priority as keyof typeof priorityOrder]
          break
        default:
          comparison = a.score - b.score
      }

      return sortOrder === 'desc' ? -comparison : comparison
    })

    // Pagination
    const page = query.page || 1
    const limit = query.limit || 20
    const startIndex = (page - 1) * limit
    const paginatedResults = searchResults.slice(startIndex, startIndex + limit)

    // Generate suggestions for potential typos
    const suggestions = generateSearchSuggestions(query.q)

    return {
      success: true,
      results: paginatedResults,
      total: results.length,
      page,
      limit,
      query: query.q,
      suggestions
    }
  } catch (error) {
    console.error('Error searching questions:', error)
    return {
      success: false,
      error: 'Search failed'
    }
  }
}

export async function findSimilarQuestions(
  queryText: string,
  excludeQuestionId?: string,
  limit = 5
): Promise<SimilarQuestionsResult> {
  try {
    // Generate embedding for the query
    const queryVector = await embedText(queryText)

    // Mock vector search implementation
    const candidates = mockQuestions.filter(q => q.id !== excludeQuestionId)
    
    const similarQuestions = candidates.map(question => {
      // Generate mock vector for the question (in production, this would be stored)
      const questionVector = generateMockVector(question.title + ' ' + question.content)
      
      // Calculate similarity
      const similarity = calculateSimilarity(queryVector, questionVector)
      
      return {
        id: question.id,
        title: question.title,
        content: question.content,
        similarity,
        snippet: generateSnippet(question.content),
        status: question.status,
        answersCount: Math.floor(Math.random() * 5) + 1, // Mock answer count
        createdAt: question.createdAt
      }
    })
    .filter(q => q.similarity >= 0.7) // Filter by threshold
    .sort((a, b) => b.similarity - a.similarity) // Sort by similarity descending
    .slice(0, limit)

    return {
      success: true,
      questions: similarQuestions
    }
  } catch (error) {
    console.error('Error finding similar questions:', error)
    return {
      success: false,
      error: 'Failed to find similar questions'
    }
  }
}

export async function generateAutoTags(title: string, content: string): Promise<AutoTagResult> {
  try {
    if (!title.trim() || !content.trim()) {
      return {
        success: false,
        error: 'Title and content are required for tag generation'
      }
    }

    const result = await generateTags(title, content)
    
    // Limit to 5 tags maximum
    const limitedTags = result.tags.slice(0, 5)
    
    return {
      success: true,
      tags: limitedTags,
      confidence: result.confidence
    }
  } catch (error) {
    console.error('Error generating auto tags:', error)
    return {
      success: false,
      error: 'Failed to generate tags'
    }
  }
}

export async function getSearchSuggestions(query: string): Promise<SearchSuggestionsResult> {
  try {
    if (!query.trim()) {
      return {
        success: true,
        suggestions: []
      }
    }

    // Mock suggestions based on common queries
    const commonQueries = [
      'authentication', 'authorization', 'next.js setup', 'react hooks',
      'database optimization', 'performance tuning', 'deployment issues',
      'cors errors', 'jwt implementation', 'oauth setup', 'testing strategies',
      'debugging tips', 'frontend best practices', 'backend architecture'
    ]

    const suggestions = commonQueries
      .filter(suggestion => suggestion.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 10)

    return {
      success: true,
      suggestions
    }
  } catch (error) {
    console.error('Error getting search suggestions:', error)
    return {
      success: false,
      error: 'Failed to get suggestions'
    }
  }
}

// Utility functions
export function calculateSimilarity(vector1: number[], vector2: number[]): number {
  if (vector1.length !== vector2.length) {
    throw new Error('Vectors must have the same length')
  }

  let dotProduct = 0
  let norm1 = 0
  let norm2 = 0

  for (let i = 0; i < vector1.length; i++) {
    dotProduct += vector1[i] * vector2[i]
    norm1 += vector1[i] * vector1[i]
    norm2 += vector2[i] * vector2[i]
  }

  const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2)
  
  if (magnitude === 0) {
    return 0
  }

  return dotProduct / magnitude
}

export function highlightSearchTerms(text: string, terms: string[]): string {
  let highlightedText = text

  // Sort terms by length (longest first) to avoid partial matches
  const sortedTerms = [...new Set(terms)].sort((a, b) => b.length - a.length)

  // Replace longer terms first to avoid overlapping highlights
  for (const term of sortedTerms) {
    // Only highlight if the term isn't already highlighted
    const regex = new RegExp(`(?!<mark>)\\b(${escapeRegExp(term)})\\b(?![^<]*</mark>)`, 'gi')
    highlightedText = highlightedText.replace(regex, '<mark>$1</mark>')
  }

  return highlightedText
}

function generateHighlights(question: Question, terms: string[]) {
  const highlights = []

  // Check title for highlights
  const titleHighlights = terms.filter(term => 
    question.title.toLowerCase().includes(term.toLowerCase())
  )
  if (titleHighlights.length > 0) {
    highlights.push({
      field: 'title',
      fragments: [highlightSearchTerms(question.title, titleHighlights)]
    })
  }

  // Check content for highlights
  const contentHighlights = terms.filter(term => 
    question.content.toLowerCase().includes(term.toLowerCase())
  )
  if (contentHighlights.length > 0) {
    const snippet = generateSnippet(question.content, terms[0])
    highlights.push({
      field: 'content',
      fragments: [highlightSearchTerms(snippet, contentHighlights)]
    })
  }

  return highlights
}

function generateSnippet(content: string, searchTerm?: string, maxLength = 200): string {
  if (!searchTerm) {
    return content.length > maxLength 
      ? content.substring(0, maxLength) + '...'
      : content
  }

  const termIndex = content.toLowerCase().indexOf(searchTerm.toLowerCase())
  
  if (termIndex === -1) {
    return content.length > maxLength 
      ? content.substring(0, maxLength) + '...'
      : content
  }

  // Center the snippet around the search term
  const start = Math.max(0, termIndex - maxLength / 2)
  const end = Math.min(content.length, start + maxLength)
  
  let snippet = content.substring(start, end)
  
  if (start > 0) snippet = '...' + snippet
  if (end < content.length) snippet = snippet + '...'
  
  return snippet
}

function generateMockVector(text: string): number[] {
  // Generate a deterministic mock vector based on text content
  const hash = simpleHash(text)
  const vector = new Array(3072)
  
  for (let i = 0; i < 3072; i++) {
    vector[i] = Math.sin(hash + i) * Math.cos(hash / (i + 1))
  }
  
  return vector
}

function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return hash
}

function generateSearchSuggestions(query: string): string[] {
  const typoMap: Record<string, string> = {
    'autentication': 'authentication',
    'authintication': 'authentication',
    'databse': 'database',
    'perfomance': 'performance',
    'optmization': 'optimization',
    'deployement': 'deployment',
    'cors': 'CORS',
    'jwt': 'JWT',
    'oauth': 'OAuth'
  }

  const suggestions: string[] = []
  
  // Check for typos
  const correction = typoMap[query.toLowerCase()]
  if (correction) {
    suggestions.push(correction)
  }

  return suggestions
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}