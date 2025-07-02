import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/auth'
import { getQuestions, createQuestion, validateQuestionData } from '@/lib/questions'
import { generateTags } from '@/lib/openai'
import { QuestionStatus, QuestionPriority } from '@/types/question'
import { sendNotificationEmail, EmailType } from '@/lib/email'
import { getUsers } from '@/lib/admin'

export async function GET(request: NextRequest) {
  try {
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

    // クエリパラメータ取得
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const statusParam = searchParams.get('status')
    const priorityParam = searchParams.get('priority')
    const search = searchParams.get('search')

    // 型変換（複数ステータス対応）
    let statusArray: QuestionStatus[] | undefined
    if (statusParam) {
      if (statusParam.includes(',')) {
        // カンマ区切りの複数ステータス
        const statuses = statusParam.split(',').map(s => s.trim())
        const validStatuses = statuses.filter(s => 
          Object.values(QuestionStatus).includes(s as QuestionStatus)
        ) as QuestionStatus[]
        statusArray = validStatuses.length > 0 ? validStatuses : undefined
      } else {
        // 単一ステータス
        const singleStatus = Object.values(QuestionStatus).includes(statusParam as QuestionStatus)
          ? (statusParam as QuestionStatus)
          : undefined
        statusArray = singleStatus ? [singleStatus] : undefined
      }
    }
    const priority = priorityParam && Object.values(QuestionPriority).includes(priorityParam as QuestionPriority)
      ? (priorityParam as QuestionPriority)
      : undefined

    // 質問データ取得
    const queryData = {
      page,
      limit,
      groupId: authResult.user.isAdmin ? undefined : authResult.user.groupId,
      statusArray,
      priority,
      search: search || undefined
    }

    const result = await getQuestions(queryData)

    if (!result.success) {
      return NextResponse.json(
        {
          error: {
            code: 'INTERNAL_ERROR',
            message: result.error || 'Failed to fetch questions'
          }
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      questions: result.questions,
      total: result.total,
      page: result.page
    })
  } catch (error) {
    console.error('GET /api/questions error:', error)
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

export async function POST(request: NextRequest) {
  try {
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

    // リクエストボディ取得
    const body = await request.json()
    const { title, content, priority } = body

    // データ検証
    const validation = validateQuestionData({ title, content, priority })
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

    // AI自動タグ付け（失敗しても継続）
    let tags: string[] = []
    try {
      const tagsResult = await generateTags(title, content)
      if (tagsResult.tags) {
        tags = tagsResult.tags
      }
    } catch (error) {
      console.warn('AI tagging failed:', error)
      // タグ付けに失敗してもエラーにしない
    }

    // 質問作成
    const result = await createQuestion(
      { title, content, priority },
      authResult.user.id,
      authResult.user.groupId
    )

    if (!result.success) {
      return NextResponse.json(
        {
          error: {
            code: 'INTERNAL_ERROR',
            message: result.error || 'Failed to create question'
          }
        },
        { status: 500 }
      )
    }

    // タグを更新（別途処理）
    if (tags.length > 0) {
      result.question!.tags = tags
    }

    // 管理者にメール通知を送信（非同期、エラーが発生しても質問作成は成功とする）
    if (result.question) {
      try {
        // 管理者ユーザーを取得してメール送信
        const adminResult = await getUsers({ isAdmin: true })
        if (adminResult.success && adminResult.users) {
          for (const admin of adminResult.users) {
            try {
              await sendNotificationEmail(
                EmailType.QUESTION_POSTED,
                admin.email,
                {
                  question: result.question,
                  author: authResult.user,
                  recipient: admin
                }
              )
              // メール送信成功（重要なログなので残す）
            } catch (singleEmailError) {
              console.error(`Failed to send email to ${admin.email}:`, singleEmailError)
            }
          }
        }
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError)
        // メール送信エラーは質問作成の成功には影響しない
      }
    }

    return NextResponse.json({
      success: true,
      question: result.question
    }, { status: 201 })

  } catch (error) {
    console.error('POST /api/questions error:', error)
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