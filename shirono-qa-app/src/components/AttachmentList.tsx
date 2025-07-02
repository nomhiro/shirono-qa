'use client'

import React, { useState } from 'react'
import {
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Alert,
  CircularProgress,
} from '@mui/material'
import {
  Download as DownloadIcon,
  InsertDriveFile as FileIcon,
  Image as ImageIcon,
  Description as DocIcon,
  TableChart as SheetIcon,
  Slideshow as PresentationIcon,
  Code as CodeIcon,
} from '@mui/icons-material'
import { Attachment } from '@/types/question'

interface AttachmentListProps {
  attachments: Attachment[]
}

export default function AttachmentList({ attachments }: AttachmentListProps) {
  const [downloadingFiles, setDownloadingFiles] = useState<Set<string>>(new Set())
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase()

    switch (extension) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp':
      case 'svg':
        return <ImageIcon color="primary" />
      case 'pdf':
        return <DocIcon color="error" />
      case 'doc':
      case 'docx':
        return <DocIcon color="info" />
      case 'xls':
      case 'xlsx':
        return <SheetIcon color="success" />
      case 'ppt':
      case 'pptx':
        return <PresentationIcon color="warning" />
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
      case 'html':
      case 'css':
      case 'json':
      case 'xml':
        return <CodeIcon color="secondary" />
      default:
        return <FileIcon color="action" />
    }
  }

  const getFileTypeLabel = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toUpperCase()
    return extension || 'FILE'
  }

  const handleDownload = async (attachment: Attachment) => {

    setDownloadingFiles(prev => new Set(prev).add(attachment.fileName))
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[attachment.fileName]
      return newErrors
    })

    try {
      const response = await fetch('/api/files/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          blobUrl: attachment.blobUrl,
          fileName: attachment.fileName
        })
      })

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`)
      }

      // Get file blob
      const blob = await response.blob()

      // Create download link
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = attachment.fileName
      link.style.display = 'none'

      // Trigger download
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Clean up
      URL.revokeObjectURL(url)

    } catch (error) {
      console.error('Download error:', error)
      setErrors(prev => ({
        ...prev,
        [attachment.fileName]: 'ダウンロードに失敗しました'
      }))
    } finally {
      setDownloadingFiles(prev => {
        const newSet = new Set(prev)
        newSet.delete(attachment.fileName)
        return newSet
      })
    }
  }

  if (attachments.length === 0) {
    return null
  }

  return (
    <Box sx={{ mt: 3 }}>
      <List>
        {attachments.map((attachment, index) => (
          <ListItem key={index} divider>
            <ListItemIcon>
              {getFileIcon(attachment.fileName)}
            </ListItemIcon>

            <ListItemText
              primary={attachment.fileName}
              secondary={`${getFileTypeLabel(attachment.fileName)} • ${formatFileSize(attachment.fileSize)}`}
            />

            <ListItemSecondaryAction>
              <IconButton
                edge="end"
                onClick={() => handleDownload(attachment)}
                disabled={downloadingFiles.has(attachment.fileName)}
                aria-label="ダウンロード"
              >
                {downloadingFiles.has(attachment.fileName) ? (
                  <CircularProgress size={24} />
                ) : (
                  <DownloadIcon />
                )}
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>

      {/* Download progress messages */}
      {Array.from(downloadingFiles).map(fileName => (
        <Alert key={fileName} severity="info" sx={{ mt: 1 }}>
          {fileName} をダウンロード中...
        </Alert>
      ))}

      {/* Error messages */}
      {Object.entries(errors).map(([fileName, error]) => (
        <Alert key={fileName} severity="error" sx={{ mt: 1 }}>
          {fileName}: {error}
        </Alert>
      ))}
    </Box>
  )
}