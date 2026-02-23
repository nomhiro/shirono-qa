import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import QuestionForm from '../QuestionForm'
import { QuestionPriority, QuestionStatus } from '../../types/question'

// Mock the questions module
jest.mock('../../lib/questions', () => ({
  createQuestion: jest.fn(),
  updateQuestion: jest.fn(),
}))

import { createQuestion, updateQuestion } from '../../lib/questions'

const mockCreateQuestion = createQuestion as jest.MockedFunction<typeof createQuestion>
const mockUpdateQuestion = updateQuestion as jest.MockedFunction<typeof updateQuestion>

describe('QuestionForm Component', () => {
  beforeEach(() => {
    mockCreateQuestion.mockClear()
    mockUpdateQuestion.mockClear()
  })

  describe('Create Mode', () => {
    it('should render create form with all fields', () => {
      render(<QuestionForm mode="create" onSuccess={() => {}} onCancel={() => {}} />)

      expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/content/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/priority/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /create question/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('should show validation errors for empty fields', async () => {
      const user = userEvent.setup()
      render(<QuestionForm mode="create" onSuccess={() => {}} onCancel={() => {}} />)

      const submitButton = screen.getByRole('button', { name: /create question/i })
      await user.click(submitButton)

      expect(screen.getByText(/title is required/i)).toBeInTheDocument()
      expect(screen.getByText(/content is required/i)).toBeInTheDocument()
    })

    it('should call createQuestion with correct data', async () => {
      const user = userEvent.setup()
      const onSuccess = jest.fn()
      mockCreateQuestion.mockResolvedValue({
        success: true,
        question: {
          id: '1',
          title: 'Test Question',
          content: 'Test content',
          priority: QuestionPriority.HIGH,
          authorId: 'user1',
          groupId: 'group1',
          status: QuestionStatus.UNANSWERED,
          tags: [],
          attachments: [],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })

      render(<QuestionForm mode="create" onSuccess={onSuccess} onCancel={() => {}} />)

      await user.type(screen.getByLabelText(/title/i), 'Test Question')
      await user.type(screen.getByLabelText(/content/i), 'Test content')
      await user.selectOptions(screen.getByLabelText(/priority/i), 'high')
      await user.click(screen.getByRole('button', { name: /create question/i }))

      await waitFor(() => {
        expect(mockCreateQuestion).toHaveBeenCalledWith(
          {
            title: 'Test Question',
            content: 'Test content',
            priority: QuestionPriority.HIGH,
            attachments: []
          },
          expect.any(String), // authorId
          expect.any(String)  // groupId
        )
        expect(onSuccess).toHaveBeenCalled()
      })
    })
  })

  describe('Edit Mode', () => {
    const mockQuestion = {
      id: '1',
      title: 'Existing Question',
      content: 'Existing content',
      priority: QuestionPriority.MEDIUM,
      authorId: 'user1',
      groupId: 'group1',
      status: QuestionStatus.UNANSWERED,
      tags: [],
      attachments: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }

    it('should render edit form with existing data', () => {
      render(
        <QuestionForm
          mode="edit"
          question={mockQuestion}
          onSuccess={() => {}}
          onCancel={() => {}}
        />
      )

      expect(screen.getByDisplayValue('Existing Question')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Existing content')).toBeInTheDocument()
      expect(screen.getByRole('combobox')).toHaveValue('medium')
      expect(screen.getByRole('button', { name: /update question/i })).toBeInTheDocument()
    })

    it('should call updateQuestion with modified data', async () => {
      const user = userEvent.setup()
      const onSuccess = jest.fn()
      mockUpdateQuestion.mockResolvedValue({
        success: true,
        question: { ...mockQuestion, title: 'Updated Question' }
      })

      render(
        <QuestionForm
          mode="edit"
          question={mockQuestion}
          onSuccess={onSuccess}
          onCancel={() => {}}
        />
      )

      const titleInput = screen.getByLabelText(/title/i)
      await user.clear(titleInput)
      await user.type(titleInput, 'Updated Question')
      await user.click(screen.getByRole('button', { name: /update question/i }))

      await waitFor(() => {
        expect(mockUpdateQuestion).toHaveBeenCalledWith('1', {
          title: 'Updated Question',
          content: 'Existing content',
          priority: QuestionPriority.MEDIUM
        })
        expect(onSuccess).toHaveBeenCalled()
      })
    })
  })

  it('should handle file attachments', async () => {
    const user = userEvent.setup()
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' })

    render(<QuestionForm mode="create" onSuccess={() => {}} onCancel={() => {}} />)

    const fileInput = screen.getByLabelText(/attach files/i)
    await user.upload(fileInput, file)

    expect(screen.getByText('test.txt')).toBeInTheDocument()
  })

  it('should call onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup()
    const onCancel = jest.fn()

    render(<QuestionForm mode="create" onSuccess={() => {}} onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(onCancel).toHaveBeenCalled()
  })
})