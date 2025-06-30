import {
  Answer,
  Comment,
  CreateAnswerRequest,
  CreateAnswerResult,
  UpdateAnswerRequest,
  UpdateAnswerResult,
  CreateCommentRequest,
  CreateCommentResult,
  GetAnswersResult,
  GetCommentsResult,
  DeleteAnswerResult,
  DeleteCommentResult
} from '../types/answer'
import { 
  createValidator, 
  validateFiles, 
  VALIDATION_LIMITS, 
  ALLOWED_FILE_TYPES 
} from './validation'
import { getCosmosService } from './cosmos'
import { AppError, ErrorCode } from './errors'

export function validateAnswerData(data: CreateAnswerRequest) {
  const contentValidation = createValidator<string>()
    .required('Content is required')
    .maxLength(VALIDATION_LIMITS.ANSWER_CONTENT_MAX)
    .validate(data.content)

  if (!contentValidation.valid) {
    return contentValidation
  }

  if (data.attachments && data.attachments.length > 0) {
    const fileValidation = validateFiles(data.attachments, {
      maxCount: VALIDATION_LIMITS.MAX_ATTACHMENTS,
      maxSize: VALIDATION_LIMITS.MAX_FILE_SIZE,
      allowedTypes: [...ALLOWED_FILE_TYPES]
    })

    if (!fileValidation.valid) {
      return fileValidation
    }
  }

  return { valid: true, errors: [] }
}

export function validateCommentData(data: CreateCommentRequest) {
  const contentValidation = createValidator<string>()
    .required('Content is required')
    .maxLength(VALIDATION_LIMITS.COMMENT_CONTENT_MAX)
    .validate(data.content)

  if (!contentValidation.valid) {
    return contentValidation
  }

  if (data.attachments && data.attachments.length > 0) {
    const fileValidation = validateFiles(data.attachments, {
      maxCount: VALIDATION_LIMITS.MAX_ATTACHMENTS,
      maxSize: VALIDATION_LIMITS.MAX_FILE_SIZE,
      allowedTypes: [...ALLOWED_FILE_TYPES]
    })

    if (!fileValidation.valid) {
      return fileValidation
    }
  }

  return { valid: true, errors: [] }
}

export async function createAnswer(
  data: CreateAnswerRequest,
  questionId: string,
  authorId: string
): Promise<CreateAnswerResult> {
  try {
    // Input validation
    if (!questionId || typeof questionId !== 'string') {
      return {
        success: false,
        error: 'Valid question ID is required'
      }
    }

    if (!authorId || typeof authorId !== 'string') {
      return {
        success: false,
        error: 'Valid author ID is required'
      }
    }

    const validation = validateAnswerData(data)
    if (!validation.valid) {
      return {
        success: false,
        error: `Invalid answer data: ${validation.errors.join(', ')}`
      }
    }

    const cosmosService = getCosmosService()

    // Create new answer
    const answer: Answer = {
      id: `answer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      questionId,
      content: data.content.trim(),
      authorId,
      attachments: data.attachments?.map(file => ({
        fileName: file.name,
        fileSize: file.size,
        blobUrl: `mock://blob/${Date.now()}_${file.name}`,
        contentType: file.type
      })) || [],
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const createdAnswer = await cosmosService.createItem<Answer>('answers', answer)

    return {
      success: true,
      answer: createdAnswer
    }
  } catch (error) {
    console.error('Error creating answer:', error)
    if (error instanceof AppError) {
      return {
        success: false,
        error: error.message
      }
    }
    return {
      success: false,
      error: 'Internal server error while creating answer'
    }
  }
}

export async function updateAnswer(
  answerId: string,
  data: UpdateAnswerRequest
): Promise<UpdateAnswerResult> {
  try {
    // Mock implementation - check if answer exists
    if (answerId === 'nonexistent') {
      return {
        success: false,
        error: 'Answer not found'
      }
    }

    // Mock updated answer
    const answer: Answer = {
      id: answerId,
      questionId: 'question123',
      content: data.content || 'Mock answer content',
      authorId: 'user123',
      attachments: [],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date()
    }

    return {
      success: true,
      answer
    }
  } catch (error) {
    return {
      success: false,
      error: 'Failed to update answer'
    }
  }
}

