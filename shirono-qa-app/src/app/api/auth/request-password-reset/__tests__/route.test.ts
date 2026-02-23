import { NextRequest } from 'next/server'
import { POST } from '../route'
import * as passwordReset from '@/lib/password-reset'
import * as email from '@/lib/email'

// モック関数
jest.mock('@/lib/password-reset')
jest.mock('@/lib/email')

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockedPasswordReset = passwordReset as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockedEmail = email as any

describe('/api/auth/request-password-reset', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NEXTAUTH_URL = 'http://localhost:3000'
  })

  afterEach(() => {
    delete process.env.NEXTAUTH_URL
  })

  it('有効なメールアドレスでパスワードリセット要求が成功する', async () => {
    // モックの設定
    mockedPasswordReset.requestPasswordReset.mockResolvedValue({
      success: true,
      token: 'abc123def456789012345678901234567890',
      user: {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hash',
        groupId: 'group-1',
        isAdmin: false,
        createdAt: new Date(),
        lastLoginAt: new Date()
      }
    })

    mockedEmail.sendEmail.mockResolvedValue(undefined)

    // リクエストを作成
    const request = new NextRequest('http://localhost:3000/api/auth/request-password-reset', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
      headers: { 'Content-Type': 'application/json' }
    })

    // APIを呼び出し
    const response = await POST(request)
    const data = await response.json()

    // レスポンスを検証
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.message).toContain('パスワードリセット用のメールを送信しました')

    // モック関数の呼び出しを検証
    expect(mockedPasswordReset.requestPasswordReset).toHaveBeenCalledWith('test@example.com')
    expect(mockedEmail.sendEmail).toHaveBeenCalledWith({
      to: 'test@example.com',
      subject: '[shiro Assistant] パスワードリセットのご案内',
      html: expect.stringContaining('パスワードリセットのご案内'),
      text: expect.stringContaining('パスワードリセットのご案内')
    })
  })

  it('メールアドレスが空の場合はバリデーションエラーを返す', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/request-password-reset', {
      method: 'POST',
      body: JSON.stringify({ email: '' }),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(data.error.message).toBe('メールアドレスが必要です')
  })

  it('無効なメールアドレス形式の場合はバリデーションエラーを返す', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/request-password-reset', {
      method: 'POST',
      body: JSON.stringify({ email: 'invalid-email' }),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(data.error.message).toBe('有効なメールアドレスを入力してください')
  })

  it('ユーザーが存在しない場合でも成功レスポンスを返す（セキュリティのため）', async () => {
    mockedPasswordReset.requestPasswordReset.mockResolvedValue({
      success: false,
      error: 'USER_NOT_FOUND'
    })

    const request = new NextRequest('http://localhost:3000/api/auth/request-password-reset', {
      method: 'POST',
      body: JSON.stringify({ email: 'nonexistent@example.com' }),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.message).toContain('パスワードリセット用のメールを送信しました')

    // メール送信は呼び出されないことを確認
    expect(mockedEmail.sendEmail).not.toHaveBeenCalled()
  })

  it('メール送信に失敗してもエラーは返さない', async () => {
    mockedPasswordReset.requestPasswordReset.mockResolvedValue({
      success: true,
      token: 'abc123def456789012345678901234567890',
      user: {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hash',
        groupId: 'group-1',
        isAdmin: false,
        createdAt: new Date(),
        lastLoginAt: new Date()
      }
    })

    mockedEmail.sendEmail.mockRejectedValue(new Error('SMTP error'))

    const request = new NextRequest('http://localhost:3000/api/auth/request-password-reset', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.message).toContain('パスワードリセット用のメールを送信しました')
  })

  it('パスワードリセット処理でエラーが発生した場合は500エラーを返す', async () => {
    mockedPasswordReset.requestPasswordReset.mockResolvedValue({
      success: false,
      error: 'DATABASE_ERROR'
    })

    const request = new NextRequest('http://localhost:3000/api/auth/request-password-reset', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error.code).toBe('INTERNAL_ERROR')
    expect(data.error.message).toBe('パスワードリセットの処理中にエラーが発生しました')
  })

  it('JSONパースエラーの場合は500エラーを返す', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/request-password-reset', {
      method: 'POST',
      body: 'invalid json',
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error.code).toBe('INTERNAL_ERROR')
    expect(data.error.message).toBe('サーバーエラーが発生しました')
  })

  it('リセットURLが正しく生成される', async () => {
    process.env.NEXTAUTH_URL = 'https://example.com'

    mockedPasswordReset.requestPasswordReset.mockResolvedValue({
      success: true,
      token: 'abc123def456789012345678901234567890',
      user: {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hash',
        groupId: 'group-1',
        isAdmin: false,
        createdAt: new Date(),
        lastLoginAt: new Date()
      }
    })

    mockedEmail.sendEmail.mockResolvedValue(undefined)

    const request = new NextRequest('http://localhost:3000/api/auth/request-password-reset', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
      headers: { 'Content-Type': 'application/json' }
    })

    await POST(request)

    expect(mockedEmail.sendEmail).toHaveBeenCalledWith({
      to: 'test@example.com',
      subject: '[shiro Assistant] パスワードリセットのご案内',
      html: expect.stringContaining('https://example.com/reset-password?token=abc123def456789012345678901234567890'),
      text: expect.stringContaining('https://example.com/reset-password?token=abc123def456789012345678901234567890')
    })
  })
})