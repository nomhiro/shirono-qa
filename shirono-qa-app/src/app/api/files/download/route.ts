import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/auth'
import { getBlobStorageService } from '@/lib/blob-storage'

interface DownloadRequest {
  blobUrl: string
  fileName: string
}

export async function POST(request: NextRequest) {
  try {
    // セッション認証
    const sessionToken = request.cookies.get('session')?.value
    
    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const validation = await validateSession(sessionToken)
    if (!validation.valid || !validation.user) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      )
    }

    // リクエストボディをパース
    let body: DownloadRequest
    try {
      body = await request.json()
    } catch (error) {
      console.error('Failed to parse download request JSON:', error)
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const { blobUrl, fileName } = body

    if (!blobUrl || !fileName) {
      console.error('Missing required parameters:', { blobUrl: !!blobUrl, fileName: !!fileName })
      return NextResponse.json(
        { error: 'blobUrl and fileName are required' },
        { status: 400 }
      )
    }

    // Azure Blob Storageからファイルを取得
    try {
      const blobService = getBlobStorageService()
      // Blob URLから完全なパス（questions/{id}/question/{filename}など）を抽出
      const fullBlobPath = blobService.extractFileNameFromUrl(blobUrl)
      

      // ファイルをダウンロード
      const fileBuffer = await blobService.downloadFile(fullBlobPath)

      // ファイル情報を取得
      const fileInfo = await blobService.getFileInfo(fullBlobPath)
      
      if (!fileInfo.exists) {
        return NextResponse.json(
          { error: 'File not found' },
          { status: 404 }
        )
      }

      // ReadableStreamを作成
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(fileBuffer)
          controller.close()
        }
      })

      return new Response(stream, {
        status: 200,
        headers: {
          'Content-Type': fileInfo.contentType || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
          'Content-Length': fileInfo.size?.toString() || fileBuffer.length.toString()
        }
      })
    } catch (error) {
      console.error('File download from blob storage failed:', error)
      return NextResponse.json(
        { error: 'File download failed' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('File download error:', error)
    return NextResponse.json(
      { error: 'Internal server error during file download' },
      { status: 500 }
    )
  }
}