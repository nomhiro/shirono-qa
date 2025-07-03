import { NextRequest, NextResponse } from 'next/server'
import { createPasswordResetRequest } from '@/lib/password-reset'
import { sendPasswordResetEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'メールアドレスが必要です' } },
        { status: 400 }
      )
    }

    // メールアドレス形式の簡単な検証
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: '有効なメールアドレスを入力してください' } },
        { status: 400 }
      )
    }

    // パスワードリセットトークンを生成
    const result = await createPasswordResetRequest(email)

    if (!result.success) {
      // セキュリティのため、ユーザーが存在しない場合でも成功レスポンスを返す
      // 実際にはメールは送信されない
      if (result.error === 'USER_NOT_FOUND') {
        return NextResponse.json({
          success: true,
          message: 'パスワードリセット用のメールを送信しました。メールボックスをご確認ください。'
        })
      }

      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'パスワードリセットの処理中にエラーが発生しました' } },
        { status: 500 }
      )
    }

    // パスワードリセット用メールを送信
    const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password?token=${result.token}`
    
    try {
      await sendPasswordResetEmail(email, resetUrl)
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError)
      // メール送信に失敗してもトークンは有効なので、エラーは返さない
      // ただし、ログには記録する
    }

    return NextResponse.json({
      success: true,
      message: 'パスワードリセット用のメールを送信しました。メールボックスをご確認ください。'
    })

  } catch (error) {
    console.error('Password reset request error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'サーバーエラーが発生しました' } },
      { status: 500 }
    )
  }
}