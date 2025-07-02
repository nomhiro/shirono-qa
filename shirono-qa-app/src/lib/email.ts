import nodemailer from 'nodemailer'
import { Question, QuestionStatus } from '@/types/question'
import { Answer } from '@/types/answer'
import { Comment } from '@/types/comment'
import { User } from '@/types/auth'

export interface EmailConfig {
  host: string
  port: number
  user: string
  password: string
}

export interface NotificationData {
  recipientName: string
  authorName: string
  questionTitle: string
  questionUrl: string
  actionType: 'question_posted' | 'answer_posted' | 'comment_added' | 'status_changed' | 'question_rejected'
  newStatus?: QuestionStatus
}

export interface EmailTemplate {
  subject: string
  html: string
  text: string
}

export enum EmailType {
  QUESTION_POSTED = 'QUESTION_POSTED',
  ANSWER_POSTED = 'ANSWER_POSTED',
  COMMENT_POSTED = 'COMMENT_POSTED',
  QUESTION_RESOLVED = 'QUESTION_RESOLVED',
  QUESTION_REJECTED = 'QUESTION_REJECTED'
}

export interface EmailNotificationData {
  question: Question
  author?: User
  answerer?: User
  commenter?: User
  resolver?: User
  rejector?: User
  answer?: Answer
  comment?: Comment
  recipient: User
}

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

class EmailService {
  private transporter: nodemailer.Transporter
  private fromAddress: string

