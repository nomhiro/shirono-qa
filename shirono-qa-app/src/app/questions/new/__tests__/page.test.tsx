/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import NewQuestionPage from '../page'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock FileUpload component and useFileUpload hook
jest.mock('@/components/FileUpload', () => {
  return function MockFileUpload({ onFilesChange }: any) {
    return (
      <div>
        <div>ファイルをドラッグ&ドロップ</div>
        <div>最大5ファイル、1ファイルあたり最大1GB</div>
        <input 
          data-testid="file-input" 
          type="file" 
          multiple
          onChange={(e) => {
            const files = Array.from(e.target.files || [])
            onFilesChange(files)
          }}
        />
      </div>
    )
  }
})

// Mock fetch
global.fetch = jest.fn()

describe('NewQuestionPage', () => {
  const mockPush = jest.fn()
  const mockBack = jest.fn()
  
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      back: mockBack,
    })
    jest.clearAllMocks()
  })

  it('should display new question form', async () => {
    // Mock successful authentication check
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: { id: '1', username: 'testuser', isAdmin: false }
      })
    })

    render(<NewQuestionPage />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('新規質問投稿')
    })

    // Check form fields
    expect(screen.getByLabelText(/質問タイトル/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/質問内容/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/優先度/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /投稿/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /キャンセル/i })).toBeInTheDocument()
  })

  it('should redirect to login when not authenticated', async () => {
    // Mock failed authentication
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401
    })

    render(<NewQuestionPage />)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })

  it('should submit new question successfully', async () => {
    const user = userEvent.setup()

    // Mock authentication
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: { id: '1', username: 'testuser', isAdmin: false }
      })
    })

    // Mock question creation
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        question: {
          id: 'new-question-123',
          title: 'テスト質問',
          content: 'これはテスト用の質問内容です',
          priority: '中',
          status: '未回答'
        }
      })
    })

    render(<NewQuestionPage />)

    await waitFor(() => {
      expect(screen.getByLabelText(/質問タイトル/i)).toBeInTheDocument()
    })

    // Fill form
    const titleInput = screen.getByLabelText(/質問タイトル/i)
    const contentInput = screen.getByLabelText(/質問内容/i)
    const submitButton = screen.getByRole('button', { name: /投稿/i })

    await user.type(titleInput, 'テスト質問')
    await user.type(contentInput, 'これはテスト用の質問内容です')

    // Submit form
    await user.click(submitButton)

    // Check API call
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/questions', expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'テスト質問',
          content: 'これはテスト用の質問内容です',
          priority: 'medium',
          attachments: []
        })
      }))
    })

    // Check navigation to question detail
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/questions/new-question-123')
    })
  })

  it('should cancel and go back when cancel button is clicked', async () => {
    const user = userEvent.setup()

    // Mock authentication
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: { id: '1', username: 'testuser', isAdmin: false }
      })
    })

    render(<NewQuestionPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /キャンセル/i })).toBeInTheDocument()
    })

    const cancelButton = screen.getByRole('button', { name: /キャンセル/i })
    await user.click(cancelButton)

    expect(mockBack).toHaveBeenCalled()
  })

  it('should validate required fields', async () => {
    const user = userEvent.setup()

    // Mock authentication
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: { id: '1', username: 'testuser', isAdmin: false }
      })
    })

    render(<NewQuestionPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /投稿/i })).toBeInTheDocument()
    })

    // Try to submit without filling required fields
    const submitButton = screen.getByRole('button', { name: /投稿/i })
    await user.click(submitButton)

    // Check validation errors
    await waitFor(() => {
      expect(screen.getByText(/質問タイトルは必須です/i)).toBeInTheDocument()
      expect(screen.getByText(/質問内容は必須です/i)).toBeInTheDocument()
    })

    // Should not make API call
    expect(fetch).toHaveBeenCalledTimes(1) // Only auth call
  })

  it('should display file upload component', async () => {
    // Mock authentication
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: { id: '1', username: 'testuser', isAdmin: false }
      })
    })

    render(<NewQuestionPage />)

    await waitFor(() => {
      expect(screen.getByText(/ファイルをドラッグ&ドロップ/i)).toBeInTheDocument()
      expect(screen.getByText(/最大5ファイル/i)).toBeInTheDocument()
    })
  })

  it('should submit question with attached files', async () => {
    const user = userEvent.setup()

    // Mock authentication
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: { id: '1', username: 'testuser', isAdmin: false }
      })
    })

    // Mock file upload API
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        urls: ['https://blob.storage/file1.pdf', 'https://blob.storage/file2.jpg']
      })
    })

    // Mock question creation with files
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        question: {
          id: 'question-with-files-123',
          title: 'ファイル付き質問',
          content: 'ファイルが添付された質問です',
          priority: '中',
          status: '未回答',
          attachments: [
            { fileName: 'document.pdf', fileSize: 1024, blobUrl: 'https://blob.storage/file1.pdf' },
            { fileName: 'image.jpg', fileSize: 2048, blobUrl: 'https://blob.storage/file2.jpg' }
          ]
        }
      })
    })

    render(<NewQuestionPage />)

    await waitFor(() => {
      expect(screen.getByLabelText(/質問タイトル/i)).toBeInTheDocument()
    })

    // Fill form
    const titleInput = screen.getByLabelText(/質問タイトル/i)
    const contentInput = screen.getByLabelText(/質問内容/i)

    await user.type(titleInput, 'ファイル付き質問')
    await user.type(contentInput, 'ファイルが添付された質問です')

    // Simulate file selection (this would be handled by FileUpload component)
    const fileInput = screen.getByTestId('file-input')
    const files = [
      new File(['document content'], 'document.pdf', { type: 'application/pdf' }),
      new File(['image content'], 'image.jpg', { type: 'image/jpeg' })
    ]

    await user.upload(fileInput, files)

    // Submit form
    const submitButton = screen.getByRole('button', { name: /投稿/i })
    await user.click(submitButton)

    // Check that files were uploaded first
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/files/upload', expect.objectContaining({
        method: 'POST',
        body: expect.any(FormData)
      }))
    })

    // Check question creation with file URLs
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/questions', expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'ファイル付き質問',
          content: 'ファイルが添付された質問です',
          priority: 'medium',
          attachments: [
            { fileName: 'document.pdf', fileSize: 16, blobUrl: 'https://blob.storage/file1.pdf' },
            { fileName: 'image.jpg', fileSize: 13, blobUrl: 'https://blob.storage/file2.jpg' }
          ]
        })
      }))
    })

    // Check navigation to question detail
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/questions/question-with-files-123')
    })
  })
})