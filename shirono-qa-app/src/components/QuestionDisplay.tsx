'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Typography,
  CardContent,
  CardHeader,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Paper,
  Stack,
  Avatar,
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
} from '@mui/material'
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  QuestionAnswer as QuestionIcon,
  CheckCircle as CheckIcon,
  Schedule as ScheduleIcon,
  Flag as FlagIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
  QuestionAnswer as QuestionAnswerIcon,
} from '@mui/icons-material'
import { Question, QuestionStatus, QuestionPriority } from '@/types/question'
import { User } from '@/types/auth'
import AttachmentList from '@/components/AttachmentList'

interface QuestionDisplayProps {
  questionId: string
  user: User | null
  onQuestionUpdate?: (question: Question) => void
  onQuestionDelete?: () => void
}

export default function QuestionDisplay({ 
  questionId, 
  user, 
  onQuestionUpdate,
  onQuestionDelete 
}: QuestionDisplayProps) {
  const [question, setQuestion] = useState<Question | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    title: '',
    content: '',
    priority: QuestionPriority.MEDIUM
  })
  const [submitting, setSubmitting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const loadQuestion = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/questions/${questionId}`)
      if (!response.ok) {
        setError('投稿の読み込みに失敗しました')
        return
      }

      const data = await response.json()
      if (!data.success) {
        setError(data.error?.message || '投稿の読み込みに失敗しました')
        return
      }

      const questionData = data.question
      setQuestion(questionData)
      setEditData({
        title: questionData.title,
        content: questionData.content,
        priority: questionData.priority
      })

      onQuestionUpdate?.(questionData)
    } catch (err) {
      console.error('Error loading question:', err)
      setError('投稿データの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }, [questionId, onQuestionUpdate])

  useEffect(() => {
    loadQuestion()
  }, [loadQuestion])

  const handleEditToggle = () => {
    setIsEditing(!isEditing)
    if (!isEditing && question) {
      setEditData({
        title: question.title,
        content: question.content,
        priority: question.priority
      })
    }
  }

  const handleSaveChanges = async () => {
    if (!question || !user) return

    try {
      setSubmitting(true)

      const response = await fetch(`/api/questions/${questionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editData)
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setQuestion(data.question)
          setIsEditing(false)
          onQuestionUpdate?.(data.question)
        } else {
          setError(data.error?.message || '投稿の更新に失敗しました')
        }
      } else {
        setError('投稿の更新に失敗しました')
      }
    } catch (err) {
      console.error('Error saving changes:', err)
      setError('変更の保存に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusChange = async (newStatus: QuestionStatus) => {
    if (!question || !user) return

    try {
      setSubmitting(true)

      const response = await fetch(`/api/questions/${questionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          const updatedQuestion = {
            ...data.question,
            updatedAt: new Date()
          }
          setQuestion(updatedQuestion)
          onQuestionUpdate?.(updatedQuestion)
        } else {
          setError(data.error?.message || 'ステータスの更新に失敗しました')
        }
      } else {
        setError('ステータスの更新に失敗しました')
      }
    } catch (err) {
      console.error('Error updating status:', err)
      setError('ステータスの更新に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteQuestion = async () => {
    if (!user?.isAdmin || !question) return

    try {
      setSubmitting(true)

      const response = await fetch(`/api/questions/${questionId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          onQuestionDelete?.()
        } else {
          setError(data.error || '投稿の削除に失敗しました')
        }
      } else {
        setError('投稿の削除に失敗しました')
      }
    } catch (err) {
      console.error('Error deleting question:', err)
      setError('投稿の削除に失敗しました')
    } finally {
      setSubmitting(false)
      setDeleteDialogOpen(false)
    }
  }

  const getPriorityColor = (priority: QuestionPriority) => {
    switch (priority) {
      case QuestionPriority.HIGH: return 'error'
      case QuestionPriority.MEDIUM: return 'warning'
      case QuestionPriority.LOW: return 'info'
      default: return 'default'
    }
  }

  const getStatusColor = (status: QuestionStatus) => {
    switch (status) {
      case QuestionStatus.UNANSWERED: return 'warning'
      case QuestionStatus.ANSWERED: return 'info'
      case QuestionStatus.RESOLVED: return 'success'
      case QuestionStatus.REJECTED: return 'error'
      case QuestionStatus.CLOSED: return 'default'
      default: return 'default'
    }
  }

  const getStatusLabel = (status: QuestionStatus) => {
    switch (status) {
      case QuestionStatus.UNANSWERED: return '未回答'
      case QuestionStatus.ANSWERED: return '回答済み'
      case QuestionStatus.RESOLVED: return '解決済み'
      case QuestionStatus.REJECTED: return '却下'
      case QuestionStatus.CLOSED: return 'クローズ'
      default: return status
    }
  }

  const getPriorityLabel = (priority: QuestionPriority) => {
    switch (priority) {
      case QuestionPriority.HIGH: return '高'
      case QuestionPriority.MEDIUM: return '中'
      case QuestionPriority.LOW: return '低'
      default: return priority
    }
  }

  if (loading) {
    return (
      <Paper elevation={1} sx={{ mb: 3, p: 3 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress size={24} />
          <Typography variant="body2" sx={{ ml: 2 }}>質問を読み込み中...</Typography>
        </Box>
      </Paper>
    )
  }

  if (error) {
    return (
      <Paper elevation={1} sx={{ mb: 3, p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Paper>
    )
  }

  if (!question) {
    return (
      <Paper elevation={1} sx={{ mb: 3, p: 3 }}>
        <Alert severity="error">投稿が見つかりません</Alert>
      </Paper>
    )
  }

  const canEdit = user && question && (user.id === question.authorId || user.isAdmin)

  return (
    <>
      <Paper elevation={1} sx={{ mb: 3 }}>
        <CardHeader
          avatar={
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              <QuestionIcon />
            </Avatar>
          }
          action={
            <Stack direction="row" spacing={1} alignItems="center">
              {/* ステータス・優先度チップ */}
              <Chip
                label={getStatusLabel(question.status)}
                color={getStatusColor(question.status)}
                variant="filled"
                size="small"
                icon={question.status === QuestionStatus.RESOLVED ? <CheckIcon /> : <ScheduleIcon />}
              />
              <Chip
                label={getPriorityLabel(question.priority)}
                color={getPriorityColor(question.priority)}
                variant="outlined"
                size="small"
                icon={<FlagIcon />}
              />

              {/* 編集・削除ボタン */}
              {canEdit && (
                <>
                  {isEditing ? (
                    <Stack direction="row" spacing={1}>
                      <Tooltip title="変更を保存">
                        <IconButton
                          color="primary"
                          onClick={handleSaveChanges}
                          disabled={submitting}
                          size="small"
                        >
                          <SaveIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="キャンセル">
                        <IconButton
                          onClick={handleEditToggle}
                          disabled={submitting}
                          size="small"
                        >
                          <CancelIcon />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  ) : (
                    <Stack direction="row" spacing={1}>
                      <Tooltip title="投稿を編集">
                        <IconButton
                          onClick={handleEditToggle}
                          size="small"
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      {/* 管理者のみ削除ボタン */}
                      {user?.isAdmin && (
                        <Tooltip title="投稿を削除">
                          <IconButton
                            onClick={() => setDeleteDialogOpen(true)}
                            size="small"
                            sx={{ color: 'error.main' }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  )}
                </>
              )}
            </Stack>
          }
          title={
            isEditing ? (
              <TextField
                fullWidth
                label="投稿タイトル"
                value={editData.title}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                variant="outlined"
                size="small"
              />
            ) : (
              <Typography variant="h5" component="h1" sx={{ fontWeight: 'bold' }}>
                {question.title}
              </Typography>
            )
          }
          subheader={
            <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                投稿日: {new Date(question.createdAt).toLocaleDateString('ja-JP')}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                最終更新: {new Date(question.updatedAt).toLocaleDateString('ja-JP')}
              </Typography>
            </Stack>
          }
          sx={{ pb: 1 }}
        />

        <CardContent sx={{ pt: 0 }}>
          {/* タグ */}
          {question.tags.length > 0 && (
            <Box mb={2}>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {question.tags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    size="small"
                    variant="outlined"
                    color="default"
                  />
                ))}
              </Stack>
            </Box>
          )}

          {/* 質問内容 */}
          {isEditing ? (
            <Stack spacing={2}>
              <TextField
                fullWidth
                multiline
                rows={6}
                label="投稿内容"
                value={editData.content}
                onChange={(e) => setEditData({ ...editData, content: e.target.value })}
                variant="outlined"
              />
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>優先度</InputLabel>
                <Select
                  value={editData.priority}
                  onChange={(e) => setEditData({ ...editData, priority: e.target.value as QuestionPriority })}
                  label="優先度"
                  size="small"
                >
                  <MenuItem value={QuestionPriority.LOW}>低</MenuItem>
                  <MenuItem value={QuestionPriority.MEDIUM}>中</MenuItem>
                  <MenuItem value={QuestionPriority.HIGH}>高</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          ) : (
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
              {question.content}
            </Typography>
          )}

          {/* 添付ファイル */}
          {question.attachments && question.attachments.length > 0 && (
            <Box mt={2}>
              <AttachmentList attachments={question.attachments} />
            </Box>
          )}

          {/* 解決済みボタン - 質問直下の目立つ位置に配置 */}
          {(() => {
            const isAdmin = user?.isAdmin
            const isGroupMember = user?.groupId === question.groupId
            const canResolve = isAdmin || isGroupMember
            const isResolved = question.status === QuestionStatus.RESOLVED

            if (canResolve && !isResolved) {
              return (
                <Paper
                  elevation={2}
                  sx={{
                    mt: 3,
                    p: 2,
                    backgroundColor: 'success.50',
                    border: '1px solid',
                    borderColor: 'success.200'
                  }}
                >
                  <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="subtitle2" color="success.dark" sx={{ fontWeight: 'bold' }}>
                        この投稿は解決しましたか？
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        問題が解決した場合は解決済みにマークしてください
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      color="success"
                      size="large"
                      startIcon={<CheckIcon />}
                      onClick={() => handleStatusChange(QuestionStatus.RESOLVED)}
                      disabled={submitting}
                      sx={{
                        px: 4,
                        py: 1.5,
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        borderRadius: 2,
                        boxShadow: 3,
                        '&:hover': {
                          boxShadow: 4
                        }
                      }}
                    >
                      解決済みにする
                    </Button>
                  </Stack>
                </Paper>
              )
            }

            return null
          })()}

          {/* 管理者専用: 回答済みステータス変更ボタン */}
          {(() => {
            const isAdmin = user?.isAdmin
            const isUnanswered = question.status === QuestionStatus.UNANSWERED

            if (isAdmin && isUnanswered) {
              return (
                <Paper
                  elevation={1}
                  sx={{
                    mt: 2,
                    p: 2,
                    backgroundColor: 'info.50',
                    border: '1px solid',
                    borderColor: 'info.200'
                  }}
                >
                  <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="subtitle2" color="info.dark" sx={{ fontWeight: 'bold' }}>
                        管理者操作
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        回答を投稿した場合はステータスを「回答済み」に変更してください
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      color="info"
                      size="medium"
                      startIcon={<QuestionAnswerIcon />}
                      onClick={() => handleStatusChange(QuestionStatus.ANSWERED)}
                      disabled={submitting}
                      sx={{
                        px: 3,
                        py: 1,
                        fontSize: '0.9rem',
                        fontWeight: 'bold'
                      }}
                    >
                      回答済みにする
                    </Button>
                  </Stack>
                </Paper>
              )
            }

            return null
          })()}
        </CardContent>
      </Paper>

      {/* 削除確認ダイアログ */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="error" />
          質問を削除
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            この投稿を完全に削除しますか？
            <br />
            <strong>この操作は取り消せません。</strong>
            <br />
            以下のデータがすべて削除されます：
          </DialogContentText>
          <Box component="ul" sx={{ mt: 1, pl: 2 }}>
            <li>質問本文と添付ファイル</li>
            <li>すべての回答と添付ファイル</li>
            <li>すべてのコメントと添付ファイル</li>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            disabled={submitting}
          >
            キャンセル
          </Button>
          <Button
            onClick={handleDeleteQuestion}
            color="error"
            variant="contained"
            disabled={submitting}
            startIcon={<DeleteIcon />}
          >
            削除する
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}