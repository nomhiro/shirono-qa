'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { searchQuestions, getSearchSuggestions } from '../lib/search'
import { SearchQuery, SearchResponse, SearchSortField } from '../types/search'

interface SearchBoxProps {
  onResults: (results: SearchResponse | null) => void
  enableFilters?: boolean
  placeholder?: string
  initialQuery?: string
}

export default function SearchBox({
  onResults,
  enableFilters = false,
  placeholder = "Search questions...",
  initialQuery = ""
}: SearchBoxProps) {
  const [query, setQuery] = useState(initialQuery)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)

  // Filter states
  const [filters, setFilters] = useState<Partial<SearchQuery>>({
    status: undefined,
    priority: undefined,
    sortBy: SearchSortField.RELEVANCE,
    sortOrder: 'desc'
  })

  const searchBoxRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Debounce suggestions
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([])
      setShowSuggestions(false)
      onResults(null)
      return
    }

    const timeoutId = setTimeout(async () => {
      try {
        const result = await getSearchSuggestions(query)
        if (result.success) {
          setSuggestions(result.suggestions || [])
          setShowSuggestions(result.suggestions?.length > 0)
        }
      } catch (err) {
        console.error('Error getting suggestions:', err)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query, onResults])

  // Handle click outside to close suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
        setSelectedSuggestionIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      onResults(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const searchParams: SearchQuery = {
        q: searchQuery,
        ...filters,
        page: 1,
        limit: 20
      }

      const result = await searchQuestions(searchParams)

      if (result.success) {
        onResults(result)
      } else {
        setError(result.error || 'Search failed')
        onResults({
          success: false,
          error: result.error
        })
      }
    } catch {
      setError('Search failed')
      onResults({
        success: false,
        error: 'Search failed'
      })
    } finally {
      setLoading(false)
    }
  }, [filters, onResults])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setShowSuggestions(false)
    performSearch(query)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    setSelectedSuggestionIndex(-1)

    if (!value.trim()) {
      onResults(null)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion)
    setShowSuggestions(false)
    performSearch(suggestion)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) {
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedSuggestionIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : prev)
        break
      case 'Enter':
        if (selectedSuggestionIndex >= 0) {
          e.preventDefault()
          handleSuggestionClick(suggestions[selectedSuggestionIndex])
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        setSelectedSuggestionIndex(-1)
        break
    }
  }

  const handleFilterChange = (filterKey: keyof SearchQuery, value: string) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: value || undefined
    }))
  }

  return (
    <div ref={searchBoxRef} className="relative">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full px-4 py-3 pr-12 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />

          <button
            type="submit"
            disabled={loading}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 text-sm"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1" role="progressbar" />
                Searching...
              </>
            ) : (
              'Search'
            )}
          </button>
        </div>

        {enableFilters && (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              Filters {showFilters ? '▲' : '▼'}
            </button>
          </div>
        )}
      </form>

      {/* Search Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 focus:outline-none focus:bg-gray-100 ${index === selectedSuggestionIndex ? 'bg-gray-100 highlighted' : ''
                }`}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Advanced Filters */}
      {enableFilters && showFilters && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status-filter"
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All</option>
                <option value="unanswered">Unanswered</option>
                <option value="answered">Answered</option>
                <option value="resolved">Resolved</option>
                <option value="rejected">Rejected</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div>
              <label htmlFor="priority-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                id="priority-filter"
                value={filters.priority || ''}
                onChange={(e) => handleFilterChange('priority', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label htmlFor="sort-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Sort by
              </label>
              <select
                id="sort-filter"
                value={filters.sortBy || SearchSortField.RELEVANCE}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value={SearchSortField.RELEVANCE}>Relevance</option>
                <option value={SearchSortField.CREATED_AT}>Date Created</option>
                <option value={SearchSortField.UPDATED_AT}>Last Updated</option>
                <option value={SearchSortField.PRIORITY}>Priority</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">Search failed</p>
          <p className="text-xs text-red-600 mt-1">{error}</p>
        </div>
      )}
    </div>
  )
}