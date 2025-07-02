'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Box,
  Typography,
  Button,
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
  Container,
  Grid,
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
  QuestionAnswer as QuestionAnswerIcon,
  Reply as ReplyIcon,
  AdminPanelSettings as AdminIcon,
  Person as PersonIcon,
  CheckCircle as CheckIcon,
  Schedule as ScheduleIcon,
  Flag as FlagIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
  AttachFile as AttachFileIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material'
import { Question, QuestionStatus, QuestionPriority } from '@/types/question'
import { Answer, Comment } from '@/types/answer'
import { User } from '@/types/auth'
import AttachmentList from '@/components/AttachmentList'
import FileUpload from '@/components/FileUpload'
import AppHeader from '@/components/AppHeader'

export default function QuestionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const questionId = params.id as string

  const [question, setQuestion] = useState<Question | null>(null)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [comments, setComments] = useState<Comment[]>([])
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([])
  const [showFileUpload, setShowFileUpload] = useState(false)
  const [userCache, setUserCache] = useState<{ [key: string]: User }>({})
  const [loadingUsers, setLoadingUsers] = useState<Set<string>>(new Set())

  const fetchUserInfo = useCallback(async (userId: string): Promise<User | null> => {
    if (userCache[userId]) {
      return userCache[userId]
    }

    if (loadingUsers.has(userId)) {
      // 既に読み込み中の場合は待機
      return new Promise((resolve) => {
        const checkCache = () => {
          if (userCache[userId]) {
            resolve(userCache[userId])
          } else {
            setTimeout(checkCache, 100)
          }
        }
        checkCache()
      })
    }

    try {
      setLoadingUsers(prev => new Set(prev).add(userId))

      const response = await fetch(`/api/users/${userId}`)
      if (response.ok) {
        const userData = await response.json()
        if (userData.success) {
          setUserCache(prev => ({ ...prev, [userId]: userData.user }))
          return userData.user
        }
      }
    } catch (error) {
      console.error('Failed to fetch user info:', error)
    } finally {
      setLoadingUsers(prev => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
    }

    return null
  }, [userCache, loadingUsers])

  // ユーザー表示名を取得する関数
  const getUserDisplayName = (userId: string): string => {
    const userData = userCache[userId]
    if (userData) {
      return userData.isAdmin ? `${userData.username} (管理者)` : userData.username
    }
    return userId // フォールバック
  }

  // ユーザーがロードされているかチェック
  const isUserLoaded = (userId: string): boolean => {
    return !!userCache[userId]
  }

  const loadData = useCallback(async () => {
    try {
      setLoading(true)

      // 認証チェック
      const response = await fetch('/api/auth/me')
      if (!response.ok) {
        router.push('/')
        return
      }

      const userData = await response.json()
      setUser(userData.user)

      // 質問データ取得
      const questionResponse = await fetch(`/api/questions/${questionId}`)
      if (!questionResponse.ok) {
        setError('投稿の読み込みに失敗しました')
        return
      }

      const questionData = await questionResponse.json()
      if (!questionData.success) {
        setError(questionData.error?.message || '投稿の読み込みに失敗しました')
        return
      }

      const question = questionData.question
      setQuestion(question)
      setEditData({
        title: question.title,
        content: question.content,
        priority: question.priority
      })

      // 回答データ取得
      const answersResponse = await fetch(`/api/questions/${questionId}` + '/answers')
      let answersData: { success: boolean; answers: Answer[] } = { success: false, answers: [] }
      if (answersResponse.ok) {
        answersData = await answersResponse.json()
        if (answersData.success) {
          setAnswers(answersData.answers || [])
        }
      }

      // コメントデータ取得
      const commentsResponse = await fetch(`/api/questions/${questionId}` + '/comments')
      let commentsData: { success: boolean; comments: Comment[] } = { success: false, comments: [] }
      if (commentsResponse.ok) {
        commentsData = await commentsResponse.json()
        if (commentsData.success) {
          setComments(commentsData.comments || [])
        }
      }

      // 回答・コメントの投稿者情報を並行して取得
      const allUserIds = new Set<string>()
      if (answersData.success && answersData.answers) {
        answersData.answers.forEach((answer: Answer) => allUserIds.add(answer.authorId))
      }
      if (commentsData.success && commentsData.comments) {
        commentsData.comments.forEach((comment: Comment) => allUserIds.add(comment.authorId))
      }

      // ユーザー情報を並行して取得
      if (allUserIds.size > 0) {
        const userPromises = Array.from(allUserIds).map(userId => fetchUserInfo(userId))
        await Promise.all(userPromises)
      }

    } catch (err) {
      console.error('Error loading data:', err)
      setError('投稿データの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }, [questionId, router, fetchUserInfo])

  useEffect(() => {
    loadData()
  }, [loadData])

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
          setQuestion({
            ...data.question,
            updatedAt: new Date() // ステータス変更時にも更新日時を現在時刻に設定
          })
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

  const handleSubmitAnswer = async () => {
    if (!answerContent.trim() || !user) return

    try {
      setSubmitting(true)

      // FormDataを使用してファイルを送信
      const formData = new FormData()
      formData.append('content', answerContent.trim())

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
          setAnswers([...answers, data.answer])
          setAnswerContent('')
          setAttachmentFiles([])
          setShowFileUpload(false)
          // 新しい回答の投稿者情報を取得
          await fetchUserInfo(data.answer.authorId)
          // 質問の更新日時を現在時刻に更新
          if (question) {
            setQuestion({
              ...question,
              updatedAt: new Date()
            })
          }
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
    if (!answerContent.trim() || !user) return

    try {
      setSubmitting(true)

      // FormDataを使用してファイルを送信
      const formData = new FormData()
      formData.append('content', answerContent.trim())

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
          setComments([...comments, data.comment])
          setAnswerContent('')
          setAttachmentFiles([])
          setShowFileUpload(false)
          // 新しいコメントの投稿者情報を取得
          await fetchUserInfo(data.comment.authorId)
          // 質問の更新日時を現在時刻に更新
          if (question) {
            setQuestion({
              ...question,
              updatedAt: new Date()
            })
          }
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
          // キャッシュを無効化
          const statusFilters = ['すべて', '未回答', '回答済み', '解決済み', '未回答・回答済み']
          statusFilters.forEach(filter => {
            const cacheKey = `questions_${filter}`
            sessionStorage.removeItem(cacheKey)
            sessionStorage.removeItem(`${cacheKey}_time`)
          })
          router.push('/questions?refresh=true')
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

  const canEdit = user && question && (user.id === question.authorId || user.isAdmin)
  const _canChangeStatus = user && question && (user.id === question.authorId || user.isAdmin || user.groupId === question.groupId)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader breadcrumbItems={[
          { label: 'ホーム', href: '/questions' },
          { label: '投稿詳細', current: true }
        ]} />
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
          <Typography variant="body1" sx={{ ml: 2 }}>Loading...</Typography>
        </Box>
      </div>
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
        <Alert severity="error">投稿が見つかりません</Alert>
      </Box>
    )
  }

  const breadcrumbItems = [
    { label: 'ホーム', href: '/questions' },
    { label: '投稿詳細', current: true }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader breadcrumbItems={breadcrumbItems} />

      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Grid container spacing={3}>
          {/* メインコンテンツ */}
          <Grid item xs={12}>
            {/* 質問セクション */}
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

            {/* 回答・コメントセクション */}
            <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ReplyIcon />
              回答・コメント ({answers.length + comments.length})
            </Typography>

            {/* 回答とコメントを統合して時系列順に表示 */}
            {(() => {
              // 回答とコメントを統合して時系列順にソート
              const allItems = [
                ...answers.map(answer => ({ ...answer, type: 'answer' as const })),
                ...comments.map(comment => ({ ...comment, type: 'comment' as const }))
              ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

              if (allItems.length === 0) {
                return (
                  <Paper sx={{ p: 4, textAlign: 'center', mb: 3 }}>
                    <Typography variant="body1" color="text.secondary">
                      まだ回答やコメントがありません
                    </Typography>
                  </Paper>
                )
              }

              return allItems.map((item) => {
                if (item.type === 'answer') {
                  return (
                    <Paper key={`answer-${item.id}`} elevation={1} sx={{ mb: 2 }}>
                      <CardHeader
                        avatar={
                          <Avatar sx={{
                            bgcolor: userCache[item.authorId]?.isAdmin ? 'success.main' : 'primary.main'
                          }}>
                            {userCache[item.authorId]?.isAdmin ? <AdminIcon /> : <PersonIcon />}
                          </Avatar>
                        }
                        title={
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                              回答
                            </Typography>
                            {isUserLoaded(item.authorId) && (
                              <Typography variant="subtitle2" color="text.primary">
                                - {getUserDisplayName(item.authorId)}
                              </Typography>
                            )}
                          </Stack>
                        }
                        subheader={
                          <Typography variant="caption" color="text.secondary">
                            {new Date(item.createdAt).toLocaleDateString('ja-JP')} {new Date(item.createdAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                        }
                        sx={{ pb: 1 }}
                      />
                      <CardContent sx={{ pt: 0 }}>
                        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                          {item.content}
                        </Typography>
                        {/* 添付ファイル */}
                        {item.attachments && item.attachments.length > 0 && (
                          <Box mt={2}>
                            <AttachmentList attachments={item.attachments} />
                          </Box>
                        )}
                      </CardContent>
                    </Paper>
                  )
                } else {
                  return (
                    <Paper key={`comment-${item.id}`} elevation={0} sx={{ mb: 2, ml: 4, border: '1px solid', borderColor: 'divider' }}>
                      <CardHeader
                        avatar={
                          <Avatar sx={{
                            bgcolor: userCache[item.authorId]?.isAdmin ? 'success.main' : 'grey.400',
                            width: 32,
                            height: 32
                          }}>
                            {userCache[item.authorId]?.isAdmin ?
                              <AdminIcon sx={{ fontSize: 18 }} /> :
                              <PersonIcon sx={{ fontSize: 18 }} />
                            }
                          </Avatar>
                        }
                        title={
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="subtitle2" color="text.secondary">
                              コメント
                            </Typography>
                            {isUserLoaded(item.authorId) && (
                              <Typography variant="caption" color="text.primary">
                                - {getUserDisplayName(item.authorId)}
                              </Typography>
                            )}
                          </Stack>
                        }
                        subheader={
                          <Typography variant="caption" color="text.secondary">
                            {new Date(item.createdAt).toLocaleDateString('ja-JP')} {new Date(item.createdAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                        }
                        sx={{ pb: 1 }}
                      />
                      <CardContent sx={{ pt: 0 }}>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                          {item.content}
                        </Typography>
                        {/* 添付ファイル */}
                        {item.attachments && item.attachments.length > 0 && (
                          <Box mt={1}>
                            <AttachmentList attachments={item.attachments} />
                          </Box>
                        )}
                      </CardContent>
                    </Paper>
                  )
                }
              })
            })()}

            {/* 投稿フォーム */}
            <Paper elevation={1} sx={{ mt: 4 }}>
              {user && user.isAdmin ? (
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
                <TextField
                  fullWidth
                  multiline
                  rows={user?.isAdmin ? 4 : 3}
                  placeholder={user?.isAdmin ? "回答を入力してください..." : "コメントを入力してください..."}
                  value={answerContent}
                  onChange={(e) => setAnswerContent(e.target.value)}
                  variant="outlined"
                  sx={{ mb: 2 }}
                />

                {/* ファイル添付トグル */}
                <Box sx={{ mb: 2 }}>
                  <Button
                    startIcon={<AttachFileIcon />}
                    endIcon={showFileUpload ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    onClick={() => setShowFileUpload(!showFileUpload)}
                    variant="text"
                    size="small"
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
                  <Button
                    variant={user?.isAdmin ? "contained" : "outlined"}
                    onClick={user?.isAdmin ? handleSubmitAnswer : handleSubmitComment}
                    disabled={!answerContent.trim() || submitting}
                    startIcon={user?.isAdmin ? <ReplyIcon /> : <PersonIcon />}
                  >
                    {user?.isAdmin ? "回答を投稿" : "コメントを投稿"}
                  </Button>
                </Stack>
              </CardContent>
            </Paper>
          </Grid>
        </Grid>
      </Container>

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
            <li>すべての回答（{answers.length}件）と添付ファイル</li>
            <li>すべてのコメント（{comments.length}件）と添付ファイル</li>
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
    </div>
  )
}