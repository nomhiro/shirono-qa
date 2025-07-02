import { NextRequest, NextResponse } from 'next/server'
import { login } from '../../../../lib/auth'

export async function POST(request: NextRequest) {
  try {

    const body = await request.json()

    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      )
    }

    const result = await login(username, password)

    if (result.success) {
      // セッショントークンをCookieに設定
      const response = NextResponse.json({
        success: true,
        user: result.user,
        sessionToken: result.sessionToken
      })

      response.cookies.set('session', result.sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 6 * 60 * 60 // 6 hours
      })

      return response
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error
        },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error('Login API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}