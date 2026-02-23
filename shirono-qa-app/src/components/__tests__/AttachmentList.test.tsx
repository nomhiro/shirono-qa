/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AttachmentList from '../AttachmentList'

// Mock fetch for download
global.fetch = jest.fn()

const mockAttachments = [
  {
    fileName: 'document.pdf',
    fileSize: 1024000,
    blobUrl: 'https://blob.storage/document.pdf',
    contentType: 'application/octet-stream'
  },
  {
    fileName: 'image.jpg',
    fileSize: 512000,
    blobUrl: 'https://blob.storage/image.jpg',
    contentType: 'application/octet-stream'
  },
  {
    fileName: 'presentation.pptx',
    fileSize: 2048000,
    blobUrl: 'https://blob.storage/presentation.pptx',
    contentType: 'application/octet-stream'
  }
]

describe('AttachmentList Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup DOM environment
    if (typeof document !== 'undefined') {
      document.body.innerHTML = ''
    }
    
    // Mock successful download response
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(['file content'], { type: 'application/pdf' })),
      headers: {
        get: (name: string) => {
          if (name === 'content-disposition') {
            return 'attachment; filename="document.pdf"'
          }
          return null
        }
      }
    })

    // Mock URL.createObjectURL and revokeObjectURL
    Object.defineProperty(global, 'URL', {
      value: {
        createObjectURL: jest.fn(() => 'mock-blob-url'),
        revokeObjectURL: jest.fn()
      },
      writable: true
    })

    // Mock createElement and click for download
    const mockLink = {
      href: '',
      download: '',
      click: jest.fn(),
      style: { display: '' }
    }
    jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any)
    jest.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any)
    jest.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should render attachment list with file details', () => {
    render(<AttachmentList attachments={mockAttachments} />)

    expect(screen.getByText('添付ファイル (3)')).toBeInTheDocument()
    expect(screen.getByText('document.pdf')).toBeInTheDocument()
    expect(screen.getByText('image.jpg')).toBeInTheDocument()
    expect(screen.getByText('presentation.pptx')).toBeInTheDocument()

    // Check file sizes
    expect(screen.getByText('1.0 MB')).toBeInTheDocument()
    expect(screen.getByText('512.0 KB')).toBeInTheDocument()
    expect(screen.getByText('2.0 MB')).toBeInTheDocument()
  })

  it('should show appropriate file icons for different file types', () => {
    render(<AttachmentList attachments={mockAttachments} />)

    // PDF file should have document icon
    const pdfIcon = screen.getByTestId('InsertDriveFileIcon')
    expect(pdfIcon).toBeInTheDocument()

    // Image file should have image icon  
    const imageIcon = screen.getByTestId('ImageIcon')
    expect(imageIcon).toBeInTheDocument()
  })

  it('should display download buttons for all files', () => {
    render(<AttachmentList attachments={mockAttachments} />)

    const downloadButtons = screen.getAllByRole('button', { name: /ダウンロード/i })
    expect(downloadButtons).toHaveLength(3)
  })

  it('should handle file download when download button is clicked', async () => {
    const user = userEvent.setup()
    render(<AttachmentList attachments={[mockAttachments[0]]} />)

    const downloadButton = screen.getByRole('button', { name: /ダウンロード/i })
    await user.click(downloadButton)

    // Check that download API was called
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/files/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          blobUrl: 'https://blob.storage/document.pdf',
          fileName: 'document.pdf'
        })
      })
    })

    // Check that blob URL was created and download was triggered
    expect(URL.createObjectURL).toHaveBeenCalled()
    expect(document.createElement).toHaveBeenCalledWith('a')
  })

  it('should show download progress during file download', async () => {
    const user = userEvent.setup()
    
    // Mock delayed response
    ;(fetch as jest.Mock).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        blob: () => Promise.resolve(new Blob(['file content'])),
        headers: { get: () => null }
      }), 100))
    )

    render(<AttachmentList attachments={[mockAttachments[0]]} />)

    const downloadButton = screen.getByRole('button', { name: /ダウンロード/i })
    await user.click(downloadButton)

    // Check that download progress is shown
    expect(screen.getByText(/ダウンロード中/i)).toBeInTheDocument()
    expect(downloadButton).toBeDisabled()

    // Wait for download to complete
    await waitFor(() => {
      expect(screen.queryByText(/ダウンロード中/i)).not.toBeInTheDocument()
    })
  })

  it('should handle download errors gracefully', async () => {
    const user = userEvent.setup()
    
    // Mock failed response
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    })

    render(<AttachmentList attachments={[mockAttachments[0]]} />)

    const downloadButton = screen.getByRole('button', { name: /ダウンロード/i })
    await user.click(downloadButton)

    // Check that error message is shown
    await waitFor(() => {
      expect(screen.getByText(/ダウンロードに失敗しました/i)).toBeInTheDocument()
    })
  })

  it('should show correct file type indicators', () => {
    const diverseAttachments = [
      { fileName: 'doc.pdf', fileSize: 1000, blobUrl: 'url1', contentType: 'application/octet-stream' },
      { fileName: 'image.jpg', fileSize: 1000, blobUrl: 'url2', contentType: 'application/octet-stream' },
      { fileName: 'sheet.xlsx', fileSize: 1000, blobUrl: 'url3', contentType: 'application/octet-stream' },
      { fileName: 'presentation.pptx', fileSize: 1000, blobUrl: 'url4', contentType: 'application/octet-stream' },
      { fileName: 'text.txt', fileSize: 1000, blobUrl: 'url5', contentType: 'application/octet-stream' },
    ]

    render(<AttachmentList attachments={diverseAttachments} />)

    // Check that appropriate file type indicators are shown
    expect(screen.getByText('PDF')).toBeInTheDocument()
    expect(screen.getByText('JPG')).toBeInTheDocument()
    expect(screen.getByText('XLSX')).toBeInTheDocument()
    expect(screen.getByText('PPTX')).toBeInTheDocument()
    expect(screen.getByText('TXT')).toBeInTheDocument()
  })

  it('should handle empty attachment list', () => {
    render(<AttachmentList attachments={[]} />)

    expect(screen.queryByText(/添付ファイル/i)).not.toBeInTheDocument()
  })

  it('should format file sizes correctly', () => {
    const sizeTestAttachments = [
      { fileName: 'small.txt', fileSize: 500, blobUrl: 'url1', contentType: 'application/octet-stream' },
      { fileName: 'medium.pdf', fileSize: 1500000, blobUrl: 'url2', contentType: 'application/octet-stream' },
      { fileName: 'large.zip', fileSize: 50000000, blobUrl: 'url3', contentType: 'application/octet-stream' },
    ]

    render(<AttachmentList attachments={sizeTestAttachments} />)

    expect(screen.getByText('500 B')).toBeInTheDocument()
    expect(screen.getByText('1.4 MB')).toBeInTheDocument()
    expect(screen.getByText('47.7 MB')).toBeInTheDocument()
  })

  it('should handle network errors during download', async () => {
    const user = userEvent.setup()
    
    // Mock network error
    ;(fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

    render(<AttachmentList attachments={[mockAttachments[0]]} />)

    const downloadButton = screen.getByRole('button', { name: /ダウンロード/i })
    await user.click(downloadButton)

    // Check that error message is shown
    await waitFor(() => {
      expect(screen.getByText(/ダウンロードに失敗しました/i)).toBeInTheDocument()
    })
  })
})