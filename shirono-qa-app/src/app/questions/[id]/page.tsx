'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material'
import { Edit as EditIcon, Save as SaveIcon, Cancel as CancelIcon } from '@mui/icons-material'
import { Question, QuestionStatus, QuestionPriority } from '@/types/question'
import { Answer } from '@/types/answer'
import { User } from '@/types/auth'
import { getQuestion, updateQuestion } from '@/lib/questions'
import { getAnswersByQuestion, createAnswer } from '@/lib/answers'
import { validateSession } from '@/lib/auth'
import AttachmentList from '@/components/AttachmentList'

export default function QuestionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const questionId = params.id as string

  const [question, setQuestion] = useState<Question | null>(null)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    title: '',
    content: '',
    priority: QuestionPriority.MEDIUM
  })
  const [answerContent, setAnswerContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadData()
  }, [questionId])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // 認証チェック
      const authResult = await validateSession(
        document.cookie
          .split('; ')
          .find((row) => row.startsWith('session='))
          ?.split('=')[1] || ''
      )
      
      if (!authResult.valid) {
        router.push('/')
        return
      }
      
      setUser(authResult.user!)

      // 質問データ取得
      const questionResult = await getQuestion(questionId)
      if (!questionResult.success) {
        setError(questionResult.error || 'Failed to load question')
        return
      }
      
      setQuestion(questionResult.question!)
      setEditData({
        title: questionResult.question!.title,
        content: questionResult.question!.content,
        priority: questionResult.question!.priority
      })

      // 回答データ取得
      const answersResult = await getAnswersByQuestion(questionId)
      if (answersResult.success) {
        setAnswers(answersResult.answers || [])
      }
      
    } catch (err) {
      console.error('Error loading data:', err)
      setError('Failed to load question data')
    } finally {
      setLoading(false)
    }
  }

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
      const result = await updateQuestion(questionId, editData)
      
      if (result.success) {
        setQuestion(result.question!)
        setIsEditing(false)
      } else {
        setError(result.error || 'Failed to update question')
      }
    } catch (err) {
      console.error('Error saving changes:', err)
      setError('Failed to save changes')
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusChange = async (newStatus: QuestionStatus) => {
    if (!question || !user) return
    
    try {
      setSubmitting(true)
      const result = await updateQuestion(questionId, { status: newStatus })
      
      if (result.success) {
        setQuestion(result.question!)
      } else {
        setError(result.error || 'Failed to update status')
      }
    } catch (err) {
      console.error('Error updating status:', err)
      setError('Failed to update status')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitAnswer = async () => {
    if (!answerContent.trim() || !user) return
    
    try {
      setSubmitting(true)
      const result = await createAnswer(
        { content: answerContent.trim() },
        questionId,
        user.id
      )
      
      if (result.success) {
        setAnswers([...answers, result.answer!])
        setAnswerContent('')
      } else {
        setError(result.error || 'Failed to post answer')
      }
    } catch (err) {
      console.error('Error posting answer:', err)
      setError('Failed to post answer')
    } finally {
      setSubmitting(false)
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

  const canEdit = user && question && (user.id === question.authorId || user.isAdmin)
  const canChangeStatus = user && (user.id === question?.authorId || user.isAdmin)

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>Loading...</Typography>
      </Box>
    )
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    )
  }

  if (!question) {
    return (
      <Box p={3}>
        <Alert severity="error">Question not found</Alert>
      </Box>
    )
  }

  return (
    <Box p={3}>
      <Card elevation={2}>
        <CardContent>
          {/* 質問ヘッダー */}
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Box flex={1}>
              {isEditing ? (
                <TextField
                  fullWidth
                  label="Question Title"
                  value={editData.title}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  margin="normal"
                />
              ) : (
                <Typography variant="h4" component="h1" gutterBottom>
                  {question.title}
                </Typography>
              )}
            </Box>
            
            {canEdit && (
              <Box ml={2}>
                {isEditing ? (
                  <Box>
                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={handleSaveChanges}
                      disabled={submitting}
                      sx={{ mr: 1 }}
                    >
                      Save Changes
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<CancelIcon />}
                      onClick={handleEditToggle}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                  </Box>
                ) : (
                  <Button
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={handleEditToggle}
                  >
                    Edit Question
                  </Button>
                )}
              </Box>
            )}
          </Box>

          {/* ステータス・優先度・タグ */}
          <Box display="flex" flexWrap="wrap" gap={1} mb={3}>
            <Chip
              label={question.status}
              color={getStatusColor(question.status)}
              variant="filled"
            />
            <Chip
              label={question.priority}
              color={getPriorityColor(question.priority)}
              variant="outlined"
            />
            {question.tags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                variant="outlined"
              />
            ))}
          </Box>

          {/* 質問内容 */}
          {isEditing ? (
            <Box mb={3}>
              <TextField
                fullWidth
                multiline
                rows={6}
                label="Question Content"
                value={editData.content}
                onChange={(e) => setEditData({ ...editData, content: e.target.value })}
                margin="normal"
              />
              <FormControl fullWidth margin="normal">
                <InputLabel>Priority</InputLabel>
                <Select
                  value={editData.priority}
                  onChange={(e) => setEditData({ ...editData, priority: e.target.value as QuestionPriority })}
                  label="Priority"
                >
                  <MenuItem value={QuestionPriority.LOW}>Low</MenuItem>
                  <MenuItem value={QuestionPriority.MEDIUM}>Medium</MenuItem>
                  <MenuItem value={QuestionPriority.HIGH}>High</MenuItem>
                </Select>
              </FormControl>
            </Box>
          ) : (
            <Typography variant="body1" paragraph sx={{ whiteSpace: 'pre-wrap' }}>
              {question.content}
            </Typography>
          )}

          {/* 添付ファイル */}
          {question.attachments && question.attachments.length > 0 && (
            <AttachmentList attachments={question.attachments} />
          )}

          {/* ステータス変更ボタン */}
          {canChangeStatus && question.status !== QuestionStatus.RESOLVED && (
            <Box mb={2}>
              <Button
                variant="contained"
                color="success"
                onClick={() => handleStatusChange(QuestionStatus.RESOLVED)}
                disabled={submitting}
              >
                Mark as Resolved
              </Button>
            </Box>
          )}

          <Divider sx={{ my: 3 }} />

          {/* 回答・コメントセクション */}
          <Typography variant="h5" gutterBottom>
            Answers & Comments
          </Typography>

          {/* 既存の回答 */}
          {answers.map((answer) => (
            <Card key={answer.id} variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {answer.content}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Posted on {new Date(answer.createdAt).toLocaleDateString()}
                </Typography>
              </CardContent>
            </Card>
          ))}

          {/* 回答投稿フォーム */}
          {user && (
            <Box mt={3}>
              <Typography variant="h6" gutterBottom>
                Post Your Answer
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                placeholder="Write your answer here..."
                value={answerContent}
                onChange={(e) => setAnswerContent(e.target.value)}
                margin="normal"
              />
              <Button
                variant="contained"
                onClick={handleSubmitAnswer}
                disabled={!answerContent.trim() || submitting}
                sx={{ mt: 1 }}
              >
                Post Answer
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}