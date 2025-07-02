import {
  SearchQuery,
  SearchResponse,
  SearchResult,
  SimilarQuestionsResult,
  AutoTagResult,
  SearchSuggestionsResult,
  SearchSortField
} from '../types/search'
import { Question } from '../types/question'
import { embedText, generateTags } from './openai'
import { getCosmosService } from './cosmos'

export async function searchQuestions(query: SearchQuery): Promise<SearchResponse> {
  try {
    // Validate input
    if (!query.q || query.q.trim() === '') {
      return {
        success: false,
        error: 'Search query is required'
      }
    }

    const cosmosService = getCosmosService()

    // Build SQL query for Cosmos DB
    let sqlQuery = 'SELECT * FROM c'
    const parameters: { name: string; value: unknown }[] = []
    const searchTerm = query.q.toLowerCase()

    // Add search conditions
    const whereConditions: string[] = []

    // Full text search
    whereConditions.push('(CONTAINS(LOWER(c.title), @searchTerm) OR CONTAINS(LOWER(c.content), @searchTerm) OR ARRAY_CONTAINS(c.tags, @searchTerm, true))')
    parameters.push({ name: '@searchTerm', value: searchTerm })

    // Apply filters
    if (query.status) {
      whereConditions.push('c.status = @status')
      parameters.push({ name: '@status', value: query.status })
    }

    if (query.priority) {
      whereConditions.push('c.priority = @priority')
      parameters.push({ name: '@priority', value: query.priority })
    }

    if (query.authorId) {
      whereConditions.push('c.authorId = @authorId')
      parameters.push({ name: '@authorId', value: query.authorId })
    }

    if (query.groupId) {
      whereConditions.push('c.groupId = @groupId')
      parameters.push({ name: '@groupId', value: query.groupId })
    }

    // Date filtering
    if (query.dateFrom) {
      whereConditions.push('c.createdAt >= @dateFrom')
      parameters.push({ name: '@dateFrom', value: query.dateFrom.toISOString() })
    }

    if (query.dateTo) {
      whereConditions.push('c.createdAt <= @dateTo')
      parameters.push({ name: '@dateTo', value: query.dateTo.toISOString() })
    }

    // Build final query
    if (whereConditions.length > 0) {
      sqlQuery += ' WHERE ' + whereConditions.join(' AND ')
    }

    // Add sorting
    const sortBy = query.sortBy || SearchSortField.RELEVANCE
    const sortOrder = query.sortOrder || 'desc'

    switch (sortBy) {
      case SearchSortField.CREATED_AT:
        sqlQuery += ` ORDER BY c.createdAt ${sortOrder.toUpperCase()}`
        break
      case SearchSortField.UPDATED_AT:
        sqlQuery += ` ORDER BY c.updatedAt ${sortOrder.toUpperCase()}`
        break
      case SearchSortField.PRIORITY:
        // Custom priority ordering (high=3, medium=2, low=1)
        sqlQuery += ` ORDER BY (c.priority = "high" ? 3 : (c.priority = "medium" ? 2 : 1)) ${sortOrder.toUpperCase()}`
        break
      default:
        // For relevance, use created date as fallback
        sqlQuery += ` ORDER BY c.createdAt ${sortOrder.toUpperCase()}`
    }

    // Execute query
    const questions = await cosmosService.queryItems<Question>('questions', sqlQuery, parameters)

    // Calculate relevance scores and create search results
    const searchResults: SearchResult[] = questions.map(question => {
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

    // If sorting by relevance, sort by score
    if (sortBy === SearchSortField.RELEVANCE) {
      searchResults.sort((a, b) => {
        return sortOrder === 'desc' ? b.score - a.score : a.score - b.score
      })
    }

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
      total: searchResults.length,
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
    const cosmosService = getCosmosService()

    // Get all questions except the excluded one
    let sqlQuery = 'SELECT * FROM c'
    const parameters: { name: string; value: unknown }[] = []

    if (excludeQuestionId) {
      sqlQuery += ' WHERE c.id != @excludeId'
      parameters.push({ name: '@excludeId', value: excludeQuestionId })
    }

    const questions = await cosmosService.queryItems<Question>('questions', sqlQuery, parameters)

    // Calculate similarity for each question
    const similarQuestions = await Promise.all(
      questions.map(async (question) => {
        try {
          // Generate embedding for the question
          const questionText = question.title + ' ' + question.content
          const questionVector = await embedText(questionText)

          // Calculate similarity
          const similarity = calculateSimilarity(queryVector, questionVector)

          // Get answer count from answers collection
          const answerQuery = 'SELECT VALUE COUNT(1) FROM c WHERE c.questionId = @questionId'
          const answerParams = [{ name: '@questionId', value: question.id }]
          const answerCountResult = await cosmosService.queryItems<number>('answers', answerQuery, answerParams)
          const answersCount = answerCountResult[0] || 0

          return {
            id: question.id,
            title: question.title,
            content: question.content,
            similarity,
            snippet: generateSnippet(question.content),
            status: question.status,
            answersCount,
            createdAt: question.createdAt
          }
        } catch (error) {
          console.error('Error processing question for similarity:', error)
          // Return with low similarity if processing fails
          return {
            id: question.id,
            title: question.title,
            content: question.content,
            similarity: 0,
            snippet: generateSnippet(question.content),
            status: question.status,
            answersCount: 0,
            createdAt: question.createdAt
          }
        }
      })
    )

    // Filter by threshold and sort by similarity
    const filteredQuestions = similarQuestions
      .filter(q => q.similarity >= 0.7) // Filter by threshold
      .sort((a, b) => b.similarity - a.similarity) // Sort by similarity descending
      .slice(0, limit)

    return {
      success: true,
      questions: filteredQuestions
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

    const cosmosService = getCosmosService()

    // Get suggestions from existing question titles and tags
    const sqlQuery = `
      SELECT DISTINCT c.title, c.tags 
      FROM c 
      WHERE CONTAINS(LOWER(c.title), @query) OR ARRAY_CONTAINS(c.tags, @query, true)
      ORDER BY c.createdAt DESC
    `
    const parameters = [{ name: '@query', value: query.toLowerCase() }]

    const results = await cosmosService.queryItems<{ title: string; tags: string[] }>('questions', sqlQuery, parameters)

    const suggestions: string[] = []

    // Add matching titles
    results.forEach(result => {
      if (result.title.toLowerCase().includes(query.toLowerCase())) {
        suggestions.push(result.title)
      }

      // Add matching tags
      result.tags.forEach(tag => {
        if (tag.toLowerCase().includes(query.toLowerCase()) && !suggestions.includes(tag)) {
          suggestions.push(tag)
        }
      })
    })

    // Add typo corrections
    const typoCorrection = generateSearchSuggestions(query)
    typoCorrection.forEach(correction => {
      if (!suggestions.includes(correction)) {
        suggestions.push(correction)
      }
    })

    return {
      success: true,
      suggestions: suggestions.slice(0, 10)
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