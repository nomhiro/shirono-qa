'use client'

import { useState } from 'react'
import {
  Box,
  Typography,
  CardContent,
  CardHeader,
  TextField,
  Button,
  Paper,
  Stack,
  Avatar,
  CircularProgress,
} from '@mui/material'
import {
  Reply as ReplyIcon,
  AdminPanelSettings as AdminIcon,
  Person as PersonIcon,
  AttachFile as AttachFileIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material'
import { User } from '@/types/auth'
import { Answer, Comment } from '@/types/answer'
import { Question } from '@/types/question'
import FileUpload from '@/components/FileUpload'

interface ReplyFormProps {
  questionId: string
  user: User | null
  onAnswerSubmitted?: (answer: Answer) => void
  onCommentSubmitted?: (comment: Comment) => void
  onQuestionUpdate?: (question: Question) => void
}

export default function ReplyForm({ 
  questionId, 
  user,
  onAnswerSubmitted,
  onCommentSubmitted,
  onQuestionUpdate
}: ReplyFormProps) {
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([])
  const [showFileUpload, setShowFileUpload] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmitAnswer = async () => {
    if (!content.trim() || !user) return

    try {
      setSubmitting(true)
      setError(null)

      // FormDataを使用してファイルを送信
      const formData = new FormData()
      formData.append('content', content.trim())

      // ファイルを個別に追加
      attachmentFiles.forEach((file, index) => {
        formData.append(`file_${index}`, file)
      })
      formData.append('fileCount', attachmentFiles.length.toString())

      const response = await fetch(`/api/questions/${questionId}/answers`, {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setContent('')
          setAttachmentFiles([])
          setShowFileUpload(false)
          
          // 新しい回答を親コンポーネントに通知
          onAnswerSubmitted?.(data.answer)
          
          // 質問の更新日時を現在時刻に更新
          onQuestionUpdate?.({
            ...data.answer.question,
            updatedAt: new Date()
          } as Question)
        } else {
          setError(data.error || '回答の投稿に失敗しました')
        }
      } else {
        const errorData = await response.json()
        setError(errorData.error || '回答の投稿に失敗しました')
      }
    } catch (err) {
      console.error('Error posting answer:', err)
      setError('回答の投稿に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitComment = async () => {
    if (!content.trim() || !user) return

    try {
      setSubmitting(true)
      setError(null)

      // FormDataを使用してファイルを送信
      const formData = new FormData()
      formData.append('content', content.trim())

      // ファイルを個別に追加
      attachmentFiles.forEach((file, index) => {
        formData.append(`file_${index}`, file)
      })
      formData.append('fileCount', attachmentFiles.length.toString())

      const response = await fetch(`/api/questions/${questionId}/comments`, {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setContent('')
          setAttachmentFiles([])
          setShowFileUpload(false)
          
          // 新しいコメントを親コンポーネントに通知
          onCommentSubmitted?.(data.comment)
          
          // 質問の更新日時を現在時刻に更新
          onQuestionUpdate?.({
            ...data.comment.question,
            updatedAt: new Date()
          } as Question)
        } else {
          setError(data.error || 'コメントの投稿に失敗しました')
        }
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'コメントの投稿に失敗しました')
      }
    } catch (err) {
      console.error('Error posting comment:', err)
      setError('コメントの投稿に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) {
    return null
  }

  return (
    <Paper elevation={1} sx={{ mt: 4 }}>
      {user.isAdmin ? (
        <CardHeader
          avatar={
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              <AdminIcon />
            </Avatar>
          }
          title={
            <Typography variant="h6" sx={{ color: 'primary.main' }}>
              管理者として回答を投稿
            </Typography>
          }
        />
      ) : (
        <CardHeader
          avatar={
            <Avatar sx={{ bgcolor: 'grey.500' }}>
              <PersonIcon />
            </Avatar>
          }
          title={
            <Typography variant="h6" color="text.secondary">
              コメントを投稿
            </Typography>
          }
        />
      )}

      <CardContent>
        {error && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="error">
              {error}
            </Typography>
          </Box>
        )}

        <TextField
          fullWidth
          multiline
          rows={user?.isAdmin ? 4 : 3}
          placeholder={user?.isAdmin ? "回答を入力してください..." : "コメントを入力してください..."}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          variant="outlined"
          sx={{ mb: 2 }}
          disabled={submitting}
        />

        {/* ファイル添付トグル */}
        <Box sx={{ mb: 2 }}>
          <Button
            startIcon={<AttachFileIcon />}
            endIcon={showFileUpload ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            onClick={() => setShowFileUpload(!showFileUpload)}
            variant="text"
            size="small"
            disabled={submitting}
          >
            ファイルを添付 {attachmentFiles.length > 0 && `(${attachmentFiles.length})`}
          </Button>
        </Box>

        {/* ファイルアップロード */}
        {showFileUpload && (
          <Box sx={{ mb: 3 }}>
            <FileUpload
              onFilesChange={setAttachmentFiles}
              maxFiles={5}
            />
          </Box>
        )}

        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="caption" color="text.secondary">
            {attachmentFiles.length > 0 && `${attachmentFiles.length}個のファイルが添付されています`}
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            {submitting && (
              <CircularProgress size={20} />
            )}
            <Button
              variant={user?.isAdmin ? "contained" : "outlined"}
              onClick={user?.isAdmin ? handleSubmitAnswer : handleSubmitComment}
              disabled={!content.trim() || submitting}
              startIcon={user?.isAdmin ? <ReplyIcon /> : <PersonIcon />}
            >
              {submitting 
                ? (user?.isAdmin ? "回答を投稿中..." : "コメントを投稿中...")
                : (user?.isAdmin ? "回答を投稿" : "コメントを投稿")
              }
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Paper>
  )
}

export type { ReplyFormProps }