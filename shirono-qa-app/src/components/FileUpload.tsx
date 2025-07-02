'use client'

import React, { useCallback, useEffect, useState } from 'react'
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  LinearProgress,
  Alert,
} from '@mui/material'
import {
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  InsertDriveFile as FileIcon,
  Image as ImageIcon,
} from '@mui/icons-material'
import { useFileUpload } from '@/hooks/useFileUpload'
import Image from 'next/image'

interface FileUploadProps {
  onFilesChange: (files: File[]) => void
  maxFiles?: number
  accept?: string
}

export default function FileUpload({
  onFilesChange,
  maxFiles = 5,
  accept = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif'
}: FileUploadProps) {
  const {
    files,
    previews,
    errors,
    isUploading,
    addFile,
    removeFile,
  } = useFileUpload()

  const [isDragOver, setIsDragOver] = useState(false)

  // Notify parent component when files change
  useEffect(() => {
    onFilesChange(files.map(f => f.file))
  }, [files, onFilesChange])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || [])
    selectedFiles.forEach(file => addFile(file))
    // Reset input value to allow selecting the same file again
    event.target.value = ''
  }

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(false)

    const droppedFiles = Array.from(event.dataTransfer.files)
    droppedFiles.forEach(file => addFile(file))
  }, [addFile])

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDragEnter = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(true)
  }, [])

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <ImageIcon color="primary" />
    }
    return <FileIcon color="action" />
  }

  const isMaxFilesReached = files.length >= maxFiles

  return (
    <Box>
      {/* Dropzone */}
      <Paper
        data-testid="dropzone"
        className={isDragOver ? 'drag-over' : ''}
        elevation={isDragOver ? 3 : 1}
        sx={{
          p: 3,
          textAlign: 'center',
          backgroundColor: isDragOver ? 'action.hover' : 'background.paper',
          border: isDragOver ? '2px dashed primary.main' : '2px dashed',
          borderColor: isDragOver ? 'primary.main' : 'divider',
          cursor: isMaxFilesReached ? 'not-allowed' : 'pointer',
          opacity: isMaxFilesReached ? 0.6 : 1,
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDragEnter={handleDragEnter}
        onClick={() => {
          if (!isMaxFilesReached) {
            document.getElementById('file-input')?.click()
          }
        }}
      >
        <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          ファイルをドラッグ&ドロップ
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          または クリックしてファイルを選択
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {isMaxFilesReached
            ? '最大ファイル数に達しました'
            : `最大${maxFiles}ファイル、1ファイルあたり最大1GB`
          }
        </Typography>

        <input
          id="file-input"
          data-testid="file-input"
          type="file"
          multiple
          accept={accept}
          onChange={handleFileSelect}
          disabled={isMaxFilesReached}
          style={{ display: 'none' }}
        />
      </Paper>

      {/* Upload Progress */}
      {isUploading && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" gutterBottom>
            アップロード中...
          </Typography>
          <LinearProgress role="progressbar" />
        </Box>
      )}

      {/* Error Messages */}
      {Object.keys(errors).length > 0 && (
        <Box sx={{ mt: 2 }}>
          {Object.entries(errors).map(([fileId, error]) => (
            <Alert key={fileId} severity="error" sx={{ mb: 1 }}>
              {error}
            </Alert>
          ))}
        </Box>
      )}

      {/* File List */}
      {files.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            選択されたファイル ({files.length})
          </Typography>
          <List>
            {files.map((fileData) => (
              <ListItem key={fileData.id} divider>
                <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                  {getFileIcon(fileData.file)}
                </Box>

                {/* Image Preview */}
                {previews[fileData.id] && (
                  <Box sx={{ mr: 2 }}>
                    <Image
                      src={previews[fileData.id]}
                      alt={fileData.file.name}
                      width={40}
                      height={40}
                      style={{
                        objectFit: 'cover',
                        borderRadius: 4,
                      }}
                    />
                  </Box>
                )}

                <ListItemText
                  primary={fileData.file.name}
                  secondary={`${fileData.file.type || 'unknown'} • ${formatFileSize(fileData.file.size)}`}
                />

                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    aria-label="削除"
                    onClick={() => removeFile(fileData.id)}
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Box>
      )}
    </Box>
  )
}