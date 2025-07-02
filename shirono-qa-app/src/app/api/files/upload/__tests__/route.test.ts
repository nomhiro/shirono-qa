/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import { POST } from '../route'
import { validateSession } from '@/lib/auth'

// validateSessionをモック化
jest.mock('@/lib/auth', () => ({
  validateSession: jest.fn()
}))

const mockValidateSession = validateSession as jest.MockedFunction<typeof validateSession>

describe('/api/files/upload', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('認証テスト', () => {
    it('セッショントークンがない場合は401を返す', async () => {
      // セッショントークンなしのリクエストを作成
      const formData = new FormData()
      formData.append('files', new File(['test'], 'test.txt', { type: 'text/plain' }))
      
      const request = new NextRequest('http://localhost:3000/api/files/upload', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Not authenticated')
    })

    it('無効なセッションの場合は401を返す', async () => {
      // 無効なセッションのレスポンス設定
      mockValidateSession.mockResolvedValue({ valid: false })

      const formData = new FormData()
      formData.append('files', new File(['test'], 'test.txt', { type: 'text/plain' }))
      
      const request = new NextRequest('http://localhost:3000/api/files/upload', {
        method: 'POST',
        body: formData,
        headers: {
          Cookie: 'session=invalid-token'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid session')
      expect(mockValidateSession).toHaveBeenCalledWith('invalid-token')
    })
  })

  describe('ファイルアップロードテスト', () => {
    beforeEach(() => {
      // 有効なセッションをモック
      mockValidateSession.mockResolvedValue({
        valid: true,
        user: {
          id: 'user-1',
          username: 'testuser',
          email: 'test@example.com',
          isAdmin: false,
          groupId: 'group-1',
          passwordHash: 'hash',
          createdAt: new Date(),
          lastLoginAt: null
        }
      })
    })

    it('ファイルが提供されない場合は400を返す', async () => {
      const formData = new FormData()
      
      const request = new NextRequest('http://localhost:3000/api/files/upload', {
        method: 'POST',
        body: formData,
        headers: {
          Cookie: 'session=valid-token'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('No files provided')
    })

    it('単一ファイルのアップロードが成功する', async () => {
      const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' })
      const formData = new FormData()
      formData.append('files', testFile)
      
      const request = new NextRequest('http://localhost:3000/api/files/upload', {
        method: 'POST',
        body: formData,
        headers: {
          Cookie: 'session=valid-token'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.urls).toHaveLength(1)
      expect(data.urls[0]).toMatch(/^mock:\/\/blob\/\d+_test\.txt$/)
      expect(data.message).toBe('1 files uploaded successfully')
    })

    it('複数ファイルのアップロードが成功する', async () => {
      const file1 = new File(['content1'], 'file1.txt', { type: 'text/plain' })
      const file2 = new File(['content2'], 'file2.txt', { type: 'text/plain' })
      
      const formData = new FormData()
      formData.append('files', file1)
      formData.append('files', file2)
      
      const request = new NextRequest('http://localhost:3000/api/files/upload', {
        method: 'POST',
        body: formData,
        headers: {
          Cookie: 'session=valid-token'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.urls).toHaveLength(2)
      expect(data.urls[0]).toMatch(/^mock:\/\/blob\/\d+_file1\.txt$/)
      expect(data.urls[1]).toMatch(/^mock:\/\/blob\/\d+_file2\.txt$/)
      expect(data.message).toBe('2 files uploaded successfully')
    })

    it('最大ファイル数を超える場合は400を返す', async () => {
      const formData = new FormData()
      // 6個のファイルを追加（制限は5個）
      for (let i = 1; i <= 6; i++) {
        formData.append('files', new File([`content${i}`], `file${i}.txt`, { type: 'text/plain' }))
      }
      
      const request = new NextRequest('http://localhost:3000/api/files/upload', {
        method: 'POST',
        body: formData,
        headers: {
          Cookie: 'session=valid-token'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Maximum 5 files allowed')
    })

    it('ファイルサイズが制限を超える場合は400を返す', async () => {
      // 1GB + 1バイトのファイルサイズをシミュレート
      const largeFile = new File(['x'], 'large.txt', { type: 'text/plain' })
      // ファイルサイズを手動で設定（テスト用）
      Object.defineProperty(largeFile, 'size', {
        value: 1024 * 1024 * 1024 + 1, // 1GB + 1バイト
        writable: false
      })

      const formData = new FormData()
      formData.append('files', largeFile)
      
      const request = new NextRequest('http://localhost:3000/api/files/upload', {
        method: 'POST',
        body: formData,
        headers: {
          Cookie: 'session=valid-token'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('File "large.txt" exceeds maximum size of 1GB')
    })
  })

  describe('エラーハンドリング', () => {
    it('予期しないエラーの場合は500を返す', async () => {
      // validateSessionでエラーを発生させる
      mockValidateSession.mockRejectedValue(new Error('Database error'))

      const formData = new FormData()
      formData.append('files', new File(['test'], 'test.txt', { type: 'text/plain' }))
      
      const request = new NextRequest('http://localhost:3000/api/files/upload', {
        method: 'POST',
        body: formData,
        headers: {
          Cookie: 'session=valid-token'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error during file upload')
    })
  })
})