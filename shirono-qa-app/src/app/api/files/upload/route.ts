import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/auth'
import { getBlobStorageService } from '@/lib/blob-storage'

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

    // FormDataからファイルを取得
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const questionId = formData.get('questionId') as string

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      )
    }

    // ファイル検証
    const maxFileSize = 1024 * 1024 * 1024 // 1GB
    const maxFiles = 5
    
    if (files.length > maxFiles) {
      return NextResponse.json(
        { error: `Maximum ${maxFiles} files allowed` },
        { status: 400 }
      )
    }

    const uploadResults: Array<{
      fileName: string
      blobUrl: string
      size: number
      contentType: string
    }> = []
    
    try {
      const blobService = getBlobStorageService()
      
      for (const file of files) {
        if (file.size > maxFileSize) {
          return NextResponse.json(
            { error: `File "${file.name}" exceeds maximum size of 1GB` },
            { status: 400 }
          )
        }

        // ファイルをBufferに変換
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        
        // メタデータを準備
        const metadata = {
          originalName: file.name,
          uploadedBy: validation.user.id,
          uploadedAt: new Date().toISOString()
        }
        
        // 質問用のパスを生成
        const qId = questionId || 'temp'
        const filePath = blobService.generateBlobPath('question', qId)
        const uniqueFileName = await blobService.generateUniqueFileNameInPath(filePath, file.name)
        
        // ファイルをBlob Storageにアップロード
        const uploadResult = await blobService.uploadFileWithPath(
          filePath,
          uniqueFileName,
          buffer,
          file.type,
          metadata
        )
        
        uploadResults.push({
          fileName: file.name, // 元のファイル名を保持
          blobUrl: uploadResult.blobUrl,
          size: uploadResult.fileSize,
          contentType: uploadResult.contentType
        })
        
      }
    } catch (error) {
      console.error('Blob storage upload failed:', error)
      return NextResponse.json(
        { error: 'File upload failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      files: uploadResults,
      message: `${files.length} files uploaded successfully`
    })

  } catch (error) {
    console.error('File upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error during file upload' },
      { status: 500 }
    )
  }
}