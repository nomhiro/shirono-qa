import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SimilarQuestions from '../SimilarQuestions'

// Mock the search module
jest.mock('../../lib/search', () => ({
  findSimilarQuestions: jest.fn(),
}))

import { findSimilarQuestions } from '../../lib/search'

const mockFindSimilarQuestions = findSimilarQuestions as jest.MockedFunction<typeof findSimilarQuestions>

const mockSimilarQuestions = [
  {
    id: 'similar1',
    title: 'How to implement JWT authentication in React',
    content: 'I need help with JWT implementation...',
    similarity: 0.87,
    snippet: 'I need help with JWT implementation and storing tokens securely...',
    status: 'answered',
    answersCount: 3,
    createdAt: new Date('2024-01-01')
  },
  {
    id: 'similar2',
    title: 'Next.js authentication best practices',
    content: 'What are the best practices for auth...',
    similarity: 0.82,
    snippet: 'What are the best practices for authentication in Next.js applications...',
    status: 'resolved',
    answersCount: 5,
    createdAt: new Date('2024-01-02')
  }
]

describe('SimilarQuestions Component', () => {
  beforeEach(() => {
    mockFindSimilarQuestions.mockClear()
  })

  it('should render loading state initially', async () => {
    let resolvePromise: () => void
    mockFindSimilarQuestions.mockImplementation(() => 
      new Promise<any>((resolve) => {
        resolvePromise = () => resolve({ success: true, questions: [] })
      })
    )

    render(<SimilarQuestions query="JWT authentication" />)

    // Wait for the loading state to appear after debounce
    await waitFor(() => {
      expect(screen.getByText(/finding similar questions/i)).toBeInTheDocument()
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    }, { timeout: 1000 })
  })

  it('should display similar questions when found', async () => {
    mockFindSimilarQuestions.mockResolvedValue({
      success: true,
      questions: mockSimilarQuestions
    })

    render(<SimilarQuestions query="JWT authentication" />)

    await waitFor(() => {
      expect(screen.getByText('Similar Questions')).toBeInTheDocument()
      expect(screen.getByText('How to implement JWT authentication in React')).toBeInTheDocument()
      expect(screen.getByText('Next.js authentication best practices')).toBeInTheDocument()
    })

    // Check similarity scores are displayed
    expect(screen.getByText('87% similar')).toBeInTheDocument()
    expect(screen.getByText('82% similar')).toBeInTheDocument()

    // Check answer counts
    expect(screen.getByText('3 answers')).toBeInTheDocument()
    expect(screen.getByText('5 answers')).toBeInTheDocument()
  })

  it('should show no results message when no similar questions found', async () => {
    mockFindSimilarQuestions.mockResolvedValue({
      success: true,
      questions: []
    })

    render(<SimilarQuestions query="very unique question" />)

    await waitFor(() => {
      expect(screen.getByText(/no similar questions found/i)).toBeInTheDocument()
    })
  })

  it('should handle API errors gracefully', async () => {
    mockFindSimilarQuestions.mockResolvedValue({
      success: false,
      error: 'Failed to search similar questions'
    })

    render(<SimilarQuestions query="test query" />)

    await waitFor(() => {
      expect(screen.getByText(/failed to load similar questions/i)).toBeInTheDocument()
    })
  })

  it('should not search for empty queries', () => {
    render(<SimilarQuestions query="" />)

    expect(mockFindSimilarQuestions).not.toHaveBeenCalled()
    expect(screen.queryByText(/finding similar questions/i)).not.toBeInTheDocument()
  })

  it('should debounce query changes', async () => {
    const { rerender } = render(<SimilarQuestions query="initial" />)

    // Change query multiple times quickly
    rerender(<SimilarQuestions query="test1" />)
    rerender(<SimilarQuestions query="test2" />)
    rerender(<SimilarQuestions query="test3" />)

    // Should only call once after debounce
    await waitFor(() => {
      expect(mockFindSimilarQuestions).toHaveBeenCalledTimes(1)
      expect(mockFindSimilarQuestions).toHaveBeenCalledWith('test3', undefined, 5)
    }, { timeout: 1000 })
  })

  it('should exclude current question when provided', async () => {
    mockFindSimilarQuestions.mockResolvedValue({
      success: true,
      questions: mockSimilarQuestions
    })

    render(<SimilarQuestions query="JWT auth" excludeQuestionId="current123" />)

    await waitFor(() => {
      expect(mockFindSimilarQuestions).toHaveBeenCalledWith('JWT auth', 'current123', 5)
    })
  })

  it('should handle clicking on similar question', async () => {
    const onQuestionClick = jest.fn()
    mockFindSimilarQuestions.mockResolvedValue({
      success: true,
      questions: mockSimilarQuestions
    })

    render(<SimilarQuestions query="JWT auth" onQuestionClick={onQuestionClick} />)

    await waitFor(() => {
      expect(screen.getByText('How to implement JWT authentication in React')).toBeInTheDocument()
    })

    const user = userEvent.setup()
    await user.click(screen.getByText('How to implement JWT authentication in React'))

    expect(onQuestionClick).toHaveBeenCalledWith(mockSimilarQuestions[0])
  })

  it('should show status badges correctly', async () => {
    mockFindSimilarQuestions.mockResolvedValue({
      success: true,
      questions: mockSimilarQuestions
    })

    render(<SimilarQuestions query="JWT auth" />)

    await waitFor(() => {
      expect(screen.getByText('Answered')).toBeInTheDocument()
      expect(screen.getByText('Resolved')).toBeInTheDocument()
    })
  })

  it('should truncate long snippets', async () => {
    const longSnippetQuestion = {
      ...mockSimilarQuestions[0],
      snippet: 'A'.repeat(200) + ' more text that should be truncated...'
    }

    mockFindSimilarQuestions.mockResolvedValue({
      success: true,
      questions: [longSnippetQuestion]
    })

    render(<SimilarQuestions query="test" />)

    await waitFor(() => {
      const snippetElement = screen.getByText(/A{150,}\.\.\./)
      expect(snippetElement).toBeInTheDocument()
    })
  })

  it('should refresh when query changes significantly', async () => {
    mockFindSimilarQuestions.mockResolvedValue({
      success: true,
      questions: mockSimilarQuestions
    })

    const { rerender } = render(<SimilarQuestions query="JWT authentication" />)

    await waitFor(() => {
      expect(mockFindSimilarQuestions).toHaveBeenCalledTimes(1)
    })

    // Change to completely different query
    rerender(<SimilarQuestions query="database optimization" />)

    await waitFor(() => {
      expect(mockFindSimilarQuestions).toHaveBeenCalledTimes(2)
      expect(mockFindSimilarQuestions).toHaveBeenLastCalledWith('database optimization', undefined, 5)
    })
  })
})