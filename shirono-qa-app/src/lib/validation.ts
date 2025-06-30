interface ValidationResult {
  valid: boolean
  errors: string[]
}

export interface ValidationRule<T> {
  validate: (value: T) => string | null
  message?: string
}

export interface FileValidationRule {
  maxSize?: number
  maxCount?: number
  allowedTypes?: string[]
}

export class ValidationBuilder<T> {
  private rules: ValidationRule<T>[] = []

  required(message = 'This field is required'): ValidationBuilder<T> {
    this.rules.push({
      validate: (value: T) => {
        if (value === null || value === undefined) return message
        if (typeof value === 'string' && value.trim() === '') return message
        return null
      }
    })
    return this
  }

  maxLength(max: number, message?: string): ValidationBuilder<T> {
    this.rules.push({
      validate: (value: T) => {
        if (typeof value === 'string' && value.length > max) {
          return message || `Must be ${max} characters or less`
        }
        return null
      }
    })
    return this
  }

  minLength(min: number, message?: string): ValidationBuilder<T> {
    this.rules.push({
      validate: (value: T) => {
        if (typeof value === 'string' && value.length < min) {
          return message || `Must be at least ${min} characters`
        }
        return null
      }
    })
    return this
  }

  custom(validator: (value: T) => string | null): ValidationBuilder<T> {
    this.rules.push({ validate: validator })
    return this
  }

  validate(value: T): ValidationResult {
    const errors: string[] = []
    
    for (const rule of this.rules) {
      const error = rule.validate(value)
      if (error) {
        errors.push(error)
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

export function validateFiles(files: File[], rules: FileValidationRule = {}): ValidationResult {
  const errors: string[] = []
  const { maxSize = Infinity, maxCount = Infinity, allowedTypes } = rules

  if (files.length > maxCount) {
    errors.push(`Maximum ${maxCount} files allowed`)
  }

  for (const file of files) {
    if (file.size > maxSize) {
      errors.push(`File "${file.name}" exceeds maximum size`)
    }

    if (allowedTypes && !allowedTypes.includes(file.type)) {
      errors.push(`File "${file.name}" has unsupported type`)
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

export function createValidator<T>(): ValidationBuilder<T> {
  return new ValidationBuilder<T>()
}

// Common validation constants
export const VALIDATION_LIMITS = {
  QUESTION_TITLE_MAX: 100,
  QUESTION_CONTENT_MAX: 10000,
  ANSWER_CONTENT_MAX: 10000,
  COMMENT_CONTENT_MAX: 1000,
  MAX_ATTACHMENTS: 5,
  MAX_FILE_SIZE: 1024 * 1024 * 1024, // 1GB
} as const

export const ALLOWED_FILE_TYPES = [
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Text files
  'text/plain',
  'text/csv',
  'application/json',
  'application/xml',
  'text/xml',
  // Programming files
  'text/javascript',
  'application/javascript',
  'text/typescript',
  'text/html',
  'text/css',
  'application/x-python',
  'text/x-python',
  'text/x-csharp',
  'application/x-sql',
  // Archives
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed'
] as const

// Security validation functions
export function validateFileName(fileName: string): ValidationResult {
  const errors: string[] = []
  
  // Check for potentially malicious file names
  const dangerousPatterns = [
    { pattern: /\.\./, message: 'ファイル名にディレクトリトラバーサル文字(..)を含むことはできません' },
    { pattern: /[<>:"|?*]/, message: 'ファイル名に無効な文字が含まれています' },
    { pattern: /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i, message: 'Windowsの予約ファイル名は使用できません' },
    { pattern: /^\./, message: '隠しファイル名は使用できません' },
    { pattern: /\.(exe|bat|cmd|scr|pif|com|dll)$/i, message: '実行可能ファイルはアップロードできません' }
  ]
  
  for (const { pattern, message } of dangerousPatterns) {
    if (pattern.test(fileName)) {
      errors.push(message)
    }
  }
  
  if (fileName.length > 255) {
    errors.push('ファイル名が長すぎます（255文字以下）')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

export function sanitizeInput(input: string): string {
  // Remove null bytes and control characters
  return input
    .replace(/\0/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim()
}

export function sanitizeHtml(input: string): string {
  // Basic HTML sanitization - remove script tags and potentially dangerous attributes
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/data:/gi, '')
}

// Password validation with security requirements
export function validatePassword(password: string): ValidationResult {
  const errors: string[] = []
  
  if (password.length < 8) {
    errors.push('8文字以上で入力してください')
  }
  
  if (!/[a-zA-Z]/.test(password)) {
    errors.push('英字を含む必要があります')
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('数字を含む必要があります')
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('記号(!@#$%^&*等)を含む必要があります')
  }
  
  // Check for common weak passwords
  const weakPasswords = [
    'password', 'password123', '123456', '123456789', 'qwerty',
    'abc123', 'password1', 'admin', 'user', 'guest'
  ]
  
  if (weakPasswords.includes(password.toLowerCase())) {
    errors.push('より安全なパスワードを設定してください')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

// Email validation
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = []
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  
  if (!emailRegex.test(email)) {
    errors.push('有効なメールアドレスを入力してください')
  }
  
  if (email.length > 254) {
    errors.push('メールアドレスが長すぎます')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

// Username validation
export function validateUsername(username: string): ValidationResult {
  const errors: string[] = []
  
  if (username.length < 3) {
    errors.push('3文字以上で入力してください')
  }
  
  if (username.length > 50) {
    errors.push('50文字以下で入力してください')
  }
  
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    errors.push('英数字、ハイフン、アンダースコアのみ使用できます')
  }
  
  // Reserved usernames
  const reservedNames = ['admin', 'root', 'system', 'api', 'www', 'mail', 'ftp']
  if (reservedNames.includes(username.toLowerCase())) {
    errors.push('このユーザー名は予約されています')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}