/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import AttachmentList from '../AttachmentList'

describe('AttachmentList Component - Simple Tests', () => {
  const mockAttachments = [
    {
      fileName: 'document.pdf',
      fileSize: 1024000,
      blobUrl: 'https://blob.storage/document.pdf',
      contentType: 'application/octet-stream'
    }
  ]

  it('should render attachment list', () => {
    render(<AttachmentList attachments={mockAttachments} />)
    expect(screen.getByText('添付ファイル (1)')).toBeInTheDocument()
    expect(screen.getByText('document.pdf')).toBeInTheDocument()
  })

  it('should handle empty attachment list', () => {
    render(<AttachmentList attachments={[]} />)
    expect(screen.queryByText(/添付ファイル/i)).not.toBeInTheDocument()
  })
})