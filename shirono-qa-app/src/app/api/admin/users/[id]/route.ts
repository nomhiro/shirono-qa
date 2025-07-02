import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/auth'
import { updateUser, deleteUser, UserUpdateData } from '@/lib/admin'

/**
 * PUT /api/admin/users/[id] - ユーザー更新（管理者のみ）
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const userId = params.id
    const body = await request.json()
    const { username, email, groupId, isAdmin } = body

    const updateData: UserUpdateData = {
      username: username?.trim(),
      email: email?.trim(),
      groupId,
      isAdmin: Boolean(isAdmin)
    }

    // ユーザー更新
    const result = await updateUser(userId, updateData)

    if (!result.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: result.error || 'Failed to update user' } },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      user: result.user
    })

  } catch (error) {
    console.error('Error in PUT /api/admin/users/[id]:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/users/[id] - ユーザー削除（管理者のみ）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const userId = params.id

    // ユーザー削除
    const result = await deleteUser(userId)

    if (!result.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: result.error || 'Failed to delete user' } },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: result.message
    })

  } catch (error) {
    console.error('Error in DELETE /api/admin/users/[id]:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}