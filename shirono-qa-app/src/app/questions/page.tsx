'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Typography, CircularProgress } from '@mui/material'
import AppHeader from '@/components/AppHeader'

interface Question {
  id: string
  title: string
  authorId: string
  status: string
  priority: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

interface User {
  id: string
  username: string
  isAdmin: boolean
}

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('未回答・回答済み')
  const router = useRouter()

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'unanswered': return '未回答'
      case 'answered': return '回答済み'
      case 'resolved': return '解決済み'
      case 'rejected': return '却下'
      case 'closed': return 'クローズ'
      default: return status
    }
  }

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return '高'
      case 'medium': return '中'
      case 'low': return '低'
      default: return priority
    }
  }

  const getStatusColorClass = (status: string) => {
    switch (status) {
      case 'unanswered': return 'bg-orange-100 text-orange-800'
      case 'answered': return 'bg-blue-100 text-blue-800'
      case 'resolved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'closed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColorClass = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-orange-100 text-orange-800'
      case 'low': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const loadQuestions = useCallback(async (forceRefresh = false) => {
    try {
      // キャッシュチェック
      const cacheKey = `questions_${statusFilter}`
      const cachedData = sessionStorage.getItem(cacheKey)
      const cacheTime = sessionStorage.getItem(`${cacheKey}_time`)
      const now = new Date().getTime()
      
      // キャッシュが有効な場合（5分以内）かつ強制更新でない場合
      if (!forceRefresh && cachedData && cacheTime && now - parseInt(cacheTime) < 5 * 60 * 1000) {
        setQuestions(JSON.parse(cachedData))
        setIsLoading(false)
        return
      }
      
      // APIパラメータ構築
      const params = new URLSearchParams()
      if (statusFilter === '未回答・回答済み') {
        params.append('status', 'unanswered,answered')
      } else if (statusFilter !== 'すべて') {
        const statusMap: { [key: string]: string } = {
          '未回答': 'unanswered',
          '回答済み': 'answered',
          '解決済み': 'resolved'
        }
        const statusValue = statusMap[statusFilter]
        if (statusValue) {
          params.append('status', statusValue)
        }
      }
      
      const response = await fetch(`/api/questions?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        const questions = data.questions || []
        setQuestions(questions)
        
        // キャッシュに保存
        sessionStorage.setItem(cacheKey, JSON.stringify(questions))
        sessionStorage.setItem(`${cacheKey}_time`, now.toString())
      }
    } catch (error) {
      console.error('Failed to load questions:', error)
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter])

  // ステータスフィルター変更時とユーザー読み込み時にデータを再取得
  useEffect(() => {
    if (user) {
      setIsLoading(true)
      loadQuestions()
    }
  }, [statusFilter, user, loadQuestions])

  const handleUserLoaded = (userData: User) => {
    setUser(userData)
    setIsLoading(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader title="投稿一覧" onUserLoaded={handleUserLoaded} />
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
          <Typography variant="body1" sx={{ ml: 2 }}>Loading...</Typography>
        </Box>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="投稿一覧" onUserLoaded={handleUserLoaded} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            placeholder="投稿を検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <button
            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onClick={() => router.push('/questions/new')}
          >
            新規投稿
          </button>
        </div>

        <div className="mb-6">
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={() => loadQuestions(true)}
              className="px-3 py-1 rounded-md text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
              title="最新データを取得"
            >
              🔄 更新
            </button>
            <div className="w-px h-6 bg-gray-300 mx-2"></div>
            {['未回答・回答済み', '解決済み', 'すべて'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 rounded-full text-sm ${statusFilter === status
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white shadow rounded-lg">
          {(() => {
            // フィルター処理
            let filteredQuestions = questions

            // ステータスフィルター（サーバー側でフィルタリング済みなのでクライアント側では何もしない）
            // API側で既にフィルタリングされているため、ここでの処理は不要

            // 検索フィルター
            if (searchQuery.trim()) {
              const query = searchQuery.toLowerCase()
              filteredQuestions = filteredQuestions.filter(q =>
                q.title.toLowerCase().includes(query) ||
                q.tags.some(tag => tag.toLowerCase().includes(query))
              )
            }

            if (filteredQuestions.length === 0) {
              return (
                <div className="p-8 text-center text-gray-500">
                  {questions.length === 0 ? '投稿がありません' : '条件に一致する投稿が見つかりません'}
                </div>
              )
            }

            return (
              <div className="divide-y divide-gray-200">
                {filteredQuestions.map((question) => (
                  <div key={question.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3
                          className="text-lg font-medium text-gray-900 mb-2 cursor-pointer hover:text-indigo-600"
                          onClick={() => router.push(`/questions/${question.id}`)}
                        >
                          {question.title}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>作成日: {new Date(question.createdAt).toLocaleDateString()}</span>
                          <span>更新日: {new Date(question.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColorClass(question.status)}`}>
                          {getStatusLabel(question.status)}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColorClass(question.priority)}`}>
                          {getPriorityLabel(question.priority)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {question.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}