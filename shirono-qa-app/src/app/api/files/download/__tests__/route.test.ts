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

describe('/api/files/download', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('認証テスト', () => {
    it('セッショントークンがない場合は401を返す', async () => {
      const request = new NextRequest('http://localhost:3000/api/files/download', {
        method: 'POST',
        body: JSON.stringify({
          blobUrl: 'mock://blob/test.txt',
          fileName: 'test.txt'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Not authenticated')
    })

    it('無効なセッションの場合は401を返す', async () => {
      mockValidateSession.mockResolvedValue({ valid: false })

      const request = new NextRequest('http://localhost:3000/api/files/download', {
        method: 'POST',
        body: JSON.stringify({
          blobUrl: 'mock://blob/test.txt',
          fileName: 'test.txt'
        }),
        headers: {
          'Content-Type': 'application/json',
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

  describe('ファイルダウンロードテスト', () => {
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

    it('blobUrlとfileNameが提供されない場合は400を返す', async () => {
      const request = new NextRequest('http://localhost:3000/api/files/download', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json',
          Cookie: 'session=valid-token'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('blobUrl and fileName are required')
    })

    it('モックファイルのダウンロードが成功する', async () => {
      const request = new NextRequest('http://localhost:3000/api/files/download', {
        method: 'POST',
        body: JSON.stringify({
          blobUrl: 'mock://blob/test.txt',
          fileName: 'test.txt'
        }),
        headers: {
          'Content-Type': 'application/json',
          Cookie: 'session=valid-token'
        }
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('application/octet-stream')
      expect(response.headers.get('Content-Disposition')).toBe('attachment; filename="test.txt"')
    })

    it('存在しないファイルの場合は404を返す', async () => {
      const request = new NextRequest('http://localhost:3000/api/files/download', {
        method: 'POST',
        body: JSON.stringify({
          blobUrl: 'mock://blob/nonexistent.txt',
          fileName: 'nonexistent.txt'
        }),
        headers: {
          'Content-Type': 'application/json',
          Cookie: 'session=valid-token'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('File not found')
    })

    it('ファイル名に特殊文字が含まれる場合も正しく処理される', async () => {
      const fileName = '特殊文字 & 記号.txt'
      const request = new NextRequest('http://localhost:3000/api/files/download', {
        method: 'POST',
        body: JSON.stringify({
          blobUrl: 'mock://blob/special.txt',
          fileName
        }),
        headers: {
          'Content-Type': 'application/json',
          Cookie: 'session=valid-token'
        }
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Disposition')).toContain(fileName)
    })
  })

  describe('エラーハンドリング', () => {
    it('予期しないエラーの場合は500を返す', async () => {
      // validateSessionでエラーを発生させる
      mockValidateSession.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/files/download', {
        method: 'POST',
        body: JSON.stringify({
          blobUrl: 'mock://blob/test.txt',
          fileName: 'test.txt'
        }),
        headers: {
          'Content-Type': 'application/json',
          Cookie: 'session=valid-token'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error during file download')
    })

    it('不正なJSONの場合は400を返す', async () => {
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

      const request = new NextRequest('http://localhost:3000/api/files/download', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
          Cookie: 'session=valid-token'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid JSON in request body')
    })
  })
})