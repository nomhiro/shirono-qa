/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter, useParams } from 'next/navigation'
import QuestionDetailPage from '../page'
import { Question, QuestionStatus, QuestionPriority } from '@/types/question'

// MaterialUI のモック
jest.mock('@mui/material', () => ({
  Box: ({ children, ...props }: any) => <div data-testid="box" {...props}>{children}</div>,
  Typography: ({ children, ...props }: any) => <div data-testid="typography" {...props}>{children}</div>,
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
  Card: ({ children, ...props }: any) => <div data-testid="card" {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div data-testid="card-content" {...props}>{children}</div>,
  Chip: ({ label, ...props }: any) => <span data-testid="chip" {...props}>{label}</span>,
  TextField: ({ value, onChange, placeholder, ...props }: any) => (
    <input value={value} onChange={onChange} placeholder={placeholder} {...props} />
  ),
  FormControl: ({ children, ...props }: any) => <div data-testid="form-control" {...props}>{children}</div>,
  InputLabel: ({ children, ...props }: any) => <label {...props}>{children}</label>,
  Select: ({ value, onChange, children, ...props }: any) => (
    <select value={value} onChange={onChange} {...props}>{children}</select>
  ),
  MenuItem: ({ value, children, ...props }: any) => <option value={value} {...props}>{children}</option>,
  Alert: ({ children, severity, ...props }: any) => (
    <div data-testid="alert" data-severity={severity} {...props}>{children}</div>
  ),
  CircularProgress: () => <div data-testid="progress">Loading...</div>,
  Divider: () => <hr data-testid="divider" />,
}))

jest.mock('@mui/icons-material', () => ({
  Edit: () => <span>Edit Icon</span>,
  Save: () => <span>Save Icon</span>,
  Cancel: () => <span>Cancel Icon</span>,
}))

// Next.js navigation のモック
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
}))

// API calls のモック
jest.mock('@/lib/questions', () => ({
  getQuestion: jest.fn(),
  updateQuestion: jest.fn(),
  deleteQuestion: jest.fn(),
}))

jest.mock('@/lib/answers', () => ({
  getAnswersByQuestion: jest.fn(),
  createAnswer: jest.fn(),
}))

jest.mock('@/lib/auth', () => ({
  validateSession: jest.fn(),
}))

import { getQuestion, updateQuestion, deleteQuestion } from '@/lib/questions'
import { getAnswersByQuestion, createAnswer } from '@/lib/answers'
import { validateSession } from '@/lib/auth'

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>
const mockUseParams = useParams as jest.MockedFunction<typeof useParams>
const mockGetQuestion = getQuestion as jest.MockedFunction<typeof getQuestion>
const mockGetAnswersByQuestion = getAnswersByQuestion as jest.MockedFunction<typeof getAnswersByQuestion>
const mockValidateSession = validateSession as jest.MockedFunction<typeof validateSession>

const mockQuestion: Question = {
  id: 'question-123',
  title: 'How to implement JWT authentication in Next.js?',
  content: 'I need help with implementing JWT authentication with proper security practices in my Next.js application.',
  authorId: 'user-456',
  groupId: 'group-ts-ai',
  status: QuestionStatus.UNANSWERED,
  priority: QuestionPriority.HIGH,
  tags: ['next.js', 'authentication', 'security', 'jwt'],
  attachments: [],
  createdAt: new Date('2024-01-15T10:00:00Z'),
  updatedAt: new Date('2024-01-15T10:00:00Z'),
}

const mockAnswers = [
  {
    id: 'answer-1',
    questionId: 'question-123',
    content: 'You can use NextAuth.js for authentication. Here is how...',
    authorId: 'admin-user',
    attachments: [],
    createdAt: new Date('2024-01-15T11:00:00Z'),
  }
]

const mockUser = {
  id: 'user-456',
  username: 'testuser',
  email: 'test@example.com',
  groupId: 'group-ts-ai',
  isAdmin: false,
}

