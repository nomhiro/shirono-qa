export interface Question {
  id: string
  title: string
  content: string
  authorId: string
  groupId: string
  status: QuestionStatus
  priority: QuestionPriority
  tags: string[]
  attachments: Attachment[]
  createdAt: Date
  updatedAt: Date
  resolvedAt?: Date
}

export interface Answer {
  id: string
  questionId: string
  content: string
  authorId: string
  attachments: Attachment[]
  createdAt: Date
}

export interface Comment {
  id: string
  questionId: string
  answerId?: string
  content: string
  authorId: string
  attachments: Attachment[]
  createdAt: Date
}

export interface Attachment {
  fileName: string
  fileSize: number
  blobUrl: string
  contentType: string
}

export enum QuestionStatus {
  UNANSWERED = 'unanswered',
  ANSWERED = 'answered',
  RESOLVED = 'resolved',
  REJECTED = 'rejected',
  CLOSED = 'closed'
}

export enum QuestionPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export interface CreateQuestionRequest {
  title: string
  content: string
  priority: QuestionPriority
  attachments?: File[]
}

export interface CreateQuestionResult {
  success: boolean
  question?: Question
  error?: string
}

export interface UpdateQuestionRequest {
  title?: string
  content?: string
  priority?: QuestionPriority
  status?: QuestionStatus
  attachments?: Attachment[]
}

export interface UpdateQuestionResult {
  success: boolean
  question?: Question
  error?: string
}

export interface GetQuestionsQuery {
  page?: number
  limit?: number
  status?: QuestionStatus
  priority?: QuestionPriority
  authorId?: string
  groupId?: string
  search?: string
}

export interface GetQuestionsResult {
  success: boolean
  questions?: Question[]
  total?: number
  page?: number
  error?: string
}