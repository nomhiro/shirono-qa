import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/auth'
import { getUsers, createUser, updateUser, deleteUser, GetUsersQuery, UserCreateData, UserUpdateData } from '@/lib/admin'

/**
 * GET /api/admin/users - 全ユーザー取得（管理者のみ）
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const sessionToken = request.cookies.get('session')?.value
    if (!sessionToken) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const authResult = await validateSession(sessionToken)
    if (!authResult.valid || !authResult.user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Invalid session' } },
        { status: 401 }
      )
    }

    // 管理者権限チェック
    if (!authResult.user.isAdmin) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      )
    }

    // クエリパラメータ取得
    const url = new URL(request.url)
    const query: GetUsersQuery = {}

    const groupId = url.searchParams.get('groupId')
    if (groupId) query.groupId = groupId

    const search = url.searchParams.get('search')
    if (search) query.search = search

    const isAdminParam = url.searchParams.get('isAdmin')
    if (isAdminParam !== null) {
      query.isAdmin = isAdminParam === 'true'
    }

    // ユーザー取得
    const result = await getUsers(query)

    if (!result.success) {
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: result.error || 'Failed to retrieve users' } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      users: result.users
    })

  } catch (error) {
    console.error('Error in GET /api/admin/users:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/users - 新規ユーザー作成（管理者のみ）
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const sessionToken = request.cookies.get('session')?.value
    if (!sessionToken) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const authResult = await validateSession(sessionToken)
    if (!authResult.valid || !authResult.user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Invalid session' } },
        { status: 401 }
      )
    }

    // 管理者権限チェック
    if (!authResult.user.isAdmin) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      )
    }

    // リクエストボディ取得
    const body = await request.json()
    const { username, email, password, groupId, isAdmin } = body

    // 個別フィールドの検証
    if (!username || username.trim().length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Username is required' } },
        { status: 400 }
      )
    }
    if (!email || email.trim().length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Email is required' } },
        { status: 400 }
      )
    }
    if (!password || password.trim().length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Password is required' } },
        { status: 400 }
      )
    }
    if (!groupId || groupId.trim().length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Group is required' } },
        { status: 400 }
      )
    }

    const userData: UserCreateData = {
      username: username.trim(),
      email: email.trim(),
      password,
      groupId,
      isAdmin: Boolean(isAdmin)
    }

    // ユーザー作成
    const result = await createUser(userData)

    if (!result.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: result.error || 'Failed to create user' } },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      user: result.user
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/admin/users:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}