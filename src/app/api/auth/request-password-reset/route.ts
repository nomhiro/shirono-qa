import { NextRequest, NextResponse } from 'next/server'
import { requestPasswordReset } from '@/lib/password-reset'
import { sendEmail } from '@/lib/email'

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
    const result = await requestPasswordReset(email)

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
    
    const emailSubject = '[shiro Assistant] パスワードリセットのご案内'
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1976d2;">パスワードリセットのご案内</h2>
        <p>shiro Assistantのパスワードリセットが要求されました。</p>
        <p>以下のリンクをクリックして、新しいパスワードを設定してください：</p>
        <div style="margin: 20px 0;">
          <a href="${resetUrl}" style="background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">パスワードをリセット</a>
        </div>
        <p style="color: #666; font-size: 14px;">
          このリンクは24時間で有効期限が切れます。<br/>
          パスワードリセットを要求していない場合は、このメールを無視してください。
        </p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;"/>
        <p style="color: #999; font-size: 12px;">
          shiro Assistant<br/>
          このメールは自動送信されています。返信はしないでください。
        </p>
      </div>
    `

    const emailText = `
パスワードリセットのご案内

shiro Assistantのパスワードリセットが要求されました。

以下のリンクをクリックして、新しいパスワードを設定してください：
${resetUrl}

このリンクは24時間で有効期限が切れます。
パスワードリセットを要求していない場合は、このメールを無視してください。

---
shiro Assistant
このメールは自動送信されています。返信はしないでください。
    `

    try {
      await sendEmail({
        to: email,
        subject: emailSubject,
        html: emailHtml,
        text: emailText
      })
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