export async function deleteAnswer(answerId: string): Promise<DeleteAnswerResult> {
  try {
    if (answerId === 'nonexistent') {
      return {
        success: false,
        error: 'Answer not found'
      }
    }

    return {
      success: true
    }
  } catch (error) {
    return {
      success: false,
      error: 'Failed to delete answer'
    }
  }
}

export async function getAnswersByQuestion(questionId: string): Promise<GetAnswersResult> {
  try {
    if (questionId === 'no-answers-question') {
      return {
        success: true,
        answers: []
      }
    }

    // Mock answers
    const answers: Answer[] = [
      {
        id: 'answer1',
        questionId,
        content: 'This is the first answer',
        authorId: 'user1',
        attachments: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      },
      {
        id: 'answer2',
        questionId,
        content: 'This is the second answer',
        authorId: 'user2',
        attachments: [],
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02')
      }
    ]

    return {
      success: true,
      answers
    }
  } catch (error) {
    return {
      success: false,
      error: 'Failed to get answers'
    }
  }
}

export async function createComment(
  data: CreateCommentRequest,
  questionId: string,
  authorId: string
): Promise<CreateCommentResult> {
  try {
    // Input validation
    if (!questionId || typeof questionId !== 'string') {
      return {
        success: false,
        error: 'Valid question ID is required'
      }
    }

    if (!authorId || typeof authorId !== 'string') {
      return {
        success: false,
        error: 'Valid author ID is required'
      }
    }

    const validation = validateCommentData(data)
    if (!validation.valid) {
      return {
        success: false,
        error: `Invalid comment data: ${validation.errors.join(', ')}`
      }
    }

    // Mock implementation - create new comment
    const comment: Comment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      questionId,
      answerId: data.answerId,
      content: data.content.trim(),
      authorId,
      attachments: data.attachments?.map(file => ({
        fileName: file.name,
        fileSize: file.size,
        blobUrl: `mock://blob/${Date.now()}_${file.name}`,
        contentType: file.type
      })) || [],
      createdAt: new Date()
    }

    return {
      success: true,
      comment
    }
  } catch (error) {
    console.error('Error creating comment:', error)
    return {
      success: false,
      error: 'Internal server error while creating comment'
    }
  }
}

export async function deleteComment(commentId: string): Promise<DeleteCommentResult> {
  try {
    if (commentId === 'nonexistent') {
      return {
        success: false,
        error: 'Comment not found'
      }
    }

    return {
      success: true
    }
  } catch (error) {
    return {
      success: false,
      error: 'Failed to delete comment'
    }
  }
}

export async function getCommentsByQuestion(questionId: string): Promise<GetCommentsResult> {
  try {
    // Mock comments for question
    const comments: Comment[] = [
      {
        id: 'comment1',
        questionId,
        content: 'This is a comment on the question',
        authorId: 'user1',
        attachments: [],
        createdAt: new Date('2024-01-01')
      }
    ]

    return {
      success: true,
      comments
    }
  } catch (error) {
    return {
      success: false,
      error: 'Failed to get comments'
    }
  }
}

export async function getCommentsByAnswer(answerId: string): Promise<GetCommentsResult> {
  try {
    // Mock comments for answer
    const comments: Comment[] = [
      {
        id: 'comment2',
        questionId: 'question123',
        answerId,
        content: 'This is a comment on the answer',
        authorId: 'user2',
        attachments: [],
        createdAt: new Date('2024-01-01')
      }
    ]

    return {
      success: true,
      comments
    }
  } catch (error) {
    return {
      success: false,
      error: 'Failed to get comments'
    }
  }
}