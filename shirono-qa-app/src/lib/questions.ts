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
import { isAppError } from './errors'
import { getAnswersByQuestion, getCommentsByQuestion } from './answers'
import { getBlobStorageService /* , isBlobStorageEnabled */ } from './blob-storage'

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
      attachments: [], // ファイルアップロードは別途専用APIで処理
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
    if (isAppError(error)) {
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
  data: UpdateQuestionRequest
): Promise<UpdateQuestionResult> {
  try {
    const cosmosService = getCosmosService()

    // Get existing question
    const getResult = await getQuestion(questionId)
    if (!getResult.success || !getResult.question) {
      return {
        success: false,
        error: 'Question not found'
      }
    }

    const existingQuestion = getResult.question

    // Update question
    const updatedQuestion: Question = {
      ...existingQuestion,
      ...(data.title && { title: data.title.trim() }),
      ...(data.content && { content: data.content.trim() }),
      ...(data.status && { status: data.status }),
      ...(data.priority && { priority: data.priority }),
      ...(data.attachments !== undefined && { attachments: data.attachments }),
      updatedAt: new Date(),
      ...(data.status === QuestionStatus.RESOLVED && { resolvedAt: new Date() })
    }

    const result = await cosmosService.updateItem('questions', questionId, updatedQuestion, existingQuestion.groupId)

    return {
      success: true,
      question: result
    }
  } catch (error) {
    console.error('Error updating question:', error)
    if (isAppError(error)) {
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

export async function getQuestion(questionId: string): Promise<{ success: boolean; question?: Question; error?: string }> {
  try {
    const cosmosService = getCosmosService()

    // groupIdなしで検索（複数パーティション検索）
    const sqlQuery = 'SELECT * FROM c WHERE c.id = @id'
    const parameters = [{ name: '@id', value: questionId }]

    const questions = await cosmosService.queryItems<Question>('questions', sqlQuery, parameters)

    if (!questions || questions.length === 0) {
      return {
        success: false,
        error: 'Question not found'
      }
    }

    return {
      success: true,
      question: questions[0]
    }
  } catch (error) {
    console.error('Error getting question:', error)
    if (isAppError(error)) {
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
    let sqlQuery = 'SELECT * FROM c'
    const parameters: { name: string; value: unknown }[] = []

    // GroupIdフィルタを追加（管理者でない場合のみ）
    if (query.groupId) {
      sqlQuery += ' WHERE c.groupId = @groupId'
      parameters.push({ name: '@groupId', value: query.groupId })
    } else {
      // 管理者の場合は全ての質問を取得
      sqlQuery += ' WHERE 1=1'  // WHERE句を開始するためのダミー条件
    }

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
        questions: result.items || [],
        total: result.items?.length || 0, // Note: Cosmos DB doesn't provide total count easily
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
    if (isAppError(error)) {
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

export async function updateQuestionTimestamp(questionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const cosmosService = getCosmosService()

    // Get existing question
    const getResult = await getQuestion(questionId)
    if (!getResult.success || !getResult.question) {
      return {
        success: false,
        error: 'Question not found'
      }
    }

    const existingQuestion = getResult.question

    // Update only the updatedAt timestamp
    const updatedQuestion: Question = {
      ...existingQuestion,
      updatedAt: new Date()
    }

    await cosmosService.updateItem('questions', questionId, updatedQuestion, existingQuestion.groupId)

    return {
      success: true
    }
  } catch (error) {
    console.error('Error updating question timestamp:', error)
    if (isAppError(error)) {
      return {
        success: false,
        error: error.message
      }
    }
    return {
      success: false,
      error: 'Failed to update question timestamp'
    }
  }
}

async function collectAttachmentUrls(questionId: string): Promise<string[]> {
  const attachmentUrls: string[] = []

  try {
    // 質問の添付ファイル取得
    const questionResult = await getQuestion(questionId)
    if (questionResult.success && questionResult.question?.attachments) {
      questionResult.question.attachments.forEach(attachment => {
        if (attachment.blobUrl) {
          attachmentUrls.push(attachment.blobUrl)
        }
      })
    }

    // 回答の添付ファイル取得
    const answersResult = await getAnswersByQuestion(questionId)
    if (answersResult.success && answersResult.answers) {
      answersResult.answers.forEach(answer => {
        if (answer.attachments) {
          answer.attachments.forEach(attachment => {
            if (attachment.blobUrl) {
              attachmentUrls.push(attachment.blobUrl)
            }
          })
        }
      })
    }

    // コメントの添付ファイル取得
    const commentsResult = await getCommentsByQuestion(questionId)
    if (commentsResult.success && commentsResult.comments) {
      commentsResult.comments.forEach(comment => {
        if (comment.attachments) {
          comment.attachments.forEach(attachment => {
            if (attachment.blobUrl) {
              attachmentUrls.push(attachment.blobUrl)
            }
          })
        }
      })
    }
  } catch (error) {
    console.error('Error collecting attachment URLs:', error)
  }

  return attachmentUrls
}

async function deleteBlobFiles(attachmentUrls: string[]): Promise<void> {
  if (attachmentUrls.length === 0) {
    return
  }

  console.log(`Deleting ${attachmentUrls.length} blob files...`)

  // Blob Storage設定の確認
  try {
    getBlobStorageService()
    // Blob Serviceが利用可能かテスト
  } catch (error) {
    console.warn('Blob Storage not configured, skipping file deletion:', error)
    return
  }

  // 実際のBlob Storage削除
  try {
    const blobService = getBlobStorageService()
    const result = await blobService.deleteFilesByUrls(attachmentUrls)

    console.log(`Blob deletion completed: ${result.success} successful, ${result.failed.length} failed`)

    if (result.failed.length > 0) {
      console.warn('Failed to delete some blob files:', result.failed)
    }
  } catch (error) {
    console.error('Error during blob files deletion:', error)
    // Blob削除のエラーは質問削除の失敗とはしない
  }
}

export async function deleteQuestionWithRelatedData(questionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const cosmosService = getCosmosService()

    // 質問の存在確認
    const getResult = await getQuestion(questionId)
    if (!getResult.success || !getResult.question) {
      return {
        success: false,
        error: 'Question not found'
      }
    }

    const existingQuestion = getResult.question

    console.log(`Deleting question ${questionId} and all related data...`)

    // 1. 添付ファイルのURL収集
    const attachmentUrls = await collectAttachmentUrls(questionId)
    console.log(`Found ${attachmentUrls.length} attachment files to delete`)

    // 2. 関連するコメントを削除
    try {
      const commentsResult = await getCommentsByQuestion(questionId)
      if (commentsResult.success && commentsResult.comments) {
        console.log(`Deleting ${commentsResult.comments.length} comments...`)
        for (const comment of commentsResult.comments) {
          await cosmosService.deleteItem('comments', comment.id, questionId)
        }
      }
    } catch (error) {
      console.error('Error deleting comments:', error)
      // コメント削除に失敗しても処理続行
    }

    // 3. 関連する回答を削除
    try {
      const answersResult = await getAnswersByQuestion(questionId)
      if (answersResult.success && answersResult.answers) {
        console.log(`Deleting ${answersResult.answers.length} answers...`)
        for (const answer of answersResult.answers) {
          await cosmosService.deleteItem('answers', answer.id, questionId)
        }
      }
    } catch (error) {
      console.error('Error deleting answers:', error)
      // 回答削除に失敗しても処理続行
    }

    // 4. 質問本体を削除
    await cosmosService.deleteItem('questions', questionId, existingQuestion.groupId)
    console.log('Question deleted successfully')

    // 5. 添付ファイルを削除（非同期で実行、エラーが発生しても全体の削除処理は成功とする）
    if (attachmentUrls.length > 0) {
      deleteBlobFiles(attachmentUrls).catch(error => {
        console.error('Failed to delete some blob files:', error)
      })
    }

    return {
      success: true
    }
  } catch (error) {
    console.error('Error deleting question with related data:', error)
    if (isAppError(error)) {
      return {
        success: false,
        error: error.message
      }
    }
    return {
      success: false,
      error: 'Failed to delete question and related data'
    }
  }
}

export async function deleteQuestion(questionId: string): Promise<{ success: boolean; error?: string }> {
  // 後方互換性のため、包括的削除関数を呼び出し
  return await deleteQuestionWithRelatedData(questionId)
}