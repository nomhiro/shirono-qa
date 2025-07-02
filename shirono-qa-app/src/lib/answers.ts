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
import { isAppError } from './errors'

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
      attachments: [], // ファイルアップロードは別途専用APIで処理
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
    if (isAppError(error)) {
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

export async function getAnswerById(answerId: string): Promise<{ success: boolean; answer?: Answer; error?: string }> {
  try {
    const cosmosService = getCosmosService()

    const query = 'SELECT * FROM c WHERE c.id = @id'
    const parameters = [{ name: '@id', value: answerId }]
    const answers = await cosmosService.queryItems<Answer>('answers', query, parameters)

    if (!answers || answers.length === 0) {
      return {
        success: false,
        error: 'Answer not found'
      }
    }

    return {
      success: true,
      answer: answers[0]
    }
  } catch (error) {
    console.error('Error getting answer by ID:', error)
    return {
      success: false,
      error: 'Failed to get answer'
    }
  }
}

export async function updateAnswer(
  answerId: string,
  data: UpdateAnswerRequest
): Promise<UpdateAnswerResult> {
  try {
    const cosmosService = getCosmosService()

    // Get existing answer
    const query = 'SELECT * FROM c WHERE c.id = @id'
    const parameters = [{ name: '@id', value: answerId }]
    const existingAnswers = await cosmosService.queryItems<Answer>('answers', query, parameters)

    if (!existingAnswers || existingAnswers.length === 0) {
      return {
        success: false,
        error: 'Answer not found'
      }
    }

    const existingAnswer = existingAnswers[0]

    // Update answer
    const updatedAnswer: Answer = {
      ...existingAnswer,
      content: data.content || existingAnswer.content,
      ...(data.attachments !== undefined && { attachments: data.attachments }),
      updatedAt: new Date()
    }

    const result = await cosmosService.updateItem('answers', answerId, updatedAnswer, existingAnswer.questionId)

    return {
      success: true,
      answer: result
    }
  } catch (error) {
    console.error('Error updating answer:', error)
    if (isAppError(error)) {
      return {
        success: false,
        error: error.message
      }
    }
    return {
      success: false,
      error: 'Failed to update answer'
    }
  }
}

export async function deleteAnswer(answerId: string): Promise<DeleteAnswerResult> {
  try {
    const cosmosService = getCosmosService()

    // Get existing answer to find questionId (partition key)
    const query = 'SELECT * FROM c WHERE c.id = @id'
    const parameters = [{ name: '@id', value: answerId }]
    const existingAnswers = await cosmosService.queryItems<Answer>('answers', query, parameters)

    if (!existingAnswers || existingAnswers.length === 0) {
      return {
        success: false,
        error: 'Answer not found'
      }
    }

    const existingAnswer = existingAnswers[0]

    // Delete answer from Cosmos DB
    await cosmosService.deleteItem('answers', answerId, existingAnswer.questionId)

    return {
      success: true
    }
  } catch (error) {
    console.error('Error deleting answer:', error)
    if (isAppError(error)) {
      return {
        success: false,
        error: error.message
      }
    }
    return {
      success: false,
      error: 'Failed to delete answer'
    }
  }
}

export async function getAnswersByQuestion(questionId: string): Promise<GetAnswersResult> {
  try {
    if (!questionId || typeof questionId !== 'string') {
      return {
        success: false,
        error: 'Valid question ID is required'
      }
    }

    const cosmosService = getCosmosService()

    // Cosmos DBから実際の回答を取得（投稿順）
    const query = 'SELECT * FROM c WHERE c.questionId = @questionId ORDER BY c.createdAt ASC'
    const parameters = [{ name: '@questionId', value: questionId }]

    const answers = await cosmosService.queryItems<Answer>('answers', query, parameters)

    return {
      success: true,
      answers
    }
  } catch (error) {
    console.error('Failed to get answers by question:', error)
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

    const cosmosService = getCosmosService()

    // Create new comment
    const comment: Comment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      questionId,
      answerId: data.answerId,
      content: data.content.trim(),
      authorId,
      attachments: [], // ファイルアップロードは別途専用APIで処理
      createdAt: new Date()
    }

    const createdComment = await cosmosService.createItem<Comment>('comments', comment)

    return {
      success: true,
      comment: createdComment
    }
  } catch (error) {
    console.error('Error creating comment:', error)
    return {
      success: false,
      error: 'Internal server error while creating comment'
    }
  }
}

