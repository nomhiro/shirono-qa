import { NextRequest } from 'next/server'
import { GET } from '../route'
import * as passwordReset from '@/lib/password-reset'

// モック関数
jest.mock('@/lib/password-reset')

const mockedPasswordReset = passwordReset as jest.Mocked<typeof passwordReset>

describe('/api/auth/validate-reset-token', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('有効なトークンの場合は成功レスポンスを返す', async () => {
    const mockUser = {
      id: 'user-1',
      username: 'testuser',
      email: 'test@example.com',
      passwordHash: 'hash',
      groupId: 'group-1',
      isAdmin: false,
      createdAt: new Date(),
      lastLoginAt: new Date()
    }

    mockedPasswordReset.validateResetToken.mockResolvedValue({
      success: true,
      user: mockUser
    })

    const request = new NextRequest('http://localhost:3000/api/auth/validate-reset-token?token=abc123def456789012345678901234567890')

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.valid).toBe(true)
    expect(data.user).toEqual({
      id: 'user-1',
      username: 'testuser',
      email: 'test@example.com'
    })

    expect(mockedPasswordReset.validateResetToken).toHaveBeenCalledWith('abc123def456789012345678901234567890')
  })

  it('トークンパラメータが無い場合はバリデーションエラーを返す', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/validate-reset-token')

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(data.error.message).toBe('トークンパラメータが必要です')
  })

  it('無効なトークン形式の場合はエラーを返す', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/validate-reset-token?token=invalid-token')

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.valid).toBe(false)
    expect(data.error.code).toBe('INVALID_TOKEN')
    expect(data.error.message).toBe('無効なトークン形式です')
  })

  it('トークンが見つからない場合は無効レスポンスを返す', async () => {
    mockedPasswordReset.validateResetToken.mockResolvedValue({
      success: false,
      error: 'TOKEN_NOT_FOUND'
    })

    const request = new NextRequest('http://localhost:3000/api/auth/validate-reset-token?token=abc123def456789012345678901234567890')

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.valid).toBe(false)
    expect(data.error.code).toBe('TOKEN_NOT_FOUND')
    expect(data.error.message).toBe('トークンが見つかりません')
  })

  it('トークンが期限切れの場合は無効レスポンスを返す', async () => {
    mockedPasswordReset.validateResetToken.mockResolvedValue({
      success: false,
      error: 'TOKEN_EXPIRED'
    })

    const request = new NextRequest('http://localhost:3000/api/auth/validate-reset-token?token=abc123def456789012345678901234567890')

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.valid).toBe(false)
    expect(data.error.code).toBe('TOKEN_EXPIRED')
    expect(data.error.message).toBe('トークンの有効期限が切れています')
  })

  it('トークンが既に使用済みの場合は無効レスポンスを返す', async () => {
    mockedPasswordReset.validateResetToken.mockResolvedValue({
      success: false,
      error: 'TOKEN_ALREADY_USED'
    })

    const request = new NextRequest('http://localhost:3000/api/auth/validate-reset-token?token=abc123def456789012345678901234567890')

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.valid).toBe(false)
    expect(data.error.code).toBe('TOKEN_ALREADY_USED')
    expect(data.error.message).toBe('このトークンは既に使用済みです')
  })

  it('ユーザーが見つからない場合は無効レスポンスを返す', async () => {
    mockedPasswordReset.validateResetToken.mockResolvedValue({
      success: false,
      error: 'USER_NOT_FOUND'
    })

    const request = new NextRequest('http://localhost:3000/api/auth/validate-reset-token?token=abc123def456789012345678901234567890')

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.valid).toBe(false)
    expect(data.error.code).toBe('USER_NOT_FOUND')
    expect(data.error.message).toBe('ユーザーが見つかりません')
  })

  it('未知のエラーの場合はデフォルトメッセージを返す', async () => {
    mockedPasswordReset.validateResetToken.mockResolvedValue({
      success: false,
      error: 'UNKNOWN_ERROR' as any
    })

    const request = new NextRequest('http://localhost:3000/api/auth/validate-reset-token?token=abc123def456789012345678901234567890')

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.valid).toBe(false)
    expect(data.error.code).toBe('UNKNOWN_ERROR')
    expect(data.error.message).toBe('トークンが無効です')
  })

  it('例外が発生した場合は500エラーを返す', async () => {
    mockedPasswordReset.validateResetToken.mockRejectedValue(new Error('Database connection failed'))

    const request = new NextRequest('http://localhost:3000/api/auth/validate-reset-token?token=abc123def456789012345678901234567890')

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.valid).toBe(false)
    expect(data.error.code).toBe('INTERNAL_ERROR')
    expect(data.error.message).toBe('サーバーエラーが発生しました')
  })

  describe('トークン形式検証', () => {
    const testCases = [
      { token: '123', description: '短すぎるトークン' },
      { token: 'abc123def456789012345678901234567890123', description: '長すぎるトークン' },
      { token: 'xyz123def456789012345678901234567890', description: '無効な文字を含むトークン' },
      { token: 'ABC123DEF456789012345678901234567890', description: '大文字を含むトークン' },
      { token: 'abc123def456789012345678901234567890', description: '有効なトークン（32文字hex）' }
    ]

    testCases.forEach(({ token, description }) => {
      it(`${description}: ${token}`, async () => {
        const request = new NextRequest(`http://localhost:3000/api/auth/validate-reset-token?token=${token}`)
        const response = await GET(request)
        const data = await response.json()

        if (token === 'abc123def456789012345678901234567890') {
          // 有効なトークンの場合はライブラリが呼び出される
          expect(mockedPasswordReset.validateResetToken).toHaveBeenCalled()
        } else {
          // 無効なトークンの場合はライブラリが呼び出されない
          expect(response.status).toBe(400)
          expect(data.valid).toBe(false)
          expect(data.error.code).toBe('INVALID_TOKEN')
          expect(mockedPasswordReset.validateResetToken).not.toHaveBeenCalled()
        }
      })
    })
  })
})