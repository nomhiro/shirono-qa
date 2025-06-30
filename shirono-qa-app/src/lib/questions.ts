import {
  Question,
  CreateQuestionRequest,
  CreateQuestionResult,
  UpdateQuestionRequest,
  UpdateQuestionResult,
  GetQuestionsQuery,
  GetQuestionsResult,
  QuestionStatus,
  QuestionPriority
} from '../types/question'
import { getCosmosService } from './cosmos'
import { AppError, ErrorCode } from './errors'

interface ValidationResult {
  valid: boolean
  errors: string[]
}

const QUESTION_LIMITS = {
  TITLE_MAX_LENGTH: 100,
  CONTENT_MAX_LENGTH: 10000,
  MAX_ATTACHMENTS: 5,
  MAX_ATTACHMENT_SIZE: 1024 * 1024 * 1024 // 1GB
} as const

export function validateQuestionData(data: CreateQuestionRequest): ValidationResult {
  const errors: string[] = []

  // Title validation
  if (!data.title || typeof data.title !== 'string' || data.title.trim() === '') {
    errors.push('Title is required')
  } else if (data.title.length > QUESTION_LIMITS.TITLE_MAX_LENGTH) {
    errors.push(`Title must be ${QUESTION_LIMITS.TITLE_MAX_LENGTH} characters or less`)
  }

  // Content validation
  if (!data.content || typeof data.content !== 'string' || data.content.trim() === '') {
    errors.push('Content is required')
  } else if (data.content.length > QUESTION_LIMITS.CONTENT_MAX_LENGTH) {
    errors.push(`Content must be ${QUESTION_LIMITS.CONTENT_MAX_LENGTH} characters or less`)
  }

  // Priority validation
  if (!Object.values(QuestionPriority).includes(data.priority)) {
    errors.push('Invalid priority value')
  }

  // Attachments validation
  if (data.attachments) {
    if (data.attachments.length > QUESTION_LIMITS.MAX_ATTACHMENTS) {
      errors.push(`Maximum ${QUESTION_LIMITS.MAX_ATTACHMENTS} attachments allowed`)
    }

    for (const file of data.attachments) {
      if (file.size > QUESTION_LIMITS.MAX_ATTACHMENT_SIZE) {
        errors.push(`File "${file.name}" exceeds maximum size of 1GB`)
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

export async function createQuestion(
  data: CreateQuestionRequest,
  authorId: string,
  groupId: string
): Promise<CreateQuestionResult> {
  try {
    // Input validation
    if (!authorId || typeof authorId !== 'string') {
      return {
        success: false,
        error: 'Valid author ID is required'
      }
    }

    if (!groupId || typeof groupId !== 'string') {
      return {
        success: false,
        error: 'Valid group ID is required'
      }
    }

    const validation = validateQuestionData(data)
    if (!validation.valid) {
      return {
        success: false,
        error: `Invalid question data: ${validation.errors.join(', ')}`
      }
    }

    const cosmosService = getCosmosService()

    // Create a new question
    const question: Question = {
      id: `question-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: data.title.trim(),
      content: data.content.trim(),
      authorId,
      groupId,
      status: QuestionStatus.UNANSWERED,
      priority: data.priority,
      tags: [], // TODO: AI auto-tagging
      attachments: data.attachments?.map(file => ({
        fileName: file.name,
        fileSize: file.size,
        blobUrl: `mock://blob/${Date.now()}_${file.name}`,
        contentType: file.type
      })) || [],
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const createdQuestion = await cosmosService.createItem<Question>('questions', question)

    return {
      success: true,
      question: createdQuestion
    }
  } catch (error) {
    console.error('Error creating question:', error)
    if (error instanceof AppError) {
      return {
        success: false,
        error: error.message
      }
    }
    return {
      success: false,
      error: 'Internal server error while creating question'
    }
  }
}

export async function updateQuestion(
  questionId: string,
  data: UpdateQuestionRequest,
  groupId: string
): Promise<UpdateQuestionResult> {
  try {
    const cosmosService = getCosmosService()

    // Get existing question
    const existingQuestion = await cosmosService.getItem<Question>('questions', questionId, groupId)
    if (!existingQuestion) {
      return {
        success: false,
        error: 'Question not found'
      }
    }

    // Update question
    const updatedQuestion: Question = {
      ...existingQuestion,
      ...(data.title && { title: data.title.trim() }),
      ...(data.content && { content: data.content.trim() }),
      ...(data.status && { status: data.status }),
      ...(data.priority && { priority: data.priority }),
      updatedAt: new Date(),
      ...(data.status === QuestionStatus.RESOLVED && { resolvedAt: new Date() })
    }

    const result = await cosmosService.updateItem('questions', questionId, updatedQuestion, groupId)

    return {
      success: true,
      question: result
    }
  } catch (error) {
    console.error('Error updating question:', error)
    if (error instanceof AppError) {
      return {
        success: false,
        error: error.message
      }
    }
    return {
      success: false,
      error: 'Failed to update question'
    }
  }
}

export async function getQuestion(questionId: string, groupId?: string): Promise<{ success: boolean; question?: Question; error?: string }> {
  try {
    const cosmosService = getCosmosService()

    const question = await cosmosService.getItem<Question>('questions', questionId, groupId)
    if (!question) {
      return {
        success: false,
        error: 'Question not found'
      }
    }

    return {
      success: true,
      question
    }
  } catch (error) {
    console.error('Error getting question:', error)
    if (error instanceof AppError) {
      return {
        success: false,
        error: error.message
      }
    }
    return {
      success: false,
      error: 'Failed to get question'
    }
  }
}

export async function getQuestions(query: GetQuestionsQuery): Promise<GetQuestionsResult> {
  try {
    const cosmosService = getCosmosService()
    
    // Build query
    let sqlQuery = 'SELECT * FROM c WHERE c.groupId = @groupId'
    const parameters: any[] = [{ name: '@groupId', value: query.groupId }]

    // Add status filter
    if (query.status) {
      sqlQuery += ' AND c.status = @status'
      parameters.push({ name: '@status', value: query.status })
    }

    // Add priority filter
    if (query.priority) {
      sqlQuery += ' AND c.priority = @priority'
      parameters.push({ name: '@priority', value: query.priority })
    }

    // Add author filter
    if (query.authorId) {
      sqlQuery += ' AND c.authorId = @authorId'
      parameters.push({ name: '@authorId', value: query.authorId })
    }

    // Add search filter
    if (query.search) {
      sqlQuery += ' AND (CONTAINS(LOWER(c.title), LOWER(@search)) OR CONTAINS(LOWER(c.content), LOWER(@search)) OR ARRAY_CONTAINS(c.tags, @search, true))'
      parameters.push({ name: '@search', value: query.search })
    }

    // Add date range filter
    if (query.startDate) {
      sqlQuery += ' AND c.createdAt >= @startDate'
      parameters.push({ name: '@startDate', value: query.startDate.toISOString() })
    }

    if (query.endDate) {
      sqlQuery += ' AND c.createdAt <= @endDate'
      parameters.push({ name: '@endDate', value: query.endDate.toISOString() })
    }

    // Add sorting
    const sortField = query.sortBy || 'createdAt'
    const sortOrder = query.sortOrder || 'desc'
    sqlQuery += ` ORDER BY c.${sortField} ${sortOrder.toUpperCase()}`

    // Use pagination if specified
    const page = query.page || 1
    const limit = query.limit || 20

    if (page && limit) {
      const result = await cosmosService.queryItemsWithPagination<Question>(
        'questions',
        sqlQuery,
        parameters,
        query.continuationToken,
        limit
      )

      return {
        success: true,
        questions: result.items,
        total: result.items.length, // Note: Cosmos DB doesn't provide total count easily
        page,
        continuationToken: result.continuationToken
      }
    } else {
      // Get all items without pagination
      const questions = await cosmosService.queryItems<Question>('questions', sqlQuery, parameters)

      return {
        success: true,
        questions,
        total: questions.length,
        page: 1
      }
    }
  } catch (error) {
    console.error('Error getting questions:', error)
    if (error instanceof AppError) {
      return {
        success: false,
        error: error.message
      }
    }
    return {
      success: false,
      error: 'Failed to get questions'
    }
  }
}

export async function deleteQuestion(questionId: string, groupId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const cosmosService = getCosmosService()

    // Check if question exists
    const existingQuestion = await cosmosService.getItem<Question>('questions', questionId, groupId)
    if (!existingQuestion) {
      return {
        success: false,
        error: 'Question not found'
      }
    }

    // Delete the question
    await cosmosService.deleteItem('questions', questionId, groupId)

    return {
      success: true
    }
  } catch (error) {
    console.error('Error deleting question:', error)
    if (error instanceof AppError) {
      return {
        success: false,
        error: error.message
      }
    }
    return {
      success: false,
      error: 'Failed to delete question'
    }
  }
}