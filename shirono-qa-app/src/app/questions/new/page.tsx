'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Typography, CircularProgress } from '@mui/material'
import FileUpload from '@/components/FileUpload'
import AppHeader from '@/components/AppHeader'

export default function NewQuestionPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [priority, setPriority] = useState('medium')
  const [files, setFiles] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const router = useRouter()

  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (!response.ok) {
        router.push('/')
        return
      }
      const _userData = await response.json()
    } catch {
      router.push('/')
    } finally {
      setIsLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      checkAuth()
    }
  }, [checkAuth])

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!title.trim()) {
      newErrors.title = 'タイトルは必須です'
    }

    if (!content.trim()) {
      newErrors.content = '内容は必須です'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const uploadFiles = async (questionId?: string) => {
    if (files.length === 0) return []

    const formData = new FormData()
    files.forEach(file => {
      formData.append('files', file)
    })

    // questionIdがある場合は追加
    if (questionId) {
      formData.append('questionId', questionId)
    }

    const response = await fetch('/api/files/upload', {
      method: 'POST',
      credentials: 'include',
      body: formData
    })

    if (!response.ok) {
      throw new Error('File upload failed')
    }

    const data = await response.json()

    // アップロード成功時のレスポンス形式を確認
    if (data.success && data.files) {
      return data.files.map((file: { blobUrl: string }) => file.blobUrl)
    }

    return data.urls || []
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      // まず質問を作成
      const questionResponse = await fetch('/api/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          priority
        })
      })

      if (!questionResponse.ok) {
        setErrors({ submit: '投稿に失敗しました' })
        return
      }

      const questionData = await questionResponse.json()
      const questionId = questionData.question.id

      // ファイルがある場合はアップロードして質問に関連付け
      if (files.length > 0) {
        try {
          // ファイルをアップロード
          const uploadedFiles = await uploadFiles(questionId)

          // アップロードされたファイル情報を準備
          const fileInfos = files.map((file, index) => ({
            fileName: file.name, // 元のファイル名
            blobUrl: uploadedFiles[index], // フルパス（Blob URL）
            size: file.size,
            contentType: file.type
          }))


          // 質問にファイルを関連付け
          const attachResponse = await fetch(`/api/questions/${questionId}/attachments`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              files: fileInfos
            })
          })

          if (!attachResponse.ok) {
            console.warn('Failed to attach files to question, but question was created')
          }
        } catch (fileError) {
          console.warn('File upload failed, but question was created:', fileError)
        }
      }

      // キャッシュを無効化
      const statusFilters = ['すべて', '未回答', '回答済み', '解決済み', '未回答・回答済み']
      statusFilters.forEach(filter => {
        const cacheKey = `questions_${filter}`
        sessionStorage.removeItem(cacheKey)
        sessionStorage.removeItem(`${cacheKey}_time`)
      })

      // 投稿詳細画面に遷移
      router.push(`/questions/${questionId}`)

    } catch (error) {
      console.error('Submission error:', error)
      setErrors({ submit: '投稿に失敗しました' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    router.back()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader breadcrumbItems={[
          { label: 'ホーム', href: '/questions' },
          { label: '新規投稿', current: true }
        ]} />
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
          <Typography variant="body1" sx={{ ml: 2 }}>Loading...</Typography>
        </Box>
      </div>
    )
  }

  const breadcrumbItems = [
    { label: 'ホーム', href: '/questions' },
    { label: '新規投稿', current: true }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader breadcrumbItems={breadcrumbItems} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">新規投稿</h1>
          <p className="text-gray-600">
            技術的な質問、検証依頼、調査依頼など、どのような内容でも投稿できます。
            <br />IT、AI、Azureに関することであれば、お気軽にご相談ください。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6">
          {errors.submit && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
              {errors.submit}
            </div>
          )}

          <div className="mb-6">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              タイトル *
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.title ? 'border-red-500' : 'border-gray-300'
                }`}
              placeholder="例：○○について教えてください / ○○の検証をお願いします / ○○を調査してもらえますか"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title}</p>
            )}
          </div>

          <div className="mb-6">
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
              内容 *
            </label>
            <div className="mb-2 text-sm text-gray-500">
              <strong>投稿できる内容例：</strong>
              <ul className="list-disc list-inside mt-1">
                <li>技術的な質問（使い方、トラブルシューティングなど）</li>
                <li>検証依頼（「○○について検証してもらえますか」など）</li>
                <li>調査依頼（「○○の最新情報を調べてもらえますか」など）</li>
                <li>IT、AI、Azureに関する相談事項</li>
              </ul>
            </div>
            <textarea
              id="content"
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.content ? 'border-red-500' : 'border-gray-300'
                }`}
              placeholder="詳細な内容を入力してください。背景、現在の状況、期待する結果なども併せてお書きください。"
            />
            {errors.content && (
              <p className="mt-1 text-sm text-red-600">{errors.content}</p>
            )}
          </div>

          <div className="mb-6">
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
              優先度
            </label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="low">低</option>
              <option value="medium">中</option>
              <option value="high">高</option>
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              添付ファイル
            </label>
            <FileUpload onFilesChange={setFiles} />
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isSubmitting ? '投稿中...' : '投稿'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}