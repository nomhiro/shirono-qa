import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '../../../../../lib/auth'
import { createComment, getCommentsByQuestion } from '../../../../../lib/answers'
import { getQuestion } from '../../../../../lib/questions'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
  { params }: { params: { id: string } }
) {
  try {
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
    const body = await request.json()

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
    const commentResult = await createComment(body, questionId, validation.user.id)
    if (!commentResult.success) {
      return NextResponse.json(
        { error: commentResult.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      comment: commentResult.comment
    }, { status: 201 })
  } catch (error) {
    console.error('Create comment API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}