import { render, screen } from '@testing-library/react'
import SearchResults from '../SearchResults'
import { SearchResponse } from '../../types/search'
import { QuestionStatus, QuestionPriority } from '../../types/question'

const mockSearchResults: SearchResponse = {
  success: true,
  results: [
    {
      question: {
        id: 'q1',
        title: 'JWT Authentication in Next.js',
        content: 'How to implement JWT authentication with proper security practices...',
        tags: ['next.js', 'authentication', 'security'],
        status: QuestionStatus.ANSWERED,
        priority: QuestionPriority.HIGH,
        authorId: 'user1',
        groupId: 'group1',
        attachments: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      },
      score: 0.95,
      highlights: [
        {
          field: 'title',
          fragments: ['<mark>JWT Authentication</mark> in Next.js']
        },
        {
          field: 'content', 
          fragments: ['How to implement <mark>JWT authentication</mark> with proper security...']
        }
      ],
      snippet: 'How to implement JWT authentication with proper security practices...'
    },
    {
      question: {
        id: 'q2',
        title: 'Database optimization techniques',
        content: 'What are the best practices for optimizing database queries...',
        tags: ['database', 'performance', 'optimization'],
        status: QuestionStatus.RESOLVED,
        priority: QuestionPriority.MEDIUM,
        authorId: 'user2',
        groupId: 'group1',
        attachments: [],
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02')
      },
      score: 0.82,
      highlights: [],
      snippet: 'What are the best practices for optimizing database queries and improving...'
    }
  ],
  total: 2,
  page: 1,
  limit: 20,
  query: 'JWT authentication'
}

describe('SearchResults Component', () => {
  it('should render loading state', () => {
    render(<SearchResults results={null} loading={true} />)

    expect(screen.getByText(/searching/i)).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('should render initial state with no results', () => {
    render(<SearchResults results={null} />)

    expect(screen.getByText(/enter a search query to find questions/i)).toBeInTheDocument()
  })

  it('should render search results successfully', () => {
    render(<SearchResults results={mockSearchResults} />)

    expect(screen.getByText('Search Results')).toBeInTheDocument()
    expect(screen.getByText('2 questions found for "JWT authentication"')).toBeInTheDocument()
    expect(screen.getByText(/JWT Authentication/)).toBeInTheDocument()
    expect(screen.getByText(/Next.js/)).toBeInTheDocument()
    expect(screen.getByText('Database optimization techniques')).toBeInTheDocument()
  })

  it('should display search result highlights', () => {
    render(<SearchResults results={mockSearchResults} />)

    // Check for highlighted content (dangerouslySetInnerHTML)
    expect(screen.getByText(/JWT Authentication/)).toBeInTheDocument()
    expect(screen.getByText(/Next.js/)).toBeInTheDocument()
  })

  it('should show result scores and status badges', () => {
    render(<SearchResults results={mockSearchResults} />)

    expect(screen.getByText('95% match')).toBeInTheDocument()
    expect(screen.getByText('82% match')).toBeInTheDocument()
    expect(screen.getByText('answered')).toBeInTheDocument()
    expect(screen.getByText('resolved')).toBeInTheDocument()
  })

  it('should display tags correctly', () => {
    render(<SearchResults results={mockSearchResults} />)

    expect(screen.getByText('next.js')).toBeInTheDocument()
    expect(screen.getByText('authentication')).toBeInTheDocument()
    expect(screen.getByText('security')).toBeInTheDocument()
    expect(screen.getByText('database')).toBeInTheDocument()
    expect(screen.getByText('performance')).toBeInTheDocument()
    expect(screen.getByText('optimization')).toBeInTheDocument()
  })

  it('should show priority indicators with correct colors', () => {
    render(<SearchResults results={mockSearchResults} />)

    const highPriorityElement = screen.getByText('HIGH')
    const mediumPriorityElement = screen.getByText('MEDIUM')
    
    expect(highPriorityElement).toHaveClass('text-red-600')
    expect(mediumPriorityElement).toHaveClass('text-yellow-600')
  })

  it('should handle empty search results', () => {
    const emptyResults: SearchResponse = {
      success: true,
      results: [],
      total: 0,
      page: 1,
      limit: 20,
      query: 'nonexistent query',
      suggestions: ['suggestion1', 'suggestion2']
    }

    render(<SearchResults results={emptyResults} />)

    expect(screen.getByText(/no questions found/i)).toBeInTheDocument()
    expect(screen.getByText(/try adjusting your search terms/i)).toBeInTheDocument()
    expect(screen.getByText(/did you mean/i)).toBeInTheDocument()
    expect(screen.getByText('suggestion1')).toBeInTheDocument()
    expect(screen.getByText('suggestion2')).toBeInTheDocument()
  })

  it('should handle search errors', () => {
    const errorResults: SearchResponse = {
      success: false,
      error: 'Search service unavailable'
    }

    render(<SearchResults results={errorResults} />)

    expect(screen.getByText(/search failed/i)).toBeInTheDocument()
    expect(screen.getByText(/search service unavailable/i)).toBeInTheDocument()
  })

  it('should show pagination when needed', () => {
    const paginatedResults: SearchResponse = {
      ...mockSearchResults,
      total: 50,
      page: 2,
      limit: 20
    }

    render(<SearchResults results={paginatedResults} />)

    expect(screen.getAllByText(/page 2 of 3/i)).toHaveLength(2) // Header and pagination
    expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
  })

  it('should limit displayed tags to 3 with overflow indicator', () => {
    const manyTagsResult: SearchResponse = {
      ...mockSearchResults,
      results: [{
        ...mockSearchResults.results![0],
        question: {
          ...mockSearchResults.results![0].question,
          tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5']
        }
      }]
    }

    render(<SearchResults results={manyTagsResult} />)

    expect(screen.getByText('tag1')).toBeInTheDocument()
    expect(screen.getByText('tag2')).toBeInTheDocument()
    expect(screen.getByText('tag3')).toBeInTheDocument()
    expect(screen.getByText('+2 more')).toBeInTheDocument()
  })

  it('should format dates correctly', () => {
    render(<SearchResults results={mockSearchResults} />)

    // Check that dates are formatted (using toLocaleDateString)
    expect(screen.getByText('1/1/2024')).toBeInTheDocument()
    expect(screen.getByText('1/2/2024')).toBeInTheDocument()
  })
})