describe('QuestionDetailPage', () => {
  const mockPush = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRouter.mockReturnValue({ push: mockPush } as any)
    mockUseParams.mockReturnValue({ id: 'question-123' })
    
    // デフォルトのモック返り値を設定
    mockGetQuestion.mockResolvedValue({
      success: true,
      question: mockQuestion
    })
    
    mockGetAnswersByQuestion.mockResolvedValue({
      success: true,
      answers: mockAnswers
    })
    
    mockValidateSession.mockResolvedValue({
      valid: true,
      user: mockUser
    })
  })

  describe('質問表示モード', () => {
    it('should display question details correctly', async () => {
      render(<QuestionDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('How to implement JWT authentication in Next.js?')).toBeInTheDocument()
      })
      
      expect(screen.getByText(/I need help with implementing JWT authentication/)).toBeInTheDocument()
      expect(screen.getByText('High')).toBeInTheDocument()
      expect(screen.getByText('UNANSWERED')).toBeInTheDocument()
      expect(screen.getByText('next.js')).toBeInTheDocument()
      expect(screen.getByText('authentication')).toBeInTheDocument()
    })

    it('should show edit button for question author', async () => {
      render(<QuestionDetailPage />)

      await waitFor(() => {
        expect(screen.getByText(/edit question/i)).toBeInTheDocument()
      })
    })

    it('should not show edit button for non-author users', async () => {
      mockValidateSession.mockResolvedValue({
        valid: true,
        user: { ...mockUser, id: 'different-user' }
      })

      render(<QuestionDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('How to implement JWT authentication in Next.js?')).toBeInTheDocument()
      })
      
      expect(screen.queryByText(/edit question/i)).not.toBeInTheDocument()
    })

    it('should display answers and comments section', async () => {
      render(<QuestionDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Answers & Comments')).toBeInTheDocument()
      })
      
      expect(screen.getByText(/You can use NextAuth.js for authentication/)).toBeInTheDocument()
    })
  })

  describe('質問編集モード', () => {
    it('should switch to edit mode when edit button is clicked', async () => {
      render(<QuestionDetailPage />)

      await waitFor(() => {
        fireEvent.click(screen.getByText(/edit question/i))
      })
      
      expect(screen.getByDisplayValue('How to implement JWT authentication in Next.js?')).toBeInTheDocument()
      expect(screen.getByText(/save changes/i)).toBeInTheDocument()
      expect(screen.getByText(/cancel/i)).toBeInTheDocument()
    })

    it('should save changes when save button is clicked', async () => {
      const mockUpdateQuestion = updateQuestion as jest.MockedFunction<typeof updateQuestion>
      mockUpdateQuestion.mockResolvedValue({
        success: true,
        question: { ...mockQuestion, title: 'Updated title' }
      })

      render(<QuestionDetailPage />)

      await waitFor(() => {
        fireEvent.click(screen.getByText(/edit question/i))
      })

      const titleInput = screen.getByDisplayValue('How to implement JWT authentication in Next.js?')
      fireEvent.change(titleInput, { target: { value: 'Updated title' } })
      
      fireEvent.click(screen.getByText(/save changes/i))

      await waitFor(() => {
        expect(mockUpdateQuestion).toHaveBeenCalledWith('question-123', {
          title: 'Updated title',
          content: mockQuestion.content,
          priority: mockQuestion.priority
        })
      })
    })

    it('should cancel edit mode when cancel button is clicked', async () => {
      render(<QuestionDetailPage />)

      await waitFor(() => {
        fireEvent.click(screen.getByText(/edit question/i))
      })
      
      fireEvent.click(screen.getByText(/cancel/i))
      
      expect(screen.getByText('How to implement JWT authentication in Next.js?')).toBeInTheDocument()
      expect(screen.queryByDisplayValue('How to implement JWT authentication in Next.js?')).not.toBeInTheDocument()
    })
  })

  describe('ステータス変更', () => {
    it('should allow admin to mark question as resolved', async () => {
      mockValidateSession.mockResolvedValue({
        valid: true,
        user: { ...mockUser, isAdmin: true }
      })

      const mockUpdateQuestion = updateQuestion as jest.MockedFunction<typeof updateQuestion>
      mockUpdateQuestion.mockResolvedValue({
        success: true,
        question: { ...mockQuestion, status: QuestionStatus.RESOLVED }
      })

      render(<QuestionDetailPage />)

      await waitFor(() => {
        expect(screen.getByText(/mark as resolved/i)).toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByText(/mark as resolved/i))

      await waitFor(() => {
        expect(mockUpdateQuestion).toHaveBeenCalledWith('question-123', {
          status: QuestionStatus.RESOLVED
        })
      })
    })

    it('should allow question author to mark as resolved', async () => {
      const mockUpdateQuestion = updateQuestion as jest.MockedFunction<typeof updateQuestion>
      mockUpdateQuestion.mockResolvedValue({
        success: true,
        question: { ...mockQuestion, status: QuestionStatus.RESOLVED }
      })

      render(<QuestionDetailPage />)

      await waitFor(() => {
        expect(screen.getByText(/mark as resolved/i)).toBeInTheDocument()
      })
    })
  })

  describe('回答投稿', () => {
    it('should display answer form for authenticated users', async () => {
      render(<QuestionDetailPage />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/write your answer/i)).toBeInTheDocument()
      })
      
      expect(screen.getByText(/post answer/i)).toBeInTheDocument()
    })

    it('should submit new answer successfully', async () => {
      const mockCreateAnswer = createAnswer as jest.MockedFunction<typeof createAnswer>
      mockCreateAnswer.mockResolvedValue({
        success: true,
        answer: {
          id: 'new-answer',
          questionId: 'question-123',
          content: 'Here is my answer...',
          authorId: 'user-456',
          attachments: [],
          createdAt: new Date(),
        }
      })

      render(<QuestionDetailPage />)

      await waitFor(() => {
        const answerTextarea = screen.getByPlaceholderText(/write your answer/i)
        fireEvent.change(answerTextarea, { target: { value: 'Here is my answer...' } })
      })
      
      fireEvent.click(screen.getByText(/post answer/i))

      await waitFor(() => {
        expect(mockCreateAnswer).toHaveBeenCalledWith(
          { content: 'Here is my answer...' },
          'question-123',
          'user-456'
        )
      })
    })
  })

  describe('エラーハンドリング', () => {
    it('should display error when question not found', async () => {
      const mockGetQuestion = getQuestion as jest.MockedFunction<typeof getQuestion>
      mockGetQuestion.mockResolvedValue({
        success: false,
        error: 'Question not found'
      })

      render(<QuestionDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Question not found')).toBeInTheDocument()
      })
    })

    it('should display loading state while fetching data', () => {
      const mockGetQuestion = getQuestion as jest.MockedFunction<typeof getQuestion>
      mockGetQuestion.mockImplementation(() => new Promise(() => {}))

      render(<QuestionDetailPage />)

      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })
  })
})