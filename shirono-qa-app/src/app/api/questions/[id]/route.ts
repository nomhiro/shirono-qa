import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/auth'
import { getQuestion, updateQuestion, deleteQuestion, validateQuestionData } from '@/lib/questions'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
  { params }: { params: { id: string } }
) {
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

    // 権限チェック：作成者または管理者のみ
    if (!authResult.user.isAdmin && existingQuestion.authorId !== authResult.user.id) {
      return NextResponse.json(
        { 
          error: { 
            code: 'FORBIDDEN', 
            message: 'Only the question author or admin can update this question' 
          } 
        },
        { status: 403 }
      )
    }

    // リクエストボディ取得
    const body = await request.json()
    const { title, content, priority, status } = body

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
    const updateData: any = {}
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
  { params }: { params: { id: string } }
) {
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

    // 権限チェック：作成者または管理者のみ
    if (!authResult.user.isAdmin && existingQuestion.authorId !== authResult.user.id) {
      return NextResponse.json(
        { 
          error: { 
            code: 'FORBIDDEN', 
            message: 'Only the question author or admin can delete this question' 
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