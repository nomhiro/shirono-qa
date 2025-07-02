'use client'

import { useState, useEffect, useCallback } from 'react'
import { findSimilarQuestions } from '../lib/search'
import { SimilarQuestion } from '../types/search'

interface SimilarQuestionsProps {
  query: string
  excludeQuestionId?: string
  limit?: number
  onQuestionClick?: (question: SimilarQuestion) => void
}

export default function SimilarQuestions({ 
  query, 
  excludeQuestionId, 
  limit = 5,
  onQuestionClick 
}: SimilarQuestionsProps) {
  const [questions, setQuestions] = useState<SimilarQuestion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const searchSimilarQuestions = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setQuestions([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await findSimilarQuestions(searchQuery, excludeQuestionId, limit)
      
      if (result.success) {
        setQuestions(result.questions || [])
      } else {
        setError(result.error || 'Failed to load similar questions')
      }
    } catch {
      setError('Failed to load similar questions')
    } finally {
      setLoading(false)
    }
  }, [excludeQuestionId, limit])

  // Debounce the search to avoid too many API calls
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchSimilarQuestions(query)
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [query, searchSimilarQuestions])

  const handleQuestionClick = (question: SimilarQuestion) => {
    onQuestionClick?.(question)
  }

  const formatSimilarity = (similarity: number): string => {
    return `${Math.round(similarity * 100)}% similar`
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'resolved':
        return 'bg-green-100 text-green-800'
      case 'answered':
        return 'bg-blue-100 text-blue-800'
      case 'unanswered':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusDisplayText = (status: string): string => {
    switch (status) {
      case 'resolved':
        return 'Resolved'
      case 'answered':
        return 'Answered'
      case 'unanswered':
        return 'Unanswered'
      default:
        return status
    }
  }

  const truncateSnippet = (snippet: string, maxLength = 150): string => {
    if (snippet.length <= maxLength) {
      return snippet
    }
    return snippet.substring(0, maxLength) + '...'
  }

  if (!query.trim()) {
    return null
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Similar Questions
      </h3>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div 
            className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"
            role="progressbar"
            aria-label="Loading"
          />
          <span className="ml-3 text-gray-600">Finding similar questions...</span>
        </div>
      )}

      {error && (
        <div className="text-center py-8">
          <p className="text-red-600 mb-2">Failed to load similar questions</p>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      )}

      {!loading && !error && questions.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No similar questions found</p>
          <p className="text-sm text-gray-400 mt-1">
            Try adjusting your question or search terms
          </p>
        </div>
      )}

      {!loading && !error && questions.length > 0 && (
        <div className="space-y-4">
          {questions.map((question) => (
            <div 
              key={question.id}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => handleQuestionClick(question)}
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-900 hover:text-indigo-600 line-clamp-2">
                  {question.title}
                </h4>
                <span className="text-xs text-indigo-600 font-medium ml-2 whitespace-nowrap">
                  {formatSimilarity(question.similarity)}
                </span>
              </div>

              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {truncateSnippet(question.snippet)}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(question.status)}`}>
                    {getStatusDisplayText(question.status)}
                  </span>
                  
                  <span className="text-xs text-gray-500">
                    {question.answersCount} {question.answersCount === 1 ? 'answer' : 'answers'}
                  </span>
                </div>

                <span className="text-xs text-gray-400">
                  {question.createdAt.toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}