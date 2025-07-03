'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Link,
  InputAdornment,
  IconButton
} from '@mui/material'
import { 
  Visibility, 
  VisibilityOff, 
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  ArrowBack as ArrowBackIcon 
} from '@mui/icons-material'
import NextLink from 'next/link'

interface TokenValidationResult {
  valid: boolean
  user?: {
    id: string
    username: string
    email: string
  }
  error?: {
    code: string
    message: string
  }
}

export default function ResetPasswordContent() {
  const [token, setToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [validatingToken, setValidatingToken] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)
  const [userInfo, setUserInfo] = useState<{ username: string; email: string } | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [resetComplete, setResetComplete] = useState(false)
  
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const tokenParam = searchParams.get('token')
    if (tokenParam) {
      setToken(tokenParam)
      validateToken(tokenParam)
    } else {
      setError('無効なリンクです。パスワードリセットを再度要求してください。')
      setValidatingToken(false)
    }
  }, [searchParams])

  const validateToken = async (tokenValue: string) => {
    setValidatingToken(true)
    setError('')

    try {
      const response = await fetch(`/api/auth/validate-reset-token?token=${encodeURIComponent(tokenValue)}`)
      const data: TokenValidationResult = await response.json()

      if (data.valid && data.user) {
        setTokenValid(true)
        setUserInfo({ username: data.user.username, email: data.user.email })
      } else {
        setTokenValid(false)
        setError(data.error?.message || 'トークンが無効です')
      }
    } catch (error) {
      console.error('Token validation error:', error)
      setError('トークンの検証中にエラーが発生しました')
      setTokenValid(false)
    } finally {
      setValidatingToken(false)
    }
  }

  const validatePassword = (password: string): string[] => {
    const errors: string[] = []
    
    if (password.length < 8) {
      errors.push('パスワードは8文字以上である必要があります')
    }
    
    if (!/[a-zA-Z]/.test(password)) {
      errors.push('パスワードには英字を含む必要があります')
    }
    
    if (!/\d/.test(password)) {
      errors.push('パスワードには数字を含む必要があります')
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>\-_]/.test(password)) {
      errors.push('パスワードには特殊文字（!@#$%^&*-_等）を含む必要があります')
    }
    
    return errors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newPassword.trim() || !confirmPassword.trim()) {
      setError('全ての項目を入力してください')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('パスワードが一致しません')
      return
    }

    const passwordErrors = validatePassword(newPassword)
    if (passwordErrors.length > 0) {
      setError(passwordErrors.join('、'))
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          token: token,
          newPassword: newPassword 
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setMessage(data.message)
        setResetComplete(true)
      } else {
        setError(data.error?.message || 'パスワードリセットに失敗しました')
      }
    } catch (error) {
      console.error('Password reset error:', error)
      setError('ネットワークエラーが発生しました。もう一度お試しください。')
    } finally {
      setLoading(false)
    }
  }

  if (validatingToken) {
    return (
      <Container component="main" maxWidth="sm">
        <Box
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Paper
            elevation={3}
            sx={{
              padding: 4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%',
            }}
          >
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="h6">トークンを検証中...</Typography>
          </Paper>
        </Box>
      </Container>
    )
  }

  if (!tokenValid) {
    return (
      <Container component="main" maxWidth="sm">
        <Box
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Paper
            elevation={3}
            sx={{
              padding: 4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%',
            }}
          >
            <ErrorIcon sx={{ fontSize: 48, color: 'error.main', mb: 2 }} />
            <Typography component="h1" variant="h5" gutterBottom>
              無効なリンク
            </Typography>
            
            <Alert severity="error" sx={{ width: '100%', mb: 3 }}>
              {error}
            </Alert>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
              リンクの有効期限が切れているか、既に使用済みの可能性があります。
              <br />
              新しいパスワードリセットを要求してください。
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
              <Button
                variant="contained"
                onClick={() => router.push('/forgot-password')}
                sx={{ minWidth: 160 }}
              >
                パスワードリセット要求
              </Button>
              <Button
                variant="outlined"
                startIcon={<ArrowBackIcon />}
                onClick={() => router.push('/login')}
                sx={{ minWidth: 140 }}
              >
                ログインに戻る
              </Button>
            </Box>
          </Paper>
        </Box>
      </Container>
    )
  }

  if (resetComplete) {
    return (
      <Container component="main" maxWidth="sm">
        <Box
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Paper
            elevation={3}
            sx={{
              padding: 4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%',
            }}
          >
            <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main', mb: 2, alignSelf: 'center' }} />
            <Typography component="h1" variant="h5" gutterBottom sx={{ textAlign: 'center' }}>
              パスワードリセット完了
            </Typography>
            
            <Alert severity="success" sx={{ width: '100%', mb: 3 }}>
              {message}
            </Alert>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
              新しいパスワードでログインしてください。
            </Typography>

            <Button
              variant="contained"
              fullWidth
              onClick={() => router.push('/login')}
              sx={{ py: 1.5 }}
            >
              ログインページへ
            </Button>
          </Paper>
        </Box>
      </Container>
    )
  }

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <Typography component="h1" variant="h4" gutterBottom>
            新しいパスワード設定
          </Typography>
          
          {userInfo && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
              ユーザー: {userInfo.username} ({userInfo.email})
            </Typography>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
            新しいパスワードを設定してください。
            <br />
            パスワードは8文字以上で、英字・数字・特殊文字（!@#$%^&*-_等）を含む必要があります。
          </Typography>

          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}

          {message && (
            <Alert severity="info" sx={{ width: '100%', mb: 2 }}>
              {message}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              name="newPassword"
              label="新しいパスワード"
              type={showPassword ? 'text' : 'password'}
              id="newPassword"
              autoComplete="new-password"
              autoFocus
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="パスワードを表示"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="パスワード確認"
              type={showPassword ? 'text' : 'password'}
              id="confirmPassword"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              error={confirmPassword !== '' && newPassword !== confirmPassword}
              helperText={
                confirmPassword !== '' && newPassword !== confirmPassword
                  ? 'パスワードが一致しません'
                  : ''
              }
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, py: 1.5 }}
              disabled={loading || !newPassword.trim() || !confirmPassword.trim()}
            >
              {loading ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  設定中...
                </>
              ) : (
                'パスワードを設定'
              )}
            </Button>

            <Box sx={{ textAlign: 'center' }}>
              <Link component={NextLink} href="/login" variant="body2">
                ログインページに戻る
              </Link>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  )
}