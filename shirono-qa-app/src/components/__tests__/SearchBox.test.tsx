import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SearchBox from '../SearchBox'
import { QuestionStatus, QuestionPriority } from '../../types/question'

// Mock the search module
jest.mock('../../lib/search', () => ({
  searchQuestions: jest.fn(),
  getSearchSuggestions: jest.fn(),
}))

import { searchQuestions, getSearchSuggestions } from '../../lib/search'

const mockSearchQuestions = searchQuestions as jest.MockedFunction<typeof searchQuestions>
const mockGetSearchSuggestions = getSearchSuggestions as jest.MockedFunction<typeof getSearchSuggestions>

const mockSearchResults = {
  success: true,
  results: [
    {
      question: {
        id: 'q1',
        title: 'JWT Authentication in Next.js',
        content: 'How to implement JWT authentication...',
        tags: ['next.js', 'authentication'],
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
        }
      ],
      snippet: 'How to implement JWT authentication with proper security...'
    }
  ],
  total: 1,
  page: 1,
  query: 'JWT authentication'
}

describe('SearchBox Component', () => {
  beforeEach(() => {
    mockSearchQuestions.mockClear()
    mockGetSearchSuggestions.mockClear()
  })

  it('should render search input with placeholder', () => {
    render(<SearchBox onResults={() => {}} />)

    expect(screen.getByPlaceholderText(/search questions/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument()
  })

  it('should show search suggestions while typing', async () => {
    const user = userEvent.setup()
    mockGetSearchSuggestions.mockResolvedValue({
      success: true,
      suggestions: ['authentication', 'authorization', 'auth token']
    })

    render(<SearchBox onResults={() => {}} />)

    const searchInput = screen.getByPlaceholderText(/search questions/i)
    await user.type(searchInput, 'auth')

    await waitFor(() => {
      expect(screen.getByText('authentication')).toBeInTheDocument()
      expect(screen.getByText('authorization')).toBeInTheDocument()
      expect(screen.getByText('auth token')).toBeInTheDocument()
    })

    expect(mockGetSearchSuggestions).toHaveBeenCalledWith('auth')
  })

  it('should perform search on form submission', async () => {
    const user = userEvent.setup()
    const onResults = jest.fn()
    mockSearchQuestions.mockResolvedValue(mockSearchResults)

    render(<SearchBox onResults={onResults} />)

    const searchInput = screen.getByPlaceholderText(/search questions/i)
    await user.type(searchInput, 'JWT authentication')
    await user.click(screen.getByRole('button', { name: /search/i }))

    await waitFor(() => {
      expect(mockSearchQuestions).toHaveBeenCalledWith({
        q: 'JWT authentication',
        page: 1,
        limit: 20,
        status: undefined,
        priority: undefined,
        sortBy: 'relevance',
        sortOrder: 'desc'
      })
      expect(onResults).toHaveBeenCalledWith(mockSearchResults)
    })
  })

  it('should perform search on Enter key press', async () => {
    const user = userEvent.setup()
    const onResults = jest.fn()
    mockSearchQuestions.mockResolvedValue(mockSearchResults)

    render(<SearchBox onResults={onResults} />)

    const searchInput = screen.getByPlaceholderText(/search questions/i)
    await user.type(searchInput, 'Next.js setup{enter}')

    await waitFor(() => {
      expect(mockSearchQuestions).toHaveBeenCalledWith({
        q: 'Next.js setup',
        page: 1,
        limit: 20,
        status: undefined,
        priority: undefined,
        sortBy: 'relevance',
        sortOrder: 'desc'
      })
    })
  })

  it('should handle search suggestions selection', async () => {
    const user = userEvent.setup()
    const onResults = jest.fn()
    mockGetSearchSuggestions.mockResolvedValue({
      success: true,
      suggestions: ['authentication guide', 'authentication tutorial']
    })
    mockSearchQuestions.mockResolvedValue(mockSearchResults)

    render(<SearchBox onResults={onResults} />)

    const searchInput = screen.getByPlaceholderText(/search questions/i)
    await user.type(searchInput, 'auth')

    await waitFor(() => {
      expect(screen.getByText('authentication guide')).toBeInTheDocument()
    })

    await user.click(screen.getByText('authentication guide'))

    expect(searchInput).toHaveValue('authentication guide')
    await waitFor(() => {
      expect(mockSearchQuestions).toHaveBeenCalledWith({
        q: 'authentication guide',
        page: 1,
        limit: 20,
        status: undefined,
        priority: undefined,
        sortBy: 'relevance',
        sortOrder: 'desc'
      })
    })
  })

  it('should clear search results when input is cleared', async () => {
    const user = userEvent.setup()
    const onResults = jest.fn()

    render(<SearchBox onResults={onResults} />)

    const searchInput = screen.getByPlaceholderText(/search questions/i)
    await user.type(searchInput, 'test query')
    await user.clear(searchInput)

    expect(onResults).toHaveBeenCalledWith(null)
  })

  it('should show loading state during search', async () => {
    const user = userEvent.setup()
    mockSearchQuestions.mockImplementation(() => new Promise(() => {})) // Never resolves

    render(<SearchBox onResults={() => {}} />)

    const searchInput = screen.getByPlaceholderText(/search questions/i)
    const searchButton = screen.getByRole('button', { name: /search/i })

    await user.type(searchInput, 'test query')
    await user.click(searchButton)

    expect(screen.getByRole('button', { name: /searching/i })).toBeDisabled()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('should handle search errors gracefully', async () => {
    const user = userEvent.setup()
    const onResults = jest.fn()
    mockSearchQuestions.mockResolvedValue({
      success: false,
      error: 'Search service unavailable'
    })

    render(<SearchBox onResults={onResults} />)

    const searchInput = screen.getByPlaceholderText(/search questions/i)
    await user.type(searchInput, 'test query')
    await user.click(screen.getByRole('button', { name: /search/i }))

    await waitFor(() => {
      expect(screen.getByText(/search failed/i)).toBeInTheDocument()
      expect(screen.getByText(/search service unavailable/i)).toBeInTheDocument()
    })
  })

  it('should support advanced search filters', async () => {
    const user = userEvent.setup()
    const onResults = jest.fn()
    mockSearchQuestions.mockResolvedValue(mockSearchResults)

    render(<SearchBox onResults={onResults} enableFilters={true} />)

    // Open filters panel
    await user.click(screen.getByRole('button', { name: /filters/i }))

    // Set filters
    await user.selectOptions(screen.getByLabelText(/status/i), 'answered')
    await user.selectOptions(screen.getByLabelText(/priority/i), 'high')

    const searchInput = screen.getByPlaceholderText(/search questions/i)
    await user.type(searchInput, 'JWT')
    await user.click(screen.getByRole('button', { name: /search/i }))

    await waitFor(() => {
      expect(mockSearchQuestions).toHaveBeenCalledWith({
        q: 'JWT',
        status: QuestionStatus.ANSWERED,
        priority: QuestionPriority.HIGH,
        page: 1,
        limit: 20,
        sortBy: 'relevance',
        sortOrder: 'desc'
      })
    })
  })

  it('should debounce suggestions requests', async () => {
    const user = userEvent.setup()
    mockGetSearchSuggestions.mockResolvedValue({
      success: true,
      suggestions: ['test']
    })

    render(<SearchBox onResults={() => {}} />)

    const searchInput = screen.getByPlaceholderText(/search questions/i)
    
    // Type quickly
    await user.type(searchInput, 'abcdef')

    // Should only call suggestions once after debounce
    await waitFor(() => {
      expect(mockGetSearchSuggestions).toHaveBeenCalledTimes(1)
      expect(mockGetSearchSuggestions).toHaveBeenCalledWith('abcdef')
    }, { timeout: 1000 })
  })

  it('should hide suggestions on outside click', async () => {
    const user = userEvent.setup()
    mockGetSearchSuggestions.mockResolvedValue({
      success: true,
      suggestions: ['authentication']
    })

    render(
      <div>
        <SearchBox onResults={() => {}} />
        <div>Outside element</div>
      </div>
    )

    const searchInput = screen.getByPlaceholderText(/search questions/i)
    await user.type(searchInput, 'auth')

    await waitFor(() => {
      expect(screen.getByText('authentication')).toBeInTheDocument()
    })

    // Click outside
    await user.click(screen.getByText('Outside element'))

    expect(screen.queryByText('authentication')).not.toBeInTheDocument()
  })

  it('should support keyboard navigation in suggestions', async () => {
    const user = userEvent.setup()
    mockGetSearchSuggestions.mockResolvedValue({
      success: true,
      suggestions: ['authentication', 'authorization', 'auth token']
    })

    render(<SearchBox onResults={() => {}} />)

    const searchInput = screen.getByPlaceholderText(/search questions/i)
    await user.type(searchInput, 'auth')

    await waitFor(() => {
      expect(screen.getByText('authentication')).toBeInTheDocument()
    })

    // Navigate with arrow keys
    await user.keyboard('{ArrowDown}')
    expect(screen.getByText('authentication')).toHaveClass('highlighted')

    await user.keyboard('{ArrowDown}')
    expect(screen.getByText('authorization')).toHaveClass('highlighted')

    await user.keyboard('{ArrowUp}')
    expect(screen.getByText('authentication')).toHaveClass('highlighted')

    // Select with Enter
    await user.keyboard('{Enter}')
    expect(searchInput).toHaveValue('authentication')
  })
})