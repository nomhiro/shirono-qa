import { NextRequest, NextResponse } from 'next/server'
import { resetPassword } from '@/lib/password-reset'

export async function POST(request: NextRequest) {
  try {
    const { token, newPassword } = await request.json()

    // 入力検証
    if (!token || !newPassword) {
      return NextResponse.json(
        { 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'トークンと新しいパスワードが必要です' 
          } 
        },
        { status: 400 }
      )
    }

    // トークンの形式検証（32文字のhex文字列）
    if (!/^[a-f0-9]{32}$/.test(token)) {
      return NextResponse.json(
        { 
          error: { 
            code: 'INVALID_TOKEN', 
            message: '無効なトークン形式です' 
          }
        },
        { status: 400 }
      )
    }

    // パスワードの複雑性検証
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return NextResponse.json(
        { 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'パスワードは8文字以上である必要があります' 
          }
        },
        { status: 400 }
      )
    }

    // 英字、数字、特殊文字の要求
    const hasLetter = /[a-zA-Z]/.test(newPassword)
    const hasDigit = /\d/.test(newPassword)
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword)

    if (!hasLetter || !hasDigit || !hasSpecial) {
      return NextResponse.json(
        { 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'パスワードには英字、数字、特殊文字（!@#$%^&*等）を含む必要があります' 
          }
        },
        { status: 400 }
      )
    }

    // パスワードをリセット
    const result = await resetPassword(token, newPassword)

    if (!result.success) {
      let message = 'パスワードリセットに失敗しました'
      let statusCode = 400

      switch (result.error) {
        case 'TOKEN_NOT_FOUND':
          message = 'トークンが見つかりません'
          statusCode = 404
          break
        case 'TOKEN_EXPIRED':
          message = 'トークンの有効期限が切れています。再度パスワードリセットを要求してください'
          statusCode = 400
          break
        case 'TOKEN_ALREADY_USED':
          message = 'このトークンは既に使用済みです。再度パスワードリセットを要求してください'
          statusCode = 400
          break
        case 'USER_NOT_FOUND':
          message = 'ユーザーが見つかりません'
          statusCode = 404
          break
        case 'WEAK_PASSWORD':
          message = 'パスワードが安全性要件を満たしていません'
          statusCode = 400
          break
        default:
          message = 'パスワードリセット処理中にエラーが発生しました'
          statusCode = 500
      }

      return NextResponse.json(
        { error: { code: result.error, message } },
        { status: statusCode }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'パスワードが正常にリセットされました。新しいパスワードでログインしてください。',
      user: {
        id: result.user.id,
        username: result.user.username,
        email: result.user.email
      }
    })

  } catch (error) {
    console.error('Password reset error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'サーバーエラーが発生しました' } },
      { status: 500 }
    )
  }
}