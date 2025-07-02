import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '../../../../../lib/auth'
import { createComment, getCommentsByQuestion } from '../../../../../lib/answers'
import { getQuestion, updateQuestionTimestamp } from '../../../../../lib/questions'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // paramsを待機
    const params = await context.params
    
    // セッション検証
    const sessionToken = request.cookies.get('session')?.value
    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
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

    const questionId = params.id

    // 質問の存在確認とアクセス権限チェック
    const questionResult = await getQuestion(questionId)
    if (!questionResult.success || !questionResult.question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      )
    }

    // グループアクセス権限チェック
    if (!validation.user.isAdmin && questionResult.question.groupId !== validation.user.groupId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // コメント一覧取得
    const commentsResult = await getCommentsByQuestion(questionId)
    if (!commentsResult.success) {
      return NextResponse.json(
        { error: commentsResult.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      comments: commentsResult.comments
    })
  } catch (error) {
    console.error('Get comments API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // paramsを待機
    const params = await context.params
    
    // セッション検証
    const sessionToken = request.cookies.get('session')?.value
    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
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

    const questionId = params.id
    
    // FormDataを解析
    const formData = await request.formData()
    const content = formData.get('content') as string
    const fileCount = parseInt(formData.get('fileCount') as string || '0')
    
    // ファイルを収集
    const attachmentFiles: File[] = []
    for (let i = 0; i < fileCount; i++) {
      const file = formData.get(`file_${i}`) as File
      if (file) {
        attachmentFiles.push(file)
      }
    }
    
    const body = {
      content,
      attachments: attachmentFiles
    }

    // 質問の存在確認とアクセス権限チェック
    const questionResult = await getQuestion(questionId)
    if (!questionResult.success || !questionResult.question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      )
    }

    // グループアクセス権限チェック
    if (!validation.user.isAdmin && questionResult.question.groupId !== validation.user.groupId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // コメント作成
    console.log('Creating comment with content:', content, 'and', attachmentFiles.length, 'files')
    const commentResult = await createComment(body, questionId, validation.user.id)
    if (!commentResult.success) {
      console.error('Comment creation failed:', commentResult.error)
      return NextResponse.json(
        { error: commentResult.error },
        { status: 400 }
      )
    }

    let finalComment = commentResult.comment!

    // ファイルがある場合はアップロードしてコメントに関連付け
    if (attachmentFiles.length > 0) {
      try {
        // ファイルをBlob Storageにアップロード
        const { getBlobStorageService } = await import('../../../../../lib/blob-storage')
        const blobService = getBlobStorageService()
        
        const uploadResults = []
        for (const file of attachmentFiles) {
          const bytes = await file.arrayBuffer()
          const buffer = Buffer.from(bytes)
          
          const metadata = {
            originalName: file.name,
            uploadedBy: validation.user.id,
            uploadedAt: new Date().toISOString(),
            questionId: questionId,
            commentId: finalComment.id
          }
          
          // コメント用のパスを生成
          const filePath = blobService.generateBlobPath('comment', questionId, finalComment.id)
          const uniqueFileName = await blobService.generateUniqueFileNameInPath(filePath, file.name)
          
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
            contentType: file.type
          })
        }

        // コメントにファイルを関連付け
        const attachResponse = await fetch(`${request.nextUrl.origin}/api/comments/${finalComment.id}/attachments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': request.headers.get('cookie') || ''
          },
          body: JSON.stringify({
            files: uploadResults
          })
        })

        if (attachResponse.ok) {
          const attachResult = await attachResponse.json()
          if (attachResult.success) {
            finalComment = attachResult.comment
          }
        }
      } catch (fileError) {
        console.warn('File upload failed for comment, but comment was created:', fileError)
      }
    }

    // 質問の更新日時を更新
    await updateQuestionTimestamp(questionId)

    return NextResponse.json({
      success: true,
      comment: finalComment
    }, { status: 201 })
  } catch (error) {
    console.error('Create comment API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}