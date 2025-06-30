'use client'

import { SearchResult, SearchResponse } from '../types/search'

interface SearchResultsProps {
  results: SearchResponse | null
  loading?: boolean
}

export default function SearchResults({ results, loading = false }: SearchResultsProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div 
          className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"
          role="progressbar"
          aria-label="Loading"
        />
        <span className="ml-3 text-gray-600">Searching...</span>
      </div>
    )
  }

  if (!results) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Enter a search query to find questions</p>
      </div>
    )
  }

  if (!results.success) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-2">Search failed</p>
        <p className="text-sm text-gray-500">{results.error}</p>
      </div>
    )
  }

  if (!results.results || results.results.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-2">No questions found</p>
        <p className="text-sm text-gray-400">
          Try adjusting your search terms or filters
        </p>
        {results.suggestions && results.suggestions.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-2">Did you mean:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {results.suggestions.map((suggestion, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm cursor-pointer hover:bg-indigo-200"
                >
                  {suggestion}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'resolved':
        return 'bg-green-100 text-green-800'
      case 'answered':
        return 'bg-blue-100 text-blue-800'
      case 'unanswered':
        return 'bg-yellow-100 text-yellow-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'closed':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'high':
        return 'text-red-600'
      case 'medium':
        return 'text-yellow-600'
      case 'low':
        return 'text-green-600'
      default:
        return 'text-gray-600'
    }
  }

  const formatScore = (score: number): string => {
    return `${Math.round(score * 100)}% match`
  }

  return (
    <div className="space-y-6">
      {/* Results Summary */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Search Results
          </h2>
          <p className="text-sm text-gray-600">
            {results.total} questions found for "{results.query}"
          </p>
        </div>
        <div className="text-sm text-gray-500">
          Page {results.page} of {Math.ceil((results.total || 0) / (results.limit || 20))}
        </div>
      </div>

      {/* Results List */}
      <div className="space-y-4">
        {results.results.map((result: SearchResult) => (
          <div
            key={result.question.id}
            className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900 hover:text-indigo-600 mb-2">
                  {result.highlights?.find(h => h.field === 'title')?.fragments[0] ? (
                    <span dangerouslySetInnerHTML={{
                      __html: result.highlights.find(h => h.field === 'title')!.fragments[0]
                    }} />
                  ) : (
                    result.question.title
                  )}
                </h3>
                
                <p className="text-gray-600 mb-3">
                  {result.highlights?.find(h => h.field === 'content')?.fragments[0] ? (
                    <span dangerouslySetInnerHTML={{
                      __html: result.highlights.find(h => h.field === 'content')!.fragments[0]
                    }} />
                  ) : (
                    result.snippet
                  )}
                </p>
              </div>
              
              <div className="ml-4 text-right">
                <div className="text-sm text-indigo-600 font-medium mb-1">
                  {formatScore(result.score)}
                </div>
                <div className={`text-sm font-medium ${getPriorityColor(result.question.priority)}`}>
                  {result.question.priority.toUpperCase()}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(result.question.status)}`}>
                  {result.question.status}
                </span>
                
                {result.question.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {result.question.tags.slice(0, 3).map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                      >
                        {tag}
                      </span>
                    ))}
                    {result.question.tags.length > 3 && (
                      <span className="text-xs text-gray-500">
                        +{result.question.tags.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="text-xs text-gray-500">
                {result.question.createdAt.toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {results.total && results.total > (results.limit || 20) && (
        <div className="flex items-center justify-center space-x-2 pt-6">
          <button
            disabled={results.page === 1}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          <span className="px-3 py-1 text-sm text-gray-600">
            Page {results.page} of {Math.ceil(results.total / (results.limit || 20))}
          </span>
          
          <button
            disabled={results.page >= Math.ceil(results.total / (results.limit || 20))}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}