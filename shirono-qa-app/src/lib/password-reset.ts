import { getCosmosService } from '@/lib/cosmos'
import { hashPassword } from '@/lib/auth'
import { User } from '@/types/auth'
import { v4 as uuidv4 } from 'uuid'
import crypto from 'crypto'

export interface PasswordResetToken {
  id: string
  userId: string
  token: string
  expiresAt: Date
  isValid: boolean
  createdAt: Date
}

export interface PasswordResetRequest {
  success: boolean
  token?: string
  expiresAt?: Date
  message?: string
  error?: string
}

export interface TokenValidation {
  valid: boolean
  userId?: string
  error?: string
}

export interface PasswordResetResult {
  success: boolean
  message?: string
  error?: string
}

/**
 * 暗号学的に安全なパスワードリセットトークンを生成
 */
export function generatePasswordResetToken(): string {
  return crypto.randomBytes(16).toString('hex')
}

/**
 * パスワード複雑性要件を検証
 */
export function validatePasswordStrength(password: string): { valid: boolean; error?: string } {
  // 最小8文字
  if (password.length < 8) {
    return { valid: false, error: 'パスワードは8文字以上である必要があります' }
  }

  // 英字を含む（大文字小文字問わず）
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, error: 'パスワードには英字を含む必要があります' }
  }

  // 数字を含む
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'パスワードには数字を含む必要があります' }
  }

  // 記号を含む
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, error: 'パスワードには特殊文字（!@#$%^&*-_等）を含む必要があります' }
  }

  return { valid: true }
}

/**
 * パスワードリセット要求を作成
 */
export async function createPasswordResetRequest(email: string): Promise<PasswordResetRequest> {
  try {

    const cosmosService = getCosmosService()

    // ユーザーの存在確認
    const users = await cosmosService.queryItems<User>(
      'users',
      'SELECT * FROM c WHERE c.email = @email',
      [{ name: '@email', value: email }]
    )

    // セキュリティのため、ユーザーが存在しない場合でも成功レスポンスを返す
    if (users.length === 0) {
      return {
        success: true,
        message: 'If the email exists in our system, you will receive a password reset link.'
      }
    }

    const user = users[0]

    // 既存の有効なトークンを無効化
    const existingTokens = await cosmosService.queryItems<PasswordResetToken>(
      'password_reset_tokens',
      'SELECT * FROM c WHERE c.userId = @userId AND c.isValid = true',
      [{ name: '@userId', value: user.id }]
    )

    for (const existingToken of existingTokens) {
      const invalidatedToken: PasswordResetToken = {
        ...existingToken,
        isValid: false
      }
      await cosmosService.updateItem('password_reset_tokens', existingToken.id, invalidatedToken)
    }

    // 新しいリセットトークンを生成
    const resetToken = generatePasswordResetToken()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24時間後

    const passwordResetToken: PasswordResetToken = {
      id: uuidv4(),
      userId: user.id,
      token: resetToken,
      expiresAt,
      isValid: true,
      createdAt: new Date()
    }

    await cosmosService.createItem('password_reset_tokens', passwordResetToken)


    return {
      success: true,
      token: resetToken,
      expiresAt,
      message: 'Password reset token created successfully'
    }

  } catch (error) {
    console.error('❌ Error creating password reset request:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * パスワードリセットトークンを検証
 */
export async function validatePasswordResetToken(token: string): Promise<TokenValidation> {
  try {

    const cosmosService = getCosmosService()

    // トークンを検索
    const tokens = await cosmosService.queryItems<PasswordResetToken>(
      'password_reset_tokens',
      'SELECT * FROM c WHERE c.token = @token',
      [{ name: '@token', value: token }]
    )

    if (tokens.length === 0) {
      return {
        valid: false,
        error: 'Invalid or expired token'
      }
    }

    const resetToken = tokens[0]

    // トークンが無効化されているかチェック
    if (!resetToken.isValid) {
      return {
        valid: false,
        error: 'Invalid or expired token'
      }
    }

    // トークンの有効期限をチェック
    if (new Date() > new Date(resetToken.expiresAt)) {
      return {
        valid: false,
        error: 'Token has expired'
      }
    }


    return {
      valid: true,
      userId: resetToken.userId
    }

  } catch (error) {
    console.error('❌ Error validating password reset token:', error)
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * パスワードをリセット
 */
export async function resetPassword(token: string, newPassword: string): Promise<PasswordResetResult> {
  try {

    // パスワード強度を検証
    const passwordValidation = validatePasswordStrength(newPassword)
    if (!passwordValidation.valid) {
      return {
        success: false,
        error: `Password does not meet requirements: ${passwordValidation.error}`
      }
    }

    // トークンを検証
    const tokenValidation = await validatePasswordResetToken(token)
    if (!tokenValidation.valid) {
      return {
        success: false,
        error: tokenValidation.error || 'Invalid token'
      }
    }

    const cosmosService = getCosmosService()

    // ユーザーを取得
    const user = await cosmosService.getItem<User>('users', tokenValidation.userId!)
    if (!user) {
      return {
        success: false,
        error: 'User not found'
      }
    }

    // 新しいパスワードをハッシュ化
    const hashedPassword = await hashPassword(newPassword)

    // ユーザーのパスワードを更新
    const updatedUser: User = {
      ...user,
      passwordHash: hashedPassword
    }

    await cosmosService.updateItem('users', user.id, updatedUser)

    // トークンを無効化
    const tokens = await cosmosService.queryItems<PasswordResetToken>(
      'password_reset_tokens',
      'SELECT * FROM c WHERE c.token = @token',
      [{ name: '@token', value: token }]
    )

    if (tokens.length > 0) {
      const resetToken = tokens[0]
      const invalidatedToken: PasswordResetToken = {
        ...resetToken,
        isValid: false
      }
      await cosmosService.updateItem('password_reset_tokens', resetToken.id, invalidatedToken)
    } else {
      return {
        success: false,
        error: 'Token not found'
      }
    }

    return {
      success: true,
      message: 'Password has been successfully reset'
    }

  } catch (error) {
    console.error('❌ Error resetting password:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * 期限切れトークンをクリーンアップ
 */
export async function cleanupExpiredTokens(): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  try {

    const cosmosService = getCosmosService()

    // 期限切れのトークンを検索
    const expiredTokens = await cosmosService.queryItems<PasswordResetToken>(
      'password_reset_tokens',
      'SELECT * FROM c WHERE c.expiresAt < @now',
      [{ name: '@now', value: new Date().toISOString() }]
    )

    // 期限切れトークンを削除
    let deletedCount = 0
    for (const token of expiredTokens) {
      await cosmosService.deleteItem('password_reset_tokens', token.id)
      deletedCount++
    }


    return {
      success: true,
      deletedCount
    }

  } catch (error) {
    console.error('❌ Error cleaning up expired tokens:', error)
    return {
      success: false,
      deletedCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}