export enum ErrorCodes {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE'
}

export interface AppError {
  code: ErrorCodes
  message: string
  details?: Record<string, unknown>
}

export class ErrorHandler {
  static createValidationError(message: string, details?: Record<string, unknown>): AppError {
    return {
      code: ErrorCodes.VALIDATION_ERROR,
      message,
      details
    }
  }

  static createNotFoundError(resource: string): AppError {
    return {
      code: ErrorCodes.NOT_FOUND,
      message: `${resource} not found`,
      details: { resource }
    }
  }

  static createInternalError(message = 'Internal server error'): AppError {
    return {
      code: ErrorCodes.INTERNAL_ERROR,
      message
    }
  }

  static logError(error: unknown, context?: string): void {
    const timestamp = new Date().toISOString()
    const contextStr = context ? ` [${context}]` : ''
    
    if (error instanceof Error) {
      console.error(`${timestamp}${contextStr} Error:`, error.message)
      console.error('Stack:', error.stack)
    } else {
      console.error(`${timestamp}${contextStr} Unknown error:`, error)
    }
  }

  static handleAsyncError<T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<T | AppError> {
    return operation().catch(error => {
      this.logError(error, context)
      return this.createInternalError()
    })
  }
}

export function isAppError(value: unknown): value is AppError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'message' in value &&
    Object.values(ErrorCodes).includes((value as AppError).code)
  )
}

export function createSuccessResult<T>(data: T): { success: true; data: T } {
  return { success: true, data }
}

export function createErrorResult(error: AppError): { success: false; error: AppError } {
  return { success: false, error }
}