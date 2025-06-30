import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CommentForm from '../CommentForm'

// Mock the answers module
jest.mock('../../lib/answers', () => ({
  createComment: jest.fn(),
}))

import { createComment } from '../../lib/answers'

const mockCreateComment = createComment as jest.MockedFunction<typeof createComment>

describe('CommentForm Component', () => {
  beforeEach(() => {
    mockCreateComment.mockClear()
  })

  it('should render comment form with content field', () => {
    render(
      <CommentForm 
        questionId="question123"
        onSuccess={() => {}} 
        onCancel={() => {}} 
      />
    )

    expect(screen.getByLabelText(/comment on this question/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add comment/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('should show validation error for empty content', async () => {
    const user = userEvent.setup()
    render(
      <CommentForm 
        questionId="question123"
        onSuccess={() => {}} 
        onCancel={() => {}} 
      />
    )

    const submitButton = screen.getByRole('button', { name: /add comment/i })
    await user.click(submitButton)

    expect(screen.getByText(/comment is required/i)).toBeInTheDocument()
  })

  it('should call createComment for question comment', async () => {
    const user = userEvent.setup()
    const onSuccess = jest.fn()
    mockCreateComment.mockResolvedValue({
      success: true,
      comment: {
        id: '1',
        questionId: 'question123',
        content: 'Test comment',
        authorId: 'user1',
        attachments: [],
        createdAt: new Date()
      }
    })

    render(
      <CommentForm 
        questionId="question123"
        onSuccess={onSuccess} 
        onCancel={() => {}} 
      />
    )

    await user.type(screen.getByLabelText(/comment on this question/i), 'Test comment')
    await user.click(screen.getByRole('button', { name: /add comment/i }))

    await waitFor(() => {
      expect(mockCreateComment).toHaveBeenCalledWith(
        {
          content: 'Test comment',
          attachments: []
        },
        'question123',
        expect.any(String) // authorId
      )
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  it('should call createComment for answer comment', async () => {
    const user = userEvent.setup()
    const onSuccess = jest.fn()
    mockCreateComment.mockResolvedValue({
      success: true,
      comment: {
        id: '1',
        questionId: 'question123',
        answerId: 'answer123',
        content: 'Test comment on answer',
        authorId: 'user1',
        attachments: [],
        createdAt: new Date()
      }
    })

    render(
      <CommentForm 
        questionId="question123"
        answerId="answer123"
        onSuccess={onSuccess} 
        onCancel={() => {}} 
      />
    )

    await user.type(screen.getByLabelText(/reply to this answer/i), 'Test comment on answer')
    await user.click(screen.getByRole('button', { name: /add comment/i }))

    await waitFor(() => {
      expect(mockCreateComment).toHaveBeenCalledWith(
        {
          content: 'Test comment on answer',
          answerId: 'answer123',
          attachments: []
        },
        'question123',
        expect.any(String) // authorId
      )
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  it('should show error message for failed comment creation', async () => {
    const user = userEvent.setup()
    mockCreateComment.mockResolvedValue({
      success: false,
      error: 'Failed to create comment'
    })

    render(
      <CommentForm 
        questionId="question123"
        onSuccess={() => {}} 
        onCancel={() => {}} 
      />
    )

    await user.type(screen.getByLabelText(/comment on this question/i), 'Test comment')
    await user.click(screen.getByRole('button', { name: /add comment/i }))

    await waitFor(() => {
      expect(screen.getByText(/failed to create comment/i)).toBeInTheDocument()
    })
  })

  it('should handle file attachments', async () => {
    const user = userEvent.setup()
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' })

    render(
      <CommentForm 
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
      <CommentForm 
        questionId="question123"
        onSuccess={() => {}} 
        onCancel={onCancel} 
      />
    )

    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(onCancel).toHaveBeenCalled()
  })

  it('should show character count for comment', async () => {
    const user = userEvent.setup()
    render(
      <CommentForm 
        questionId="question123"
        onSuccess={() => {}} 
        onCancel={() => {}} 
      />
    )

    await user.type(screen.getByLabelText(/comment on this question/i), 'Test')

    expect(screen.getByText(/4 \/ 1000/)).toBeInTheDocument()
  })

  it('should prevent submission when character limit exceeded', async () => {
    const user = userEvent.setup()
    render(
      <CommentForm 
        questionId="question123"
        onSuccess={() => {}} 
        onCancel={() => {}} 
      />
    )

    const longComment = 'A'.repeat(1001)
    await user.type(screen.getByLabelText(/comment on this question/i), longComment)

    const submitButton = screen.getByRole('button', { name: /add comment/i })
    expect(submitButton).toBeDisabled()
    expect(screen.getByText(/comment is too long/i)).toBeInTheDocument()
  })
})