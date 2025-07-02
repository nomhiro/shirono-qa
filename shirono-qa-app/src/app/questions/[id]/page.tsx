'use client'

import { useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Container,
  Grid,
} from '@mui/material'
import { Answer, Comment } from '@/types/answer'
import { User } from '@/types/auth'
import AppHeader from '@/components/AppHeader'
import QuestionDisplay from '@/components/QuestionDisplay'
import AnswersSection, { AnswersSectionRef } from '@/components/AnswersSection'
import ReplyForm from '@/components/ReplyForm'

export default function QuestionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const questionId = params.id as string

  const [user, setUser] = useState<User | null>(null)
  
  // 各コンポーネントとの連携用ref
  const answersSectionRef = useRef<AnswersSectionRef>(null)

  // ユーザー情報を取得
  const handleUserLoad = (loadedUser: User) => {
    if (!user) {
      setUser(loadedUser)
    }
  }

  // 質問削除時の処理
  const handleQuestionDelete = () => {
    // キャッシュを無効化
    const statusFilters = ['すべて', '未回答', '回答済み', '解決済み', '未回答・回答済み']
    statusFilters.forEach(filter => {
      const cacheKey = `questions_${filter}`
      sessionStorage.removeItem(cacheKey)
      sessionStorage.removeItem(`${cacheKey}_time`)
    })
    router.push('/questions?refresh=true')
  }

  // 新しい回答が投稿された時の処理
  const handleAnswerSubmitted = (answer: Answer) => {
    answersSectionRef.current?.addAnswer(answer)
  }

  // 新しいコメントが投稿された時の処理
  const handleCommentSubmitted = (comment: Comment) => {
    answersSectionRef.current?.addComment(comment)
  }

  const breadcrumbItems = [
    { label: 'ホーム', href: '/questions' },
    { label: '投稿詳細', current: true }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader
        breadcrumbItems={breadcrumbItems}
        onUserLoaded={handleUserLoad}
      />

      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            {/* 質問表示コンポーネント */}
            <QuestionDisplay
              questionId={questionId}
              user={user}
              onQuestionDelete={handleQuestionDelete}
            />

            {/* 回答・コメント表示コンポーネント */}
            <AnswersSection
              ref={answersSectionRef}
              questionId={questionId}
            />

            {/* 回答・コメント投稿フォーム */}
            <ReplyForm
              questionId={questionId}
              user={user}
              onAnswerSubmitted={handleAnswerSubmitted}
              onCommentSubmitted={handleCommentSubmitted}
            />
          </Grid>
        </Grid>
      </Container>
    </div>
  )
}