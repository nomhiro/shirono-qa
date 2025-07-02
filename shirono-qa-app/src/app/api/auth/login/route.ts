import { NextRequest, NextResponse } from 'next/server'
import { login } from '../../../../lib/auth'

export async function POST(request: NextRequest) {
  try {
    console.log('Login API called')
    
    const body = await request.json()
    console.log('Request body:', body)
    
    const { username, password } = body

    if (!username || !password) {
      console.log('Missing username or password')
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      )
    }

    console.log('Attempting to login user:', username)
    const result = await login(username, password)
    console.log('Login result:', result)

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