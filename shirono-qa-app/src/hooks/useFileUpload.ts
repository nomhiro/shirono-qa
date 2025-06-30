import { useState, useCallback } from 'react'
import { validateFiles, VALIDATION_LIMITS, ALLOWED_FILE_TYPES } from '../lib/validation'

interface UseFileUploadProps {
  maxFiles?: number
  maxFileSize?: number
  allowedTypes?: string[]
  onFilesChange?: (files: File[]) => void
}

interface FileWithPreview extends File {
  preview?: string
}

export function useFileUpload({
  maxFiles = VALIDATION_LIMITS.MAX_ATTACHMENTS,
  maxFileSize = VALIDATION_LIMITS.MAX_FILE_SIZE,
  allowedTypes = [...ALLOWED_FILE_TYPES],
  onFilesChange
}: UseFileUploadProps = {}) {
  const [files, setFiles] = useState<FileWithPreview[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const validateAndSetFiles = useCallback((newFiles: File[]) => {
    const validation = validateFiles(newFiles, {
      maxCount: maxFiles,
      maxSize: maxFileSize,
      allowedTypes
    })

    setErrors(validation.errors)

    if (validation.valid) {
      const filesWithPreview = newFiles.map(file => {
        const fileWithPreview = file as FileWithPreview
        
        // Create preview for image files
        if (file.type.startsWith('image/')) {
          fileWithPreview.preview = URL.createObjectURL(file)
        }
        
        return fileWithPreview
      })

      setFiles(filesWithPreview)
      onFilesChange?.(newFiles)
      return true
    }

    return false
  }, [maxFiles, maxFileSize, allowedTypes, onFilesChange])

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || [])
    validateAndSetFiles(selectedFiles)
  }, [validateAndSetFiles])

  const addFiles = useCallback((newFiles: File[]) => {
    const allFiles = [...files, ...newFiles]
    return validateAndSetFiles(allFiles)
  }, [files, validateAndSetFiles])

  const removeFile = useCallback((index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index)
    
    // Clean up preview URL
    const removedFile = files[index]
    if (removedFile?.preview) {
      URL.revokeObjectURL(removedFile.preview)
    }

    setFiles(updatedFiles)
    onFilesChange?.(updatedFiles)
    setErrors([]) // Clear errors when removing files
  }, [files, onFilesChange])

  const clearFiles = useCallback(() => {
    // Clean up all preview URLs
    files.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview)
      }
    })

    setFiles([])
    setErrors([])
    onFilesChange?.([])
  }, [files, onFilesChange])

  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }, [])

  return {
    files,
    errors,
    isUploading,
    setIsUploading,
    handleFileSelect,
    addFiles,
    removeFile,
    clearFiles,
    formatFileSize,
    isValid: errors.length === 0,
    totalSize: files.reduce((total, file) => total + file.size, 0)
  }
}