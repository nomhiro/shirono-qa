import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/auth'
import { getQuestion, updateQuestion } from '@/lib/questions'

interface AttachFileRequest {
  files: Array<{
    fileName: string
    blobUrl: string
    size: number
    contentType: string
  }>
}

// 質問に添付ファイルを関連付ける
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    
    // 認証チェック
    const sessionToken = request.cookies.get('session')?.value
    if (!sessionToken) {
      return NextResponse.json(
        { 
          error: { 
            code: 'UNAUTHORIZED', 
            message: 'Authentication required' 
          } 
        },
        { status: 401 }
      )
    }

    const authResult = await validateSession(sessionToken)
    if (!authResult.valid || !authResult.user) {
      return NextResponse.json(
        { 
          error: { 
            code: 'UNAUTHORIZED', 
            message: 'Invalid session' 
          } 
        },
        { status: 401 }
      )
    }

    // 既存質問取得
    const questionResult = await getQuestion(params.id)
    if (!questionResult.success) {
      return NextResponse.json(
        { 
          error: { 
            code: 'NOT_FOUND', 
            message: 'Question not found' 
          } 
        },
        { status: 404 }
      )
    }

    const question = questionResult.question!

    // 権限チェック：質問作成者または管理者のみ
    if (!authResult.user.isAdmin && question.authorId !== authResult.user.id) {
      return NextResponse.json(
        { 
          error: { 
            code: 'FORBIDDEN', 
            message: 'Only the question author or admin can attach files' 
          } 
        },
        { status: 403 }
      )
    }

    // リクエストボディ取得
    const body: AttachFileRequest = await request.json()
    const { files } = body

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Files array is required' 
          } 
        },
        { status: 400 }
      )
    }

    // 添付ファイル情報の準備
    const attachments = files.map(file => ({
      fileName: file.fileName,
      fileSize: file.size,
      blobUrl: file.blobUrl,
      contentType: file.contentType || 'application/octet-stream'
    }))
    

    // 既存の添付ファイルと合わせる
    const currentAttachments = question.attachments || []
    const updatedAttachments = [...currentAttachments, ...attachments]

    // 質問を更新
    const updateResult = await updateQuestion(params.id, {
      attachments: updatedAttachments
    })

    if (!updateResult.success) {
      return NextResponse.json(
        { 
          error: { 
            code: 'INTERNAL_ERROR', 
            message: 'Failed to update question with attachments' 
          } 
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      question: updateResult.question,
      message: `${files.length} file(s) attached successfully`
    })

  } catch (error) {
    console.error('POST /api/questions/[id]/attachments error:', error)
    return NextResponse.json(
      { 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Internal server error' 
        } 
      },
      { status: 500 }
    )
  }
}