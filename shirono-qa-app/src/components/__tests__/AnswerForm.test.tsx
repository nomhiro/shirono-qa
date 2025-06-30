import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AnswerForm from '../AnswerForm'

// Mock the answers module
jest.mock('../../lib/answers', () => ({
  createAnswer: jest.fn(),
  updateAnswer: jest.fn(),
}))

import { createAnswer, updateAnswer } from '../../lib/answers'

const mockCreateAnswer = createAnswer as jest.MockedFunction<typeof createAnswer>
const mockUpdateAnswer = updateAnswer as jest.MockedFunction<typeof updateAnswer>

describe('AnswerForm Component', () => {
  beforeEach(() => {
    mockCreateAnswer.mockClear()
    mockUpdateAnswer.mockClear()
  })

  describe('Create Mode', () => {
    it('should render answer form with content field', () => {
      render(
        <AnswerForm 
          mode="create" 
          questionId="question123"
          onSuccess={() => {}} 
          onCancel={() => {}} 
        />
      )

      expect(screen.getByLabelText(/answer content/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /submit answer/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('should show validation error for empty content', async () => {
      const user = userEvent.setup()
      render(
        <AnswerForm 
          mode="create" 
          questionId="question123"
          onSuccess={() => {}} 
          onCancel={() => {}} 
        />
      )

      const submitButton = screen.getByRole('button', { name: /submit answer/i })
      await user.click(submitButton)

      expect(screen.getByText(/content is required/i)).toBeInTheDocument()
    })

    it('should call createAnswer with correct data', async () => {
      const user = userEvent.setup()
      const onSuccess = jest.fn()
      mockCreateAnswer.mockResolvedValue({
        success: true,
        answer: {
          id: '1',
          questionId: 'question123',
          content: 'Test answer',
          authorId: 'user1',
          attachments: [],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })

      render(
        <AnswerForm 
          mode="create" 
          questionId="question123"
          onSuccess={onSuccess} 
          onCancel={() => {}} 
        />
      )

      await user.type(screen.getByLabelText(/answer content/i), 'Test answer')
      await user.click(screen.getByRole('button', { name: /submit answer/i }))

      await waitFor(() => {
        expect(mockCreateAnswer).toHaveBeenCalledWith(
          {
            content: 'Test answer',
            attachments: []
          },
          'question123',
          expect.any(String) // authorId
        )
        expect(onSuccess).toHaveBeenCalled()
      })
    })

    it('should show error message for failed answer creation', async () => {
      const user = userEvent.setup()
      mockCreateAnswer.mockResolvedValue({
        success: false,
        error: 'Failed to create answer'
      })

      render(
        <AnswerForm 
          mode="create" 
          questionId="question123"
          onSuccess={() => {}} 
          onCancel={() => {}} 
        />
      )

      await user.type(screen.getByLabelText(/answer content/i), 'Test answer')
      await user.click(screen.getByRole('button', { name: /submit answer/i }))

      await waitFor(() => {
        expect(screen.getByText(/failed to create answer/i)).toBeInTheDocument()
      })
    })
  })

  describe('Edit Mode', () => {
    const mockAnswer = {
      id: '1',
      questionId: 'question123',
      content: 'Existing answer',
      authorId: 'user1',
      attachments: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }

    it('should render edit form with existing data', () => {
      render(
        <AnswerForm
          mode="edit"
          questionId="question123"
          answer={mockAnswer}
          onSuccess={() => {}}
          onCancel={() => {}}
        />
      )

      expect(screen.getByDisplayValue('Existing answer')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /update answer/i })).toBeInTheDocument()
    })

    it('should call updateAnswer with modified data', async () => {
      const user = userEvent.setup()
      const onSuccess = jest.fn()
      mockUpdateAnswer.mockResolvedValue({
        success: true,
        answer: { ...mockAnswer, content: 'Updated answer' }
      })

      render(
        <AnswerForm
          mode="edit"
          questionId="question123"
          answer={mockAnswer}
          onSuccess={onSuccess}
          onCancel={() => {}}
        />
      )

      const contentTextarea = screen.getByLabelText(/answer content/i)
      await user.clear(contentTextarea)
      await user.type(contentTextarea, 'Updated answer')
      await user.click(screen.getByRole('button', { name: /update answer/i }))

      await waitFor(() => {
        expect(mockUpdateAnswer).toHaveBeenCalledWith('1', {
          content: 'Updated answer'
        })
        expect(onSuccess).toHaveBeenCalled()
      })
    })
  })

  it('should handle file attachments', async () => {
    const user = userEvent.setup()
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' })

    render(
      <AnswerForm 
        mode="create" 
        questionId="question123"
        onSuccess={() => {}} 
        onCancel={() => {}} 
      />
    )

    const fileInput = screen.getByLabelText(/attach files/i)
    await user.upload(fileInput, file)

    expect(screen.getByText('test.txt')).toBeInTheDocument()
  })

  it('should call onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup()
    const onCancel = jest.fn()

    render(
      <AnswerForm 
        mode="create" 
        questionId="question123"
        onSuccess={() => {}} 
        onCancel={onCancel} 
      />
    )

    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(onCancel).toHaveBeenCalled()
  })

  it('should disable submit button during submission', async () => {
    const user = userEvent.setup()
    mockCreateAnswer.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({
      success: false,
      error: 'Some error'
    }), 100)))

    render(
      <AnswerForm 
        mode="create" 
        questionId="question123"
        onSuccess={() => {}} 
        onCancel={() => {}} 
      />
    )

    await user.type(screen.getByLabelText(/answer content/i), 'Test answer')
    await user.click(screen.getByRole('button', { name: /submit answer/i }))

    expect(screen.getByRole('button', { name: /submitting/i })).toBeDisabled()
  })
})