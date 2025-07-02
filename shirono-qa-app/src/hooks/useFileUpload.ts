import { useState, useCallback } from 'react'
import { validateFiles, VALIDATION_LIMITS, ALLOWED_FILE_TYPES } from '../lib/validation'

interface UseFileUploadProps {
  maxFiles?: number
  maxFileSize?: number
  allowedTypes?: string[]
  onFilesChange?: (files: File[]) => void
}

interface FileData {
  id: string
  file: File
}

export function useFileUpload({
  maxFiles = VALIDATION_LIMITS.MAX_ATTACHMENTS,
  maxFileSize = VALIDATION_LIMITS.MAX_FILE_SIZE,
  allowedTypes = [...ALLOWED_FILE_TYPES],
  onFilesChange
}: UseFileUploadProps = {}) {
  const [files, setFiles] = useState<FileData[]>([])
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isUploading, setIsUploading] = useState(false)

  const generateFileId = useCallback(() => {
    return `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }, [])

  const addFile = useCallback((file: File) => {
    // Check if we're at max files
    if (files.length >= maxFiles) {
      const errorId = generateFileId()
      setErrors(prev => ({
        ...prev,
        [errorId]: `最大${maxFiles}ファイルまでアップロードできます`
      }))
      return
    }

    // Validate single file
    const validation = validateFiles([file], {
      maxCount: 1,
      maxSize: maxFileSize,
      allowedTypes
    })

    const fileId = generateFileId()

    if (!validation.valid) {
      setErrors(prev => ({
        ...prev,
        [fileId]: validation.errors[0] || 'ファイルが無効です'
      }))
      return
    }

    // Clear any existing errors for this operation
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[fileId]
      return newErrors
    })

    const fileData: FileData = {
      id: fileId,
      file
    }

    // Create preview for image files
    if (file.type.startsWith('image/')) {
      const previewUrl = URL.createObjectURL(file)
      setPreviews(prev => ({
        ...prev,
        [fileId]: previewUrl
      }))
    }

    // Add file to list
    setFiles(prev => {
      const newFiles = [...prev, fileData]
      onFilesChange?.(newFiles.map(f => f.file))
      return newFiles
    })
  }, [files.length, maxFiles, maxFileSize, allowedTypes, onFilesChange, generateFileId])

  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => {
      const newFiles = prev.filter(f => f.id !== fileId)
      onFilesChange?.(newFiles.map(f => f.file))
      return newFiles
    })

    // Clean up preview URL
    setPreviews(prev => {
      const newPreviews = { ...prev }
      if (newPreviews[fileId]) {
        URL.revokeObjectURL(newPreviews[fileId])
        delete newPreviews[fileId]
      }
      return newPreviews
    })

    // Clear any errors for this file
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[fileId]
      return newErrors
    })
  }, [onFilesChange])

  const clearFiles = useCallback(() => {
    // Clean up all preview URLs
    Object.values(previews).forEach(url => {
      URL.revokeObjectURL(url)
    })

    setFiles([])
    setPreviews({})
    setErrors({})
    onFilesChange?.([])
  }, [previews, onFilesChange])

  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }, [])

  return {
    files,
    previews,
    errors,
    isUploading,
    setIsUploading,
    addFile,
    removeFile,
    clearFiles,
    formatFileSize,
    isValid: Object.keys(errors).length === 0,
    totalSize: files.reduce((total, file) => total + file.file.size, 0)
  }
}