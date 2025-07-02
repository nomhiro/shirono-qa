import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '../../../../lib/auth'

export async function GET(request: NextRequest) {
  try {
    // セッショントークンをCookieから取得
    const sessionToken = request.cookies.get('session')?.value

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // セッション検証
    const validation = await validateSession(sessionToken)
    
    if (!validation.valid || !validation.user) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      )
    }

    // ユーザー情報を返す
    return NextResponse.json({
      user: {
        id: validation.user.id,
        username: validation.user.username,
        email: validation.user.email,
        groupId: validation.user.groupId,
        isAdmin: validation.user.isAdmin,
        createdAt: validation.user.createdAt,
        lastLoginAt: validation.user.lastLoginAt
      }
    })
  } catch (error) {
    console.error('Authentication check failed:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}