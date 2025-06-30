/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import QuestionsPage from '../page'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock fetch
global.fetch = jest.fn()

describe('Questions Page', () => {
  const mockPush = jest.fn()
  
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    })
    jest.clearAllMocks()
  })

  it('should display page title and heading', async () => {
    // Mock successful authentication check
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: { id: '1', username: 'testuser', isAdmin: false }
      })
    })
    // Mock questions fetch
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        questions: [],
        total: 0,
        page: 1
      })
    })

    render(<QuestionsPage />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('質問一覧')
    })
  })

  it('should display questions list when data is loaded', async () => {
    const mockQuestions = [
      {
        id: '1',
        title: 'Azure App Serviceの設定について',
        authorId: 'user1',
        status: '未回答',
        priority: '高',
        tags: ['Azure', 'App Service'],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      },
      {
        id: '2', 
        title: 'Next.jsの認証実装',
        authorId: 'user2',
        status: '回答済み',
        priority: '中',
        tags: ['Next.js', '認証'],
        createdAt: '2024-01-02T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z'
      }
    ]

    // Mock authentication
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: { id: '1', username: 'testuser', isAdmin: false }
      })
    })
    // Mock questions
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        questions: mockQuestions,
        total: 2,
        page: 1
      })
    })

    render(<QuestionsPage />)

    await waitFor(() => {
      expect(screen.getByText('Azure App Serviceの設定について')).toBeInTheDocument()
      expect(screen.getByText('Next.jsの認証実装')).toBeInTheDocument()
    })

    // Check status badges (using getAllByText since there are filter buttons too)
    const mitoAnswerElements = screen.getAllByText('未回答')
    expect(mitoAnswerElements.length).toBeGreaterThanOrEqual(1)
    
    const answeredElements = screen.getAllByText('回答済み')
    expect(answeredElements.length).toBeGreaterThanOrEqual(1)

    // Check priority badges  
    expect(screen.getByText('高')).toBeInTheDocument()
    expect(screen.getByText('中')).toBeInTheDocument()
  })

  it('should display new question button', async () => {
    // Mock authentication
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: { id: '1', username: 'testuser', isAdmin: false }
      })
    })
    // Mock questions
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        questions: [],
        total: 0,
        page: 1
      })
    })

    render(<QuestionsPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '新規質問' })).toBeInTheDocument()
    })
  })

  it('should redirect to login when not authenticated', async () => {
    // Mock failed authentication
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401
    })

    render(<QuestionsPage />)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })

  it('should display search functionality', async () => {
    // Mock authentication
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: { id: '1', username: 'testuser', isAdmin: false }
      })
    })
    // Mock questions
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        questions: [],
        total: 0,
        page: 1
      })
    })

    render(<QuestionsPage />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('質問を検索...')).toBeInTheDocument()
    })
  })

  it('should display filter options', async () => {
    // Mock authentication
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: { id: '1', username: 'testuser', isAdmin: false }
      })
    })
    // Mock questions
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        questions: [],
        total: 0,
        page: 1
      })
    })

    render(<QuestionsPage />)

    await waitFor(() => {
      expect(screen.getByText('すべて')).toBeInTheDocument()
      expect(screen.getByText('未回答')).toBeInTheDocument()
      expect(screen.getByText('回答済み')).toBeInTheDocument()
    })
  })

  it('should navigate to question detail when question title is clicked', async () => {
    const mockQuestions = [
      {
        id: 'question-123',
        title: 'クリック可能な質問タイトル',
        authorId: 'user1',
        status: '未回答',
        priority: '高',
        tags: ['Azure'],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      }
    ]

    // Mock authentication
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: { id: '1', username: 'testuser', isAdmin: false }
      })
    })
    // Mock questions
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        questions: mockQuestions,
        total: 1,
        page: 1
      })
    })

    render(<QuestionsPage />)

    await waitFor(() => {
      expect(screen.getByText('クリック可能な質問タイトル')).toBeInTheDocument()
    })

    // Click on question title
    const questionTitle = screen.getByText('クリック可能な質問タイトル')
    fireEvent.click(questionTitle)

    // Check navigation to detail page
    expect(mockPush).toHaveBeenCalledWith('/questions/question-123')
  })

  it('should navigate to new question form when new question button is clicked', async () => {
    // Mock authentication
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: { id: '1', username: 'testuser', isAdmin: false }
      })
    })
    // Mock questions
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        questions: [],
        total: 0,
        page: 1
      })
    })

    render(<QuestionsPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '新規質問' })).toBeInTheDocument()
    })

    // Click new question button
    const newQuestionButton = screen.getByRole('button', { name: '新規質問' })
    fireEvent.click(newQuestionButton)

    // Check navigation to new question form
    expect(mockPush).toHaveBeenCalledWith('/questions/new')
  })

  it('should make question titles clickable with cursor pointer', async () => {
    const mockQuestions = [
      {
        id: 'question-123',
        title: 'カーソルポインタ確認用質問',
        authorId: 'user1',
        status: '未回答',
        priority: '中',
        tags: ['テスト'],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      }
    ]

    // Mock authentication
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: { id: '1', username: 'testuser', isAdmin: false }
      })
    })
    // Mock questions
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        questions: mockQuestions,
        total: 1,
        page: 1
      })
    })

    render(<QuestionsPage />)

    await waitFor(() => {
      const questionTitle = screen.getByText('カーソルポインタ確認用質問')
      expect(questionTitle).toBeInTheDocument()
      expect(questionTitle).toHaveClass('cursor-pointer')
    })
  })
})