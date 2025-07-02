import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/auth'
import { getUserById } from '@/lib/database'

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

    const userId = params.id

    // ユーザー情報取得
    const user = await getUserById(userId)
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // パスワードハッシュを除外してレスポンス
    const { passwordHash, ...userWithoutPassword } = user

    return NextResponse.json({
      success: true,
      user: userWithoutPassword
    })

  } catch (error) {
    console.error('Get user API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}