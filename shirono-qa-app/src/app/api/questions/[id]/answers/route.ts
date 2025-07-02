import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '../../../../../lib/auth'
import { createAnswer, getAnswersByQuestion } from '../../../../../lib/answers'
import { getQuestion, updateQuestionTimestamp } from '../../../../../lib/questions'
import { sendNotificationEmail, EmailType } from '../../../../../lib/email'
// import { getUsers } from '../../../../../lib/admin' // 未使用のため一時的にコメントアウト

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

    // 回答一覧取得
    const answersResult = await getAnswersByQuestion(questionId)
    if (!answersResult.success) {
      return NextResponse.json(
        { error: answersResult.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      answers: answersResult.answers
    })
  } catch (error) {
    console.error('Get answers API error:', error)
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

    // 管理者権限チェック（回答は管理者のみ投稿可能）
    if (!validation.user.isAdmin) {
      return NextResponse.json(
        { error: 'Only administrators can post answers' },
        { status: 403 }
      )
    }

    // 回答作成
    const answerResult = await createAnswer(body, questionId, validation.user.id)
    if (!answerResult.success) {
      console.error('Answer creation failed:', answerResult.error)
      return NextResponse.json(
        { error: answerResult.error },
        { status: 400 }
      )
    }

    let finalAnswer = answerResult.answer!

    // ファイルがある場合はアップロードして回答に関連付け
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
            answerId: finalAnswer.id
          }
          
          // 回答用のパスを生成
          const filePath = blobService.generateBlobPath('answer', questionId, finalAnswer.id)
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

        // 回答にファイルを関連付け
        const attachResponse = await fetch(`${request.nextUrl.origin}/api/answers/${finalAnswer.id}/attachments`, {
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
            finalAnswer = attachResult.answer
          }
        }
      } catch (fileError) {
        console.warn('File upload failed for answer, but answer was created:', fileError)
      }
    }

    // 質問の更新日時を更新
    await updateQuestionTimestamp(questionId)

    // 投稿者にメール通知を送信（非同期、エラーが発生しても回答作成は成功とする）
    try {
      // 投稿者を取得（IDで直接取得）
      const { getCosmosService } = await import('../../../../../lib/cosmos')
      const cosmosService = getCosmosService()
      const questionAuthor = await cosmosService.getItem('users', questionResult.question.authorId)
      
      if (questionAuthor) {
        await sendNotificationEmail(
          EmailType.ANSWER_POSTED,
          questionAuthor.email,
          {
            question: questionResult.question,
            author: questionAuthor,
            answerer: validation.user,
            answer: finalAnswer,
            recipient: questionAuthor
          }
        )
        // メール送信成功
      }
    } catch (emailError) {
      console.error('Failed to send answer notification email:', emailError)
      // メール送信エラーは回答作成の成功には影響しない
    }

    return NextResponse.json({
      success: true,
      answer: finalAnswer
    }, { status: 201 })
  } catch (error) {
    console.error('Create answer API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}