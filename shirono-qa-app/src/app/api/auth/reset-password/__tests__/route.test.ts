import { NextRequest } from 'next/server'
import { POST } from '../route'
import * as passwordReset from '@/lib/password-reset'

// モック関数
jest.mock('@/lib/password-reset')

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockedPasswordReset = passwordReset as any

describe('/api/auth/reset-password', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('有効なトークンと新しいパスワードでリセットが成功する', async () => {
    const mockUser = {
      id: 'user-1',
      username: 'testuser',
      email: 'test@example.com',
      passwordHash: 'newhash',
      groupId: 'group-1',
      isAdmin: false,
      createdAt: new Date(),
      lastLoginAt: new Date()
    }

    mockedPasswordReset.resetPassword.mockResolvedValue({
      success: true,
      user: mockUser
    })

    const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ 
        token: 'abc123def456789012345678901234567890',
        newPassword: 'NewPass123!' 
      }),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.message).toContain('パスワードが正常にリセットされました')
    expect(data.user).toEqual({
      id: 'user-1',
      username: 'testuser',
      email: 'test@example.com'
    })

    expect(mockedPasswordReset.resetPassword).toHaveBeenCalledWith('abc123def456789012345678901234567890', 'NewPass123!')
  })

  it('トークンが空の場合はバリデーションエラーを返す', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: '', newPassword: 'NewPass123!' }),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(data.error.message).toBe('トークンと新しいパスワードが必要です')
  })

  it('新しいパスワードが空の場合はバリデーションエラーを返す', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: 'abc123def456789012345678901234567890', newPassword: '' }),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(data.error.message).toBe('トークンと新しいパスワードが必要です')
  })

  it('無効なトークン形式の場合はエラーを返す', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: 'invalid-token', newPassword: 'NewPass123!' }),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.code).toBe('INVALID_TOKEN')
    expect(data.error.message).toBe('無効なトークン形式です')
  })

  describe('パスワード複雑性検証', () => {
    const testCases = [
      { password: '1234567', message: 'パスワードは8文字以上である必要があります' },
      { password: '12345678', message: 'パスワードには英字、数字、特殊文字（!@#$%^&*等）を含む必要があります' },
      { password: 'abcdefgh', message: 'パスワードには英字、数字、特殊文字（!@#$%^&*等）を含む必要があります' },
      { password: 'abc12345', message: 'パスワードには英字、数字、特殊文字（!@#$%^&*等）を含む必要があります' },
      { password: 'abc123!@', message: null }, // 有効なパスワード
    ]

    testCases.forEach(({ password, message }) => {
      it(`パスワード "${password}" ${message ? 'は無効' : 'は有効'}`, async () => {
        if (message === null) {
          // 有効なパスワードの場合はモックを設定
          mockedPasswordReset.resetPassword.mockResolvedValue({
            success: true,
            user: {
              id: 'user-1',
              username: 'testuser',
              email: 'test@example.com',
              passwordHash: 'newhash',
              groupId: 'group-1',
              isAdmin: false,
              createdAt: new Date(),
              lastLoginAt: new Date()
            }
          })
        }

        const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
          method: 'POST',
          body: JSON.stringify({ 
            token: 'abc123def456789012345678901234567890',
            newPassword: password 
          }),
          headers: { 'Content-Type': 'application/json' }
        })

        const response = await POST(request)
        const data = await response.json()

        if (message === null) {
          expect(response.status).toBe(200)
          expect(data.success).toBe(true)
        } else {
          expect(response.status).toBe(400)
          expect(data.error.code).toBe('VALIDATION_ERROR')
          expect(data.error.message).toBe(message)
        }
      })
    })
  })

  it('トークンが見つからない場合は404エラーを返す', async () => {
    mockedPasswordReset.resetPassword.mockResolvedValue({
      success: false,
      error: 'TOKEN_NOT_FOUND'
    })

    const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ 
        token: 'abc123def456789012345678901234567890',
        newPassword: 'NewPass123!' 
      }),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error.code).toBe('TOKEN_NOT_FOUND')
    expect(data.error.message).toBe('トークンが見つかりません')
  })

  it('トークンが期限切れの場合は400エラーを返す', async () => {
    mockedPasswordReset.resetPassword.mockResolvedValue({
      success: false,
      error: 'TOKEN_EXPIRED'
    })

    const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ 
        token: 'abc123def456789012345678901234567890',
        newPassword: 'NewPass123!' 
      }),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.code).toBe('TOKEN_EXPIRED')
    expect(data.error.message).toBe('トークンの有効期限が切れています。再度パスワードリセットを要求してください')
  })

  it('トークンが既に使用済みの場合は400エラーを返す', async () => {
    mockedPasswordReset.resetPassword.mockResolvedValue({
      success: false,
      error: 'TOKEN_ALREADY_USED'
    })

    const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ 
        token: 'abc123def456789012345678901234567890',
        newPassword: 'NewPass123!' 
      }),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.code).toBe('TOKEN_ALREADY_USED')
    expect(data.error.message).toBe('このトークンは既に使用済みです。再度パスワードリセットを要求してください')
  })

  it('ユーザーが見つからない場合は404エラーを返す', async () => {
    mockedPasswordReset.resetPassword.mockResolvedValue({
      success: false,
      error: 'USER_NOT_FOUND'
    })

    const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ 
        token: 'abc123def456789012345678901234567890',
        newPassword: 'NewPass123!' 
      }),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error.code).toBe('USER_NOT_FOUND')
    expect(data.error.message).toBe('ユーザーが見つかりません')
  })

  it('弱いパスワードの場合は400エラーを返す', async () => {
    mockedPasswordReset.resetPassword.mockResolvedValue({
      success: false,
      error: 'WEAK_PASSWORD'
    })

    const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ 
        token: 'abc123def456789012345678901234567890',
        newPassword: 'NewPass123!' 
      }),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.code).toBe('WEAK_PASSWORD')
    expect(data.error.message).toBe('パスワードが安全性要件を満たしていません')
  })

  it('未知のエラーの場合は500エラーを返す', async () => {
    mockedPasswordReset.resetPassword.mockResolvedValue({
      success: false,
      error: 'UNKNOWN_ERROR' as any
    })

    const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ 
        token: 'abc123def456789012345678901234567890',
        newPassword: 'NewPass123!' 
      }),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error.code).toBe('UNKNOWN_ERROR')
    expect(data.error.message).toBe('パスワードリセット処理中にエラーが発生しました')
  })

  it('例外が発生した場合は500エラーを返す', async () => {
    mockedPasswordReset.resetPassword.mockRejectedValue(new Error('Database connection failed'))

    const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ 
        token: 'abc123def456789012345678901234567890',
        newPassword: 'NewPass123!' 
      }),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error.code).toBe('INTERNAL_ERROR')
    expect(data.error.message).toBe('サーバーエラーが発生しました')
  })

  it('JSONパースエラーの場合は500エラーを返す', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
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
})