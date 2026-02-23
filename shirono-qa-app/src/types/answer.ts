import { Attachment } from './question'

export interface Answer {
  id: string
  questionId: string
  content: string
  authorId: string
  attachments: Attachment[]
  createdAt: Date
  updatedAt: Date
}

export interface Comment {
  id: string
  questionId: string
  answerId?: string  // Optional: if commenting on an answer
  content: string
  authorId: string
  attachments: Attachment[]
  createdAt: Date
  updatedAt?: Date
}

export interface CreateAnswerRequest {
  content: string
  attachments?: File[]
}

export interface CreateAnswerResult {
  success: boolean
  answer?: Answer
  error?: string
}

export interface UpdateAnswerRequest {
  content?: string
  attachments?: Attachment[]
}

export interface UpdateAnswerResult {
  success: boolean
  answer?: Answer
  error?: string
}

export interface CreateCommentRequest {
  content: string
  answerId?: string  // Optional: if commenting on an answer vs question
  attachments?: File[]
}

export interface CreateCommentResult {
  success: boolean
  comment?: Comment
  error?: string
}

export interface GetAnswersResult {
  success: boolean
  answers?: Answer[]
  error?: string
}

export interface GetCommentsResult {
  success: boolean
  comments?: Comment[]
  error?: string
}

export interface DeleteAnswerResult {
  success: boolean
  error?: string
}

export interface DeleteCommentResult {
  success: boolean
  error?: string
}