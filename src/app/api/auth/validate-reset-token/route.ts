import { NextRequest, NextResponse } from 'next/server'
import { validateResetToken } from '@/lib/password-reset'

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
    const result = await validateResetToken(token)

    if (!result.success) {
      let message = 'トークンが無効です'
      
      switch (result.error) {
        case 'TOKEN_NOT_FOUND':
          message = 'トークンが見つかりません'
          break
        case 'TOKEN_EXPIRED':
          message = 'トークンの有効期限が切れています'
          break
        case 'TOKEN_ALREADY_USED':
          message = 'このトークンは既に使用済みです'
          break
        case 'USER_NOT_FOUND':
          message = 'ユーザーが見つかりません'
          break
        default:
          message = 'トークンが無効です'
      }

      return NextResponse.json({
        valid: false,
        error: { code: result.error, message }
      })
    }

    return NextResponse.json({
      valid: true,
      user: {
        id: result.user.id,
        username: result.user.username,
        email: result.user.email
      }
    })

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