export async function getCommentById(commentId: string): Promise<{ success: boolean; comment?: Comment; error?: string }> {
  try {
    const cosmosService = getCosmosService()

    const query = 'SELECT * FROM c WHERE c.id = @id'
    const parameters = [{ name: '@id', value: commentId }]
    const comments = await cosmosService.queryItems<Comment>('comments', query, parameters)

    if (!comments || comments.length === 0) {
      return {
        success: false,
        error: 'Comment not found'
      }
    }

    return {
      success: true,
      comment: comments[0]
    }
  } catch (error) {
    console.error('Error getting comment by ID:', error)
    return {
      success: false,
      error: 'Failed to get comment'
    }
  }
}

export async function updateComment(
  commentId: string,
  data: { content?: string; attachments?: unknown[] }
): Promise<{ success: boolean; comment?: Comment; error?: string }> {
  try {
    const cosmosService = getCosmosService()

    // Get existing comment
    const query = 'SELECT * FROM c WHERE c.id = @id'
    const parameters = [{ name: '@id', value: commentId }]
    const existingComments = await cosmosService.queryItems<Comment>('comments', query, parameters)

    if (!existingComments || existingComments.length === 0) {
      return {
        success: false,
        error: 'Comment not found'
      }
    }

    const existingComment = existingComments[0]

    // Update comment
    const updatedComment: Comment = {
      ...existingComment,
      content: data.content || existingComment.content,
      ...(data.attachments !== undefined && { attachments: data.attachments }),
      updatedAt: new Date()
    }

    const result = await cosmosService.updateItem('comments', commentId, updatedComment, existingComment.questionId)

    return {
      success: true,
      comment: result
    }
  } catch (error) {
    console.error('Error updating comment:', error)
    if (isAppError(error)) {
      return {
        success: false,
        error: error.message
      }
    }
    return {
      success: false,
      error: 'Failed to update comment'
    }
  }
}

export async function deleteComment(commentId: string): Promise<DeleteCommentResult> {
  try {
    const cosmosService = getCosmosService()

    // Get existing comment to find questionId (partition key)
    const query = 'SELECT * FROM c WHERE c.id = @id'
    const parameters = [{ name: '@id', value: commentId }]
    const existingComments = await cosmosService.queryItems<Comment>('comments', query, parameters)

    if (!existingComments || existingComments.length === 0) {
      return {
        success: false,
        error: 'Comment not found'
      }
    }

    const existingComment = existingComments[0]

    // Delete comment from Cosmos DB
    await cosmosService.deleteItem('comments', commentId, existingComment.questionId)

    return {
      success: true
    }
  } catch (error) {
    console.error('Error deleting comment:', error)
    if (isAppError(error)) {
      return {
        success: false,
        error: error.message
      }
    }
    return {
      success: false,
      error: 'Failed to delete comment'
    }
  }
}

export async function getCommentsByQuestion(questionId: string): Promise<GetCommentsResult> {
  try {
    if (!questionId || typeof questionId !== 'string') {
      return {
        success: false,
        error: 'Valid question ID is required'
      }
    }

    const cosmosService = getCosmosService()

    // Cosmos DBから実際のコメントを取得（投稿順）
    const query = 'SELECT * FROM c WHERE c.questionId = @questionId ORDER BY c.createdAt ASC'
    const parameters = [{ name: '@questionId', value: questionId }]

    const comments = await cosmosService.queryItems<Comment>('comments', query, parameters)

    return {
      success: true,
      comments
    }
  } catch (error) {
    console.error('Failed to get comments by question:', error)
    return {
      success: false,
      error: 'Failed to get comments'
    }
  }
}

export async function getCommentsByAnswer(answerId: string): Promise<GetCommentsResult> {
  try {
    if (!answerId || typeof answerId !== 'string') {
      return {
        success: false,
        error: 'Valid answer ID is required'
      }
    }

    const cosmosService = getCosmosService()

    // Cosmos DBから実際のコメントを取得（answerId で絞り込み、投稿順）
    const query = 'SELECT * FROM c WHERE c.answerId = @answerId ORDER BY c.createdAt ASC'
    const parameters = [{ name: '@answerId', value: answerId }]

    console.log('Querying comments for answer:', answerId)
    const comments = await cosmosService.queryItems<Comment>('comments', query, parameters)

    return {
      success: true,
      comments
    }
  } catch (error) {
    console.error('Failed to get comments by answer:', error)
    return {
      success: false,
      error: 'Failed to get comments'
    }
  }
}