  constructor(config: EmailConfig) {
    this.fromAddress = config.user
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465, // SSL for port 465, TLS for others
      auth: {
        user: config.user,
        pass: config.password
      },
      tls: {
        // Gmail requires this
        rejectUnauthorized: false
      }
    })
  }

  /**
   * 接続テスト
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify()
      // Email接続確認成功
      return true
    } catch (error) {
      console.error('Email service connection failed:', error)
      return false
    }
  }

  /**
   * 通知メール送信
   */
  async sendNotification(
    recipientEmail: string,
    data: NotificationData
  ): Promise<boolean> {
    try {

      const template = this.getEmailTemplate(data)

      const mailOptions = {
        from: `"QAサイト" <${this.fromAddress}>`,
        to: recipientEmail,
        subject: template.subject,
        text: template.text,
        html: template.html
      }

      const _result = await this.transporter.sendMail(mailOptions)
      return true
    } catch (error) {
      console.error('Failed to send email:', error)
      return false
    }
  }

  /**
   * 一括通知メール送信
   */
  async sendBulkNotifications(
    recipients: Array<{ email: string; name: string }>,
    data: Omit<NotificationData, 'recipientName'>
  ): Promise<{ success: number; failed: number }> {
    let success = 0
    let failed = 0

    for (const recipient of recipients) {
      try {
        const notificationData: NotificationData = {
          ...data,
          recipientName: recipient.name
        }

        const sent = await this.sendNotification(recipient.email, notificationData)
        if (sent) {
          success++
        } else {
          failed++
        }
      } catch (error) {
        console.error(`Failed to send email to ${recipient.email}:`, error)
        failed++
      }
    }

    return { success, failed }
  }

  /**
   * メールテンプレート生成
   */
  private getEmailTemplate(data: NotificationData): EmailTemplate {
    switch (data.actionType) {
      case 'question_posted':
        return {
          subject: '[QAサイト] 新しい質問が投稿されました',
          html: this.generateQuestionPostedHtml(data),
          text: this.generateQuestionPostedText(data)
        }

      case 'answer_posted':
        return {
          subject: '[QAサイト] あなたの質問に回答がありました',
          html: this.generateAnswerPostedHtml(data),
          text: this.generateAnswerPostedText(data)
        }

      case 'comment_added':
        return {
          subject: '[QAサイト] 新しいコメントが追加されました',
          html: this.generateCommentAddedHtml(data),
          text: this.generateCommentAddedText(data)
        }

      case 'status_changed':
        return {
          subject: '[QAサイト] 質問のステータスが変更されました',
          html: this.generateStatusChangedHtml(data),
          text: this.generateStatusChangedText(data)
        }

      case 'question_rejected':
        return {
          subject: '[QAサイト] 質問が却下されました',
          html: this.generateQuestionRejectedHtml(data),
          text: this.generateQuestionRejectedText(data)
        }

      default:
        return {
          subject: '[QAサイト] 通知',
          html: '<p>新しい通知があります。</p>',
          text: '新しい通知があります。'
        }
    }
  }

  // HTML テンプレート生成メソッド
  private generateQuestionPostedHtml(data: NotificationData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>新しい質問が投稿されました</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #4f46e5;">新しい質問が投稿されました</h2>
          
          <p>こんにちは、${data.recipientName}さん</p>
          
          <p>${data.authorName}さんから新しい質問が投稿されました。</p>
          
          <div style="background-color: #f9fafb; padding: 15px; border-left: 4px solid #4f46e5; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #374151;">${data.questionTitle}</h3>
          </div>
          
          <p>
            <a href="${data.questionUrl}" style="background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
              質問を確認する
            </a>
          </p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          
          <p style="font-size: 12px; color: #6b7280;">
            このメールは自動送信されています。<br>
            QAサイト システム
          </p>
        </div>
      </body>
      </html>
    `
  }

  private generateAnswerPostedHtml(data: NotificationData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>質問に回答がありました</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #059669;">あなたの質問に回答がありました</h2>
          
          <p>こんにちは、${data.recipientName}さん</p>
          
          <p>あなたの質問に${data.authorName}さんから回答がありました。</p>
          
          <div style="background-color: #f0fdf4; padding: 15px; border-left: 4px solid #059669; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #374151;">${data.questionTitle}</h3>
          </div>
          
          <p>
            <a href="${data.questionUrl}" style="background-color: #059669; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
              回答を確認する
            </a>
          </p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          
          <p style="font-size: 12px; color: #6b7280;">
            このメールは自動送信されています。<br>
            QAサイト システム
          </p>
        </div>
      </body>
      </html>
    `
  }

  private generateCommentAddedHtml(data: NotificationData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>新しいコメントが追加されました</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #7c3aed;">新しいコメントが追加されました</h2>
          
          <p>こんにちは、${data.recipientName}さん</p>
          
          <p>${data.authorName}さんから新しいコメントが追加されました。</p>
          
          <div style="background-color: #faf5ff; padding: 15px; border-left: 4px solid #7c3aed; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #374151;">${data.questionTitle}</h3>
          </div>
          
          <p>
            <a href="${data.questionUrl}" style="background-color: #7c3aed; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
              コメントを確認する
            </a>
          </p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          
          <p style="font-size: 12px; color: #6b7280;">
            このメールは自動送信されています。<br>
            QAサイト システム
          </p>
        </div>
      </body>
      </html>
    `
  }

  private generateStatusChangedHtml(data: NotificationData): string {
    const statusText = this.getStatusText(data.newStatus)
    const statusColor = this.getStatusColor(data.newStatus)

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>質問のステータスが変更されました</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: ${statusColor};">質問のステータスが変更されました</h2>
          
          <p>こんにちは、${data.recipientName}さん</p>
          
          <p>あなたの質問のステータスが「${statusText}」に変更されました。</p>
          
          <div style="background-color: #f9fafb; padding: 15px; border-left: 4px solid ${statusColor}; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #374151;">${data.questionTitle}</h3>
            <p style="margin: 0; color: ${statusColor}; font-weight: bold;">ステータス: ${statusText}</p>
          </div>
          
          <p>
            <a href="${data.questionUrl}" style="background-color: ${statusColor}; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
              質問を確認する
            </a>
          </p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          
          <p style="font-size: 12px; color: #6b7280;">
            このメールは自動送信されています。<br>
            QAサイト システム
          </p>
        </div>
      </body>
      </html>
    `
  }

  private generateQuestionRejectedHtml(data: NotificationData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>質問が却下されました</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #dc2626;">質問が却下されました</h2>
          
          <p>こんにちは、${data.recipientName}さん</p>
          
          <p>申し訳ございませんが、あなたの質問は却下されました。詳細については管理者にお問い合わせください。</p>
          
          <div style="background-color: #fef2f2; padding: 15px; border-left: 4px solid #dc2626; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #374151;">${data.questionTitle}</h3>
          </div>
          
          <p>
            <a href="${data.questionUrl}" style="background-color: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
              質問を確認する
            </a>
          </p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          
          <p style="font-size: 12px; color: #6b7280;">
            このメールは自動送信されています。<br>
            QAサイト システム
          </p>
        </div>
      </body>
      </html>
    `
  }

  // テキスト版テンプレート生成メソッド
  private generateQuestionPostedText(data: NotificationData): string {
    return `
新しい質問が投稿されました

こんにちは、${data.recipientName}さん

${data.authorName}さんから新しい質問が投稿されました。

質問: ${data.questionTitle}

質問を確認する: ${data.questionUrl}

---
このメールは自動送信されています。
QAサイト システム
    `.trim()
  }

  private generateAnswerPostedText(data: NotificationData): string {
    return `
あなたの質問に回答がありました

こんにちは、${data.recipientName}さん

あなたの質問に${data.authorName}さんから回答がありました。

質問: ${data.questionTitle}

回答を確認する: ${data.questionUrl}

---
このメールは自動送信されています。
QAサイト システム
    `.trim()
  }

  private generateCommentAddedText(data: NotificationData): string {
    return `
新しいコメントが追加されました

こんにちは、${data.recipientName}さん

${data.authorName}さんから新しいコメントが追加されました。

質問: ${data.questionTitle}

コメントを確認する: ${data.questionUrl}

---
このメールは自動送信されています。
QAサイト システム
    `.trim()
  }

  private generateStatusChangedText(data: NotificationData): string {
    const statusText = this.getStatusText(data.newStatus)

    return `
質問のステータスが変更されました

こんにちは、${data.recipientName}さん

あなたの質問のステータスが「${statusText}」に変更されました。

質問: ${data.questionTitle}
ステータス: ${statusText}

質問を確認する: ${data.questionUrl}

---
このメールは自動送信されています。
QAサイト システム
    `.trim()
  }

  private generateQuestionRejectedText(data: NotificationData): string {
    return `
質問が却下されました

こんにちは、${data.recipientName}さん

申し訳ございませんが、あなたの質問は却下されました。
詳細については管理者にお問い合わせください。

質問: ${data.questionTitle}

質問を確認する: ${data.questionUrl}

---
このメールは自動送信されています。
QAサイト システム
    `.trim()
  }

  // ヘルパーメソッド
  private getStatusText(status?: QuestionStatus): string {
    switch (status) {
      case QuestionStatus.UNANSWERED:
        return '未回答'
      case QuestionStatus.ANSWERED:
        return '回答済み'
      case QuestionStatus.RESOLVED:
        return '解決済み'
      case QuestionStatus.REJECTED:
        return '却下'
      case QuestionStatus.CLOSED:
        return 'クローズ'
      default:
        return '不明'
    }
  }

  private getStatusColor(status?: QuestionStatus): string {
    switch (status) {
      case QuestionStatus.UNANSWERED:
        return '#f59e0b'
      case QuestionStatus.ANSWERED:
        return '#3b82f6'
      case QuestionStatus.RESOLVED:
        return '#059669'
      case QuestionStatus.REJECTED:
        return '#dc2626'
      case QuestionStatus.CLOSED:
        return '#6b7280'
      default:
        return '#6b7280'
    }
  }
}

// メールテンプレートの生成
function generateEmailContent(type: EmailType, data: EmailNotificationData): { subject: string, html: string, text: string } {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const questionUrl = `${baseUrl}/questions/${data.question.id}`

  switch (type) {
    case EmailType.QUESTION_POSTED:
      return {
        subject: '[QAサイト] 新しい質問が投稿されました',
        html: generateQuestionPostedHTML(data, questionUrl),
        text: generateQuestionPostedText(data, questionUrl)
      }

    case EmailType.ANSWER_POSTED:
      return {
        subject: '[QAサイト] 質問に回答が投稿されました',
        html: generateAnswerPostedHTML(data, questionUrl),
        text: generateAnswerPostedText(data, questionUrl)
      }

    case EmailType.COMMENT_POSTED:
      return {
        subject: '[QAサイト] コメントが投稿されました',
        html: generateCommentPostedHTML(data, questionUrl),
        text: generateCommentPostedText(data, questionUrl)
      }

    case EmailType.QUESTION_RESOLVED:
      return {
        subject: '[QAサイト] 質問が解決済みになりました',
        html: generateQuestionResolvedHTML(data, questionUrl),
        text: generateQuestionResolvedText(data, questionUrl)
      }

    case EmailType.QUESTION_REJECTED:
      return {
        subject: '[QAサイト] 質問が却下されました',
        html: generateQuestionRejectedHTML(data, questionUrl),
        text: generateQuestionRejectedText(data, questionUrl)
      }

    default:
      throw new Error(`Unknown email type: ${type}`)
  }
}

// HTMLテンプレート生成関数
function generateQuestionPostedHTML(data: EmailNotificationData, questionUrl: string): string {
  const attachmentsList = data.question.attachments.length > 0
    ? `<p><strong>添付ファイル (${data.question.attachments.length}件):</strong></p>
       <ul>${data.question.attachments.map(att => `<li>${att.fileName}</li>`).join('')}</ul>`
    : ''

  return `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">新しい質問が投稿されました</h2>
          
          <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
            <h3 style="margin-top: 0;">${data.question.title}</h3>
            <p><strong>投稿者:</strong> ${data.author?.username || 'Unknown'}</p>
            <p><strong>優先度:</strong> ${data.question.priority}</p>
            <p><strong>タグ:</strong> ${data.question.tags.join(', ')}</p>
            <p><strong>投稿日時:</strong> ${data.question.createdAt.toLocaleString('ja-JP')}</p>
          </div>
          
          <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <h4>質問内容:</h4>
            <p style="white-space: pre-wrap;">${data.question.content}</p>
            ${attachmentsList}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${questionUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">質問を確認する</a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
          <p style="font-size: 12px; color: #64748b; text-align: center;">
            このメールはQAサイトシステムから自動送信されています。
          </p>
        </div>
      </body>
    </html>
  `
}

function generateAnswerPostedHTML(data: EmailNotificationData, questionUrl: string): string {
  return `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #059669;">質問に回答が投稿されました</h2>
          
          <div style="background-color: #f0fdf4; border-left: 4px solid #059669; padding: 15px; margin: 20px 0;">
            <h3 style="margin-top: 0;">${data.question.title}</h3>
            <p><strong>回答者:</strong> ${data.answerer?.username || 'Unknown'}</p>
            <p><strong>回答日時:</strong> ${data.answer?.createdAt.toLocaleString('ja-JP')}</p>
          </div>
          
          <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <h4>回答内容:</h4>
            <p style="white-space: pre-wrap;">${data.answer?.content}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${questionUrl}" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">回答を確認する</a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
          <p style="font-size: 12px; color: #64748b; text-align: center;">
            このメールはQAサイトシステムから自動送信されています。
          </p>
        </div>
      </body>
    </html>
  `
}

function generateCommentPostedHTML(data: EmailNotificationData, questionUrl: string): string {
  return `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #7c3aed;">コメントが投稿されました</h2>
          
          <div style="background-color: #faf5ff; border-left: 4px solid #7c3aed; padding: 15px; margin: 20px 0;">
            <h3 style="margin-top: 0;">${data.question.title}</h3>
            <p><strong>コメント投稿者:</strong> ${data.commenter?.username || 'Unknown'}</p>
            <p><strong>投稿日時:</strong> ${data.comment?.createdAt.toLocaleString('ja-JP')}</p>
          </div>
          
          <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <h4>コメント内容:</h4>
            <p style="white-space: pre-wrap;">${data.comment?.content}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${questionUrl}" style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">コメントを確認する</a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
          <p style="font-size: 12px; color: #64748b; text-align: center;">
            このメールはQAサイトシステムから自動送信されています。
          </p>
        </div>
      </body>
    </html>
  `
}

function generateQuestionResolvedHTML(data: EmailNotificationData, questionUrl: string): string {
  return `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #059669;">質問が解決済みになりました</h2>
          
          <div style="background-color: #f0fdf4; border-left: 4px solid #059669; padding: 15px; margin: 20px 0;">
            <h3 style="margin-top: 0;">${data.question.title}</h3>
            <p><strong>解決者:</strong> ${data.resolver?.username || 'Unknown'}</p>
            <p><strong>解決日時:</strong> ${data.question.resolvedAt?.toLocaleString('ja-JP') || data.question.updatedAt.toLocaleString('ja-JP')}</p>
          </div>
          
          <p>上記の質問が解決済みとしてマークされました。</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${questionUrl}" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">質問を確認する</a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
          <p style="font-size: 12px; color: #64748b; text-align: center;">
            このメールはQAサイトシステムから自動送信されています。
          </p>
        </div>
      </body>
    </html>
  `
}

function generateQuestionRejectedHTML(data: EmailNotificationData, questionUrl: string): string {
  return `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #dc2626;">質問が却下されました</h2>
          
          <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
            <h3 style="margin-top: 0;">${data.question.title}</h3>
            <p><strong>却下者:</strong> ${data.rejector?.username || 'Unknown'}</p>
            <p><strong>却下日時:</strong> ${data.question.updatedAt.toLocaleString('ja-JP')}</p>
          </div>
          
          <p>申し訳ございませんが、この質問は却下されました。質問内容や利用規約をご確認の上、必要に応じて新しい質問を投稿してください。</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${questionUrl}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">質問を確認する</a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
          <p style="font-size: 12px; color: #64748b; text-align: center;">
            このメールはQAサイトシステムから自動送信されています。
          </p>
        </div>
      </body>
    </html>
  `
}

// テキスト形式テンプレート生成関数
function generateQuestionPostedText(data: EmailNotificationData, questionUrl: string): string {
  const attachmentsList = data.question.attachments.length > 0
    ? `\n添付ファイル: ${data.question.attachments.map(att => att.fileName).join(', ')}\n`
    : ''

  return `
新しい質問が投稿されました

質問タイトル: ${data.question.title}
投稿者: ${data.author?.username || 'Unknown'}
優先度: ${data.question.priority}
タグ: ${data.question.tags.join(', ')}
投稿日時: ${data.question.createdAt.toLocaleString('ja-JP')}

質問内容:
${data.question.content}
${attachmentsList}

質問を確認するには以下のリンクをクリックしてください:
${questionUrl}

---
このメールはQAサイトシステムから自動送信されています。
  `.trim()
}

function generateAnswerPostedText(data: EmailNotificationData, questionUrl: string): string {
  return `
質問に回答が投稿されました

質問タイトル: ${data.question.title}
回答者: ${data.answerer?.username || 'Unknown'}
回答日時: ${data.answer?.createdAt.toLocaleString('ja-JP')}

回答内容:
${data.answer?.content}

回答を確認するには以下のリンクをクリックしてください:
${questionUrl}

---
このメールはQAサイトシステムから自動送信されています。
  `.trim()
}

function generateCommentPostedText(data: EmailNotificationData, questionUrl: string): string {
  return `
コメントが投稿されました

質問タイトル: ${data.question.title}
コメント投稿者: ${data.commenter?.username || 'Unknown'}
投稿日時: ${data.comment?.createdAt.toLocaleString('ja-JP')}

コメント内容:
${data.comment?.content}

コメントを確認するには以下のリンクをクリックしてください:
${questionUrl}

---
このメールはQAサイトシステムから自動送信されています。
  `.trim()
}

function generateQuestionResolvedText(data: EmailNotificationData, questionUrl: string): string {
  return `
質問が解決済みになりました

質問タイトル: ${data.question.title}
解決者: ${data.resolver?.username || 'Unknown'}
解決日時: ${data.question.resolvedAt?.toLocaleString('ja-JP') || data.question.updatedAt.toLocaleString('ja-JP')}

上記の質問が解決済みとしてマークされました。

質問を確認するには以下のリンクをクリックしてください:
${questionUrl}

---
このメールはQAサイトシステムから自動送信されています。
  `.trim()
}

function generateQuestionRejectedText(data: EmailNotificationData, questionUrl: string): string {
  return `
質問が却下されました

質問タイトル: ${data.question.title}
却下者: ${data.rejector?.username || 'Unknown'}
却下日時: ${data.question.updatedAt.toLocaleString('ja-JP')}

申し訳ございませんが、この質問は却下されました。質問内容や利用規約をご確認の上、必要に応じて新しい質問を投稿してください。

質問を確認するには以下のリンクをクリックしてください:
${questionUrl}

---
このメールはQAサイトシステムから自動送信されています。
  `.trim()
}

// メール送信のメイン関数
export async function sendNotificationEmail(
  type: EmailType,
  to: string,
  data: EmailNotificationData
): Promise<EmailResult> {
  try {
    // SMTP設定の確認
    const smtpHost = process.env.SMTP_HOST
    const smtpPort = parseInt(process.env.SMTP_PORT || '587')
    const smtpUser = process.env.SMTP_USER
    const smtpPassword = process.env.SMTP_PASSWORD

    if (!smtpHost || !smtpUser || !smtpPassword) {
      return {
        success: false,
        error: 'SMTP configuration is incomplete. Please check environment variables.'
      }
    }

    // SMTPトランスポーターの設定
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // SSL/TLS
      auth: {
        user: smtpUser,
        pass: smtpPassword
      }
    })

    // SMTP接続の確認
    await transporter.verify()

    // メール内容の生成
    const { subject, html, text } = generateEmailContent(type, data)

    // メール送信
    const info = await transporter.sendMail({
      from: smtpUser,
      to,
      subject,
      html,
      text
    })

    return {
      success: true,
      messageId: info.messageId
    }

  } catch (error) {
    console.error('Error sending email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

// シングルトンインスタンス
let emailServiceInstance: EmailService | null = null

/**
 * EmailServiceインスタンスを取得
 */
export function getEmailService(): EmailService {
  if (!emailServiceInstance) {
    // ビルド時はダミー値を使用
    const host = process.env.SMTP_HOST || 'smtp.dummy.com'
    const port = parseInt(process.env.SMTP_PORT || '587')
    const user = process.env.SMTP_USER || 'dummy@example.com'
    const password = process.env.SMTP_PASSWORD || 'dummy-password'

    // 本番環境でのみ厳密なチェックを行う
    if (process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV !== 'preview' && (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD)) {
      console.warn('Email configuration is missing in production. Email notifications may not work.')
    }

    emailServiceInstance = new EmailService({
      host,
      port,
      user,
      password
    })
  }

  return emailServiceInstance
}

/**
 * Email設定の検証
 */
export const validateEmailConfig = (): { valid: boolean; error?: string } => {
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const password = process.env.SMTP_PASSWORD

  if (!host) {
    return { valid: false, error: 'SMTP_HOST is required' }
  }
  if (!user) {
    return { valid: false, error: 'SMTP_USER is required' }
  }
  if (!password) {
    return { valid: false, error: 'SMTP_PASSWORD is required' }
  }
  return { valid: true }
}

export default EmailService