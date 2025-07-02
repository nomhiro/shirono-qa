'use client'

import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import {
  Box,
  Typography,
  CardContent,
  CardHeader,
  CircularProgress,
  Paper,
  Stack,
  Avatar,
} from '@mui/material'
import {
  Reply as ReplyIcon,
  AdminPanelSettings as AdminIcon,
  Person as PersonIcon,
} from '@mui/icons-material'
import { Answer, Comment } from '@/types/answer'
import { User } from '@/types/auth'
import AttachmentList from '@/components/AttachmentList'

interface AnswersSectionProps {
  questionId: string
  onAnswersUpdate?: (answers: Answer[]) => void
  onCommentsUpdate?: (comments: Comment[]) => void
}

export interface AnswersSectionRef {
  addAnswer: (answer: Answer) => void
  addComment: (comment: Comment) => void
  reloadData: () => void
}

const AnswersSection = forwardRef<AnswersSectionRef, AnswersSectionProps>(({ 
  questionId, 
  onAnswersUpdate,
  onCommentsUpdate 
}, ref) => {
  const [answers, setAnswers] = useState<Answer[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [userCache, setUserCache] = useState<{ [key: string]: User }>({})
  const [loading, setLoading] = useState(true)
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

  const loadAnswersAndComments = useCallback(async () => {
    try {
      setLoading(true)

      // 回答とコメントを並行して取得
      const [answersResponse, commentsResponse] = await Promise.all([
        fetch(`/api/questions/${questionId}/answers`),
        fetch(`/api/questions/${questionId}/comments`)
      ])

      // 回答データ処理
      let answersData: { success: boolean; answers: Answer[] } = { success: false, answers: [] }
      if (answersResponse.ok) {
        answersData = await answersResponse.json()
        if (answersData.success) {
          setAnswers(answersData.answers || [])
          onAnswersUpdate?.(answersData.answers || [])
        }
      }

      // コメントデータ処理
      let commentsData: { success: boolean; comments: Comment[] } = { success: false, comments: [] }
      if (commentsResponse.ok) {
        commentsData = await commentsResponse.json()
        if (commentsData.success) {
          setComments(commentsData.comments || [])
          onCommentsUpdate?.(commentsData.comments || [])
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
      console.error('Error loading answers and comments:', err)
    } finally {
      setLoading(false)
    }
  }, [questionId, fetchUserInfo, onAnswersUpdate, onCommentsUpdate])

  useEffect(() => {
    loadAnswersAndComments()
  }, [loadAnswersAndComments])

  // 外部から新しい回答やコメントを追加する関数
  const addAnswer = useCallback((newAnswer: Answer) => {
    setAnswers(prev => [...prev, newAnswer])
    fetchUserInfo(newAnswer.authorId) // 新しい投稿者情報を取得
  }, [fetchUserInfo])

  const addComment = useCallback((newComment: Comment) => {
    setComments(prev => [...prev, newComment])
    fetchUserInfo(newComment.authorId) // 新しい投稿者情報を取得
  }, [fetchUserInfo])

  // 再読み込み関数を外部に公開
  const reloadData = useCallback(() => {
    loadAnswersAndComments()
  }, [loadAnswersAndComments])

  // 外部からアクセス可能なメソッドを公開
  useImperativeHandle(ref, () => ({
    addAnswer,
    addComment,
    reloadData
  }), [addAnswer, addComment, reloadData])

  if (loading) {
    return (
      <Box>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ReplyIcon />
          回答・コメント
        </Typography>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress size={24} />
          <Typography variant="body2" sx={{ ml: 2, mt: 1 }}>回答・コメントを読み込み中...</Typography>
        </Paper>
      </Box>
    )
  }

  // 回答とコメントを統合して時系列順にソート
  const allItems = [
    ...answers.map(answer => ({ ...answer, type: 'answer' as const })),
    ...comments.map(comment => ({ ...comment, type: 'comment' as const }))
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ReplyIcon />
        回答・コメント ({answers.length + comments.length})
      </Typography>

      {allItems.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', mb: 3 }}>
          <Typography variant="body1" color="text.secondary">
            まだ回答やコメントがありません
          </Typography>
        </Paper>
      ) : (
        allItems.map((item) => {
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
      )}
    </Box>
  )
})

AnswersSection.displayName = 'AnswersSection'

// 外部から使用するための型エクスポート
export type { AnswersSectionProps }
export default AnswersSection