import { NextRequest, NextResponse } from 'next/server'
import { validatePasswordResetToken } from '@/lib/password-reset'
import { User } from '@/types/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'トークンパラメータが必要です' } },
        { status: 400 }
      )
    }

    // トークンの形式検証（32文字のhex文字列）
    if (!/^[a-f0-9]{32}$/.test(token)) {
      return NextResponse.json(
        { 
          valid: false, 
          error: { code: 'INVALID_TOKEN', message: '無効なトークン形式です' }
        },
        { status: 400 }
      )
    }

    // トークンを検証
    const result = await validatePasswordResetToken(token)

    if (!result.valid) {
      let message = 'トークンが無効です'
      
      if (result.error) {
        message = result.error
      }

      return NextResponse.json({
        valid: false,
        error: { code: 'INVALID_TOKEN', message }
      })
    }

    // ユーザー情報を取得するため、追加の処理が必要
    // 現在のライブラリはuserIdのみ返すため、ユーザー詳細情報を取得
    const { getCosmosService } = await import('@/lib/cosmos')
    const cosmosService = getCosmosService()
    
    try {
      const users = await cosmosService.queryItems<User>(
        'users',
        'SELECT * FROM c WHERE c.id = @userId',
        [{ name: '@userId', value: result.userId }]
      )

      if (users.length === 0) {
        return NextResponse.json({
          valid: false,
          error: { code: 'USER_NOT_FOUND', message: 'ユーザーが見つかりません' }
        })
      }

      const user = users[0]
      return NextResponse.json({
        valid: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      })
    } catch (dbError) {
      console.error('Database error during user lookup:', dbError)
      return NextResponse.json({
        valid: false,
        error: { code: 'INTERNAL_ERROR', message: 'データベースエラーが発生しました' }
      })
    }

  } catch (error) {
    console.error('Token validation error:', error)
    return NextResponse.json(
      { 
        valid: false,
        error: { code: 'INTERNAL_ERROR', message: 'サーバーエラーが発生しました' }
      },
      { status: 500 }
    )
  }
}