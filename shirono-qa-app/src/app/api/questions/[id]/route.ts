import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/auth'
import { getQuestion, updateQuestion, deleteQuestion, validateQuestionData } from '@/lib/questions'
import { sendNotificationEmail, EmailType } from '@/lib/email'
import { getUsers } from '@/lib/admin'
import { QuestionStatus } from '@/types/question'
import { User } from '@/types/auth'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // paramsを待機
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

    // 質問取得
    const result = await getQuestion(params.id)
    if (!result.success) {
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

    const question = result.question!

    // グループベースアクセス制御
    if (!authResult.user.isAdmin && question.groupId !== authResult.user.groupId) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied'
          }
        },
        { status: 403 }
      )
    }

    // 質問の詳細情報を返す

    return NextResponse.json({
      success: true,
      question
    })

  } catch (error) {
    console.error('GET /api/questions/[id] error:', error)
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

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // paramsを待機
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

    const existingQuestion = questionResult.question!

    // リクエストボディ取得
    const body = await request.json()
    const { title, content, priority, status } = body

    // 権限チェック
    const isAdmin = authResult.user.isAdmin
    const isAuthor = existingQuestion.authorId === authResult.user.id
    const isGroupMember = existingQuestion.groupId === authResult.user.groupId

    // ステータス変更のみの場合は同じグループのユーザーも許可
    const isStatusOnlyUpdate = status !== undefined && title === undefined && content === undefined && priority === undefined

    if (!isAdmin && !isAuthor && !(isGroupMember && isStatusOnlyUpdate)) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: isStatusOnlyUpdate
              ? 'Only the question author, group members, or admin can change question status'
              : 'Only the question author or admin can update this question'
          }
        },
        { status: 403 }
      )
    }

    // 更新データの検証
    if (title !== undefined || content !== undefined || priority !== undefined) {
      const validation = validateQuestionData({
        title: title || existingQuestion.title,
        content: content || existingQuestion.content,
        priority: priority || existingQuestion.priority
      })

      if (!validation.valid) {
        return NextResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: validation.errors.join(', ')
            }
          },
          { status: 400 }
        )
      }
    }

    // 質問更新
    const updateData: Record<string, unknown> = {}
    if (title !== undefined) updateData.title = title
    if (content !== undefined) updateData.content = content
    if (priority !== undefined) updateData.priority = priority
    if (status !== undefined) updateData.status = status

    const result = await updateQuestion(params.id, updateData)
    if (!result.success) {
      return NextResponse.json(
        {
          error: {
            code: 'INTERNAL_ERROR',
            message: result.error || 'Failed to update question'
          }
        },
        { status: 500 }
      )
    }

    // ステータス変更時のメール通知（非同期、エラーが発生しても更新は成功とする）
    if (status !== undefined && (status === QuestionStatus.RESOLVED || status === QuestionStatus.REJECTED)) {
      try {
        // 質問の投稿者を取得
        const { getCosmosService } = await import('@/lib/cosmos')
        const cosmosService = getCosmosService()
        const questionAuthor = await cosmosService.getItem<User>('users', existingQuestion.authorId)
        
        const emailType = status === QuestionStatus.RESOLVED 
          ? EmailType.QUESTION_RESOLVED 
          : EmailType.QUESTION_REJECTED

        // 質問投稿者への通知
        if (questionAuthor) {
          await sendNotificationEmail(
            emailType,
            questionAuthor.email,
            {
              question: result.question!,
              author: questionAuthor,
              resolver: status === QuestionStatus.RESOLVED ? authResult.user : undefined,
              rejector: status === QuestionStatus.REJECTED ? authResult.user : undefined,
              recipient: questionAuthor
            }
          )
          // ステータス変更通知メール送信成功
        }

        // 管理者への通知（ステータス変更者が管理者でない場合のみ）
        if (!authResult.user.isAdmin) {
          const adminUsersResult = await getUsers({ isAdmin: true })
          if (adminUsersResult.success && adminUsersResult.users) {
            for (const admin of adminUsersResult.users) {
              await sendNotificationEmail(
                emailType,
                admin.email,
                {
                  question: result.question!,
                  author: questionAuthor ?? undefined,
                  resolver: status === QuestionStatus.RESOLVED ? authResult.user : undefined,
                  rejector: status === QuestionStatus.REJECTED ? authResult.user : undefined,
                  recipient: admin
                }
              )
              // 管理者への通知メール送信成功
            }
          }
        }
      } catch (emailError) {
        console.error('Failed to send status change notification email:', emailError)
        // メール送信エラーは質問更新の成功には影響しない
      }
    }

    return NextResponse.json({
      success: true,
      question: result.question
    })

  } catch (error) {
    console.error('PUT /api/questions/[id] error:', error)
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

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // paramsを待機
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

    // 権限チェック：管理者のみ
    if (!authResult.user.isAdmin) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Only administrators can delete questions'
          }
        },
        { status: 403 }
      )
    }

    // 質問削除
    const result = await deleteQuestion(params.id)
    if (!result.success) {
      return NextResponse.json(
        {
          error: {
            code: 'INTERNAL_ERROR',
            message: result.error || 'Failed to delete question'
          }
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Question deleted successfully'
    })

  } catch (error) {
    console.error('DELETE /api/questions/[id] error:', error)
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