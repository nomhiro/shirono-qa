import { sendNotificationEmail, EmailType } from '../email'
import { QuestionStatus, QuestionPriority } from '@/types/question'

// nodemailerをモック
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn(),
    verify: jest.fn()
  }))
}))

import nodemailer from 'nodemailer'

const mockSendMail = jest.fn()
const mockVerify = jest.fn()
const mockCreateTransport = nodemailer.createTransport as jest.MockedFunction<typeof nodemailer.createTransport>

describe('Email Notification Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // SMTPトランスポーターのモック設定
    mockCreateTransport.mockReturnValue({
      sendMail: mockSendMail,
      verify: mockVerify
    } as any)
    
    // verify は常に成功とする
    mockVerify.mockResolvedValue(true)
    
    // 環境変数をモック
    process.env.SMTP_HOST = 'smtp.gmail.com'
    process.env.SMTP_PORT = '587'
    process.env.SMTP_USER = 'nomhiro1204@gmail.com'
    process.env.SMTP_PASSWORD = 'test-app-password'
  })

  afterEach(() => {
    // 環境変数をクリア
    delete process.env.SMTP_HOST
    delete process.env.SMTP_PORT
    delete process.env.SMTP_USER
    delete process.env.SMTP_PASSWORD
  })

  describe('質問投稿通知', () => {
    it('管理者に質問投稿通知メールを送信する', async () => {
      const mockQuestion = {
        id: 'question-1',
        title: 'Azure Functions の設定について',
        content: 'Azure Functions の環境変数設定方法を教えてください',
        authorId: 'user-1',
        groupId: 'group-1',
        priority: QuestionPriority.MEDIUM,
        status: QuestionStatus.UNANSWERED,
        tags: ['Azure', 'Functions'],
        attachments: [],
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15')
      }

      const mockAuthor = {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        groupId: 'group-1',
        isAdmin: false,
        createdAt: new Date(),
        lastLoginAt: null
      }

      const mockAdmin = {
        id: 'admin-1',
        username: 'admin',
        email: 'admin@example.com',
        groupId: 'group-admin',
        isAdmin: true,
        createdAt: new Date(),
        lastLoginAt: null
      }

      mockSendMail.mockResolvedValue({ messageId: 'test-message-id' })

      const result = await sendNotificationEmail(
        EmailType.QUESTION_POSTED,
        mockAdmin.email,
        {
          question: mockQuestion,
          author: mockAuthor,
          recipient: mockAdmin
        }
      )

      expect(result.success).toBe(true)
      expect(mockSendMail).toHaveBeenCalledWith({
        from: 'nomhiro1204@gmail.com',
        to: 'admin@example.com',
        subject: '[QAサイト] 新しい質問が投稿されました',
        html: expect.stringContaining('Azure Functions の設定について'),
        text: expect.stringContaining('Azure Functions の設定について')
      })
    })

    it('添付ファイル付きの質問投稿通知を送信する', async () => {
      const mockQuestion = {
        id: 'question-2',
        title: 'エラーログの確認',
        content: 'こちらのエラーについて調べてください',
        authorId: 'user-1',
        groupId: 'group-1',
        priority: QuestionPriority.HIGH,
        status: QuestionStatus.UNANSWERED,
        tags: ['Error', 'Debug'],
        attachments: [
          { fileName: 'error.log', fileSize: 1024, blobUrl: 'https://blob.storage/error.log', contentType: 'application/octet-stream' },
          { fileName: 'screenshot.png', fileSize: 2048, blobUrl: 'https://blob.storage/screenshot.png', contentType: 'application/octet-stream' }
        ],
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15')
      }

      const mockAuthor = {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        groupId: 'group-1',
        isAdmin: false,
        createdAt: new Date(),
        lastLoginAt: null
      }

      const mockAdmin = {
        id: 'admin-1',
        username: 'admin',
        email: 'admin@example.com',
        groupId: 'group-admin',
        isAdmin: true,
        createdAt: new Date(),
        lastLoginAt: null
      }

      mockSendMail.mockResolvedValue({ messageId: 'test-message-id' })

      const result = await sendNotificationEmail(
        EmailType.QUESTION_POSTED,
        mockAdmin.email,
        {
          question: mockQuestion,
          author: mockAuthor,
          recipient: mockAdmin
        }
      )

      expect(result.success).toBe(true)
      expect(mockSendMail).toHaveBeenCalledWith({
        from: 'nomhiro1204@gmail.com',
        to: 'admin@example.com',
        subject: '[QAサイト] 新しい質問が投稿されました',
        html: expect.stringContaining('添付ファイル (2件)'),
        text: expect.stringContaining('添付ファイル: error.log, screenshot.png')
      })
    })
  })

  describe('回答投稿通知', () => {
    it('質問者に回答投稿通知メールを送信する', async () => {
      const mockQuestion = {
        id: 'question-1',
        title: 'Azure Functions の設定について',
        content: 'Azure Functions の環境変数設定方法を教えてください',
        authorId: 'user-1',
        groupId: 'group-1',
        priority: QuestionPriority.MEDIUM,
        status: QuestionStatus.ANSWERED,
        tags: ['Azure', 'Functions'],
        attachments: [],
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-16')
      }

      const mockAnswer = {
        id: 'answer-1',
        questionId: 'question-1',
        content: 'Azure Functions の環境変数は以下の方法で設定できます...',
        authorId: 'admin-1',
        attachments: [],
        createdAt: new Date('2024-01-16'),
        updatedAt: new Date('2024-01-16')
      }

      const mockAnswerer = {
        id: 'admin-1',
        username: 'admin',
        email: 'admin@example.com',
        groupId: 'group-admin',
        isAdmin: true,
        createdAt: new Date(),
        lastLoginAt: null
      }

      const mockQuestioner = {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        groupId: 'group-1',
        isAdmin: false,
        createdAt: new Date(),
        lastLoginAt: null
      }

      mockSendMail.mockResolvedValue({ messageId: 'test-message-id' })

      const result = await sendNotificationEmail(
        EmailType.ANSWER_POSTED,
        mockQuestioner.email,
        {
          question: mockQuestion,
          answer: mockAnswer,
          answerer: mockAnswerer,
          recipient: mockQuestioner
        }
      )

      expect(result.success).toBe(true)
      expect(mockSendMail).toHaveBeenCalledWith({
        from: 'nomhiro1204@gmail.com',
        to: 'test@example.com',
        subject: '[QAサイト] 質問に回答が投稿されました',
        html: expect.stringContaining('Azure Functions の設定について'),
        text: expect.stringContaining('Azure Functions の設定について')
      })
    })
  })

  describe('コメント投稿通知', () => {
    it('質問者と管理者にコメント投稿通知メールを送信する', async () => {
      const mockQuestion = {
        id: 'question-1',
        title: 'Azure Functions の設定について',
        content: 'Azure Functions の環境変数設定方法を教えてください',
        authorId: 'user-1',
        groupId: 'group-1',
        priority: QuestionPriority.MEDIUM,
        status: QuestionStatus.ANSWERED,
        tags: ['Azure', 'Functions'],
        attachments: [],
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-16')
      }

      const mockComment = {
        id: 'comment-1',
        questionId: 'question-1',
        answerId: 'answer-1',
        content: 'ありがとうございます。追加で質問があります。',
        authorId: 'user-1',
        attachments: [],
        createdAt: new Date('2024-01-16')
      }

      const mockCommenter = {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        groupId: 'group-1',
        isAdmin: false,
        createdAt: new Date(),
        lastLoginAt: null
      }

      const mockAdmin = {
        id: 'admin-1',
        username: 'admin',
        email: 'admin@example.com',
        groupId: 'group-admin',
        isAdmin: true,
        createdAt: new Date(),
        lastLoginAt: null
      }

      mockSendMail.mockResolvedValue({ messageId: 'test-message-id' })

      const result = await sendNotificationEmail(
        EmailType.COMMENT_POSTED,
        mockAdmin.email,
        {
          question: mockQuestion,
          comment: mockComment,
          commenter: mockCommenter,
          recipient: mockAdmin
        }
      )

      expect(result.success).toBe(true)
      expect(mockSendMail).toHaveBeenCalledWith({
        from: 'nomhiro1204@gmail.com',
        to: 'admin@example.com',
        subject: '[QAサイト] コメントが投稿されました',
        html: expect.stringContaining('Azure Functions の設定について'),
        text: expect.stringContaining('ありがとうございます。追加で質問があります。')
      })
    })
  })

  describe('ステータス変更通知', () => {
    it('質問が解決済みになった時の通知メールを送信する', async () => {
      const mockQuestion = {
        id: 'question-1',
        title: 'Azure Functions の設定について',
        content: 'Azure Functions の環境変数設定方法を教えてください',
        authorId: 'user-1',
        groupId: 'group-1',
        priority: QuestionPriority.MEDIUM,
        status: QuestionStatus.RESOLVED,
        tags: ['Azure', 'Functions'],
        attachments: [],
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-17'),
        resolvedAt: new Date('2024-01-17')
      }

      const mockQuestioner = {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        groupId: 'group-1',
        isAdmin: false,
        createdAt: new Date(),
        lastLoginAt: null
      }

      const mockAdmin = {
        id: 'admin-1',
        username: 'admin',
        email: 'admin@example.com',
        groupId: 'group-admin',
        isAdmin: true,
        createdAt: new Date(),
        lastLoginAt: null
      }

      mockSendMail.mockResolvedValue({ messageId: 'test-message-id' })

      const result = await sendNotificationEmail(
        EmailType.QUESTION_RESOLVED,
        mockAdmin.email,
        {
          question: mockQuestion,
          resolver: mockQuestioner,
          recipient: mockAdmin
        }
      )

      expect(result.success).toBe(true)
      expect(mockSendMail).toHaveBeenCalledWith({
        from: 'nomhiro1204@gmail.com',
        to: 'admin@example.com',
        subject: '[QAサイト] 質問が解決済みになりました',
        html: expect.stringContaining('Azure Functions の設定について'),
        text: expect.stringContaining('解決済みとしてマークされました')
      })
    })

    it('質問が却下された時の通知メールを送信する', async () => {
      const mockQuestion = {
        id: 'question-1',
        title: '不適切な質問',
        content: '業務に関わる機密情報が含まれています',
        authorId: 'user-1',
        groupId: 'group-1',
        priority: QuestionPriority.MEDIUM,
        status: QuestionStatus.REJECTED,
        tags: [],
        attachments: [],
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-16')
      }

      const mockQuestioner = {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        groupId: 'group-1',
        isAdmin: false,
        createdAt: new Date(),
        lastLoginAt: null
      }

      const mockAdmin = {
        id: 'admin-1',
        username: 'admin',
        email: 'admin@example.com',
        groupId: 'group-admin',
        isAdmin: true,
        createdAt: new Date(),
        lastLoginAt: null
      }

      mockSendMail.mockResolvedValue({ messageId: 'test-message-id' })

      const result = await sendNotificationEmail(
        EmailType.QUESTION_REJECTED,
        mockQuestioner.email,
        {
          question: mockQuestion,
          rejector: mockAdmin,
          recipient: mockQuestioner
        }
      )

      expect(result.success).toBe(true)
      expect(mockSendMail).toHaveBeenCalledWith({
        from: 'nomhiro1204@gmail.com',
        to: 'test@example.com',
        subject: '[QAサイト] 質問が却下されました',
        html: expect.stringContaining('不適切な質問'),
        text: expect.stringContaining('却下されました')
      })
    })
  })

  describe('エラーハンドリング', () => {
    it('SMTP設定が不完全な場合にエラーを返す', async () => {
      // 環境変数を削除
      delete process.env.SMTP_HOST

      const result = await sendNotificationEmail(
        EmailType.QUESTION_POSTED,
        'test@example.com',
        {} as any
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('SMTP configuration is incomplete')
    })

    it('メール送信が失敗した場合にエラーを返す', async () => {
      const error = new Error('SMTP connection failed')
      mockSendMail.mockRejectedValue(error)

      const mockQuestion = {
        id: 'question-1',
        title: 'Test Question',
        content: 'Test content',
        authorId: 'user-1',
        groupId: 'group-1',
        priority: QuestionPriority.MEDIUM,
        status: QuestionStatus.UNANSWERED,
        tags: [],
        attachments: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const result = await sendNotificationEmail(
        EmailType.QUESTION_POSTED,
        'test@example.com',
        {
          question: mockQuestion,
          author: { id: 'user-1', username: 'test', email: 'test@example.com', groupId: 'group-1', isAdmin: false, createdAt: new Date(), lastLoginAt: null },
          recipient: { id: 'admin-1', username: 'admin', email: 'test@example.com', groupId: 'group-admin', isAdmin: true, createdAt: new Date(), lastLoginAt: null }
        }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('SMTP connection failed')
    })

    it('SMTP接続検証が失敗した場合にエラーを返す', async () => {
      const error = new Error('Invalid credentials')
      mockVerify.mockRejectedValue(error)

      const result = await sendNotificationEmail(
        EmailType.QUESTION_POSTED,
        'test@example.com',
        {} as any
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid credentials')
    })
  })

  describe('HTMLとテキスト形式の生成', () => {
    it('HTMLメールにリンクとスタイルが含まれる', async () => {
      const mockQuestion = {
        id: 'question-1',
        title: 'Test Question',
        content: 'Test content',
        authorId: 'user-1',
        groupId: 'group-1',
        priority: QuestionPriority.HIGH,
        status: QuestionStatus.UNANSWERED,
        tags: ['Test', 'HTML'],
        attachments: [],
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15')
      }

      mockSendMail.mockResolvedValue({ messageId: 'test-message-id' })

      await sendNotificationEmail(
        EmailType.QUESTION_POSTED,
        'test@example.com',
        {
          question: mockQuestion,
          author: { id: 'user-1', username: 'test', email: 'test@example.com', groupId: 'group-1', isAdmin: false, createdAt: new Date(), lastLoginAt: null },
          recipient: { id: 'admin-1', username: 'admin', email: 'test@example.com', groupId: 'group-admin', isAdmin: true, createdAt: new Date(), lastLoginAt: null }
        }
      )

      const mailCall = mockSendMail.mock.calls[0][0]
      expect(mailCall.html).toContain('<html>')
      expect(mailCall.html).toContain('body style=')
      expect(mailCall.html).toContain('href=')
      expect(mailCall.html).toContain('style=')
      expect(mailCall.text).not.toContain('<html>')
      expect(mailCall.text).not.toContain('href=')
    })
  })
})