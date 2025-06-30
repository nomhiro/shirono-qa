import { NextRequest, NextResponse } from 'next/server'
import { logout } from '../../../../lib/auth'

export async function POST(request: NextRequest) {
  try {
    // セッショントークンをCookieから取得
    const sessionToken = request.cookies.get('session')?.value

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // ログアウト処理
    const result = await logout(sessionToken)
    
    // クッキーをクリア
    const response = NextResponse.json({
      success: result.success,
      error: result.error
    }, { 
      status: result.success ? 200 : 400 
    })
    
    if (result.success) {
      response.cookies.set('session', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 0 // すぐに期限切れにしてクリア
      })
    }
    
    return response
  } catch (error) {
    console.error('Logout API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}