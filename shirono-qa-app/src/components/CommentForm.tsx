'use client'

import { useState } from 'react'
import { CreateCommentRequest } from '../types/answer'
import { createComment } from '../lib/answers'

interface CommentFormProps {
  questionId: string
  answerId?: string
  onSuccess: () => void
  onCancel: () => void
}

export default function CommentForm({ questionId, answerId, onSuccess, onCancel }: CommentFormProps) {
  const [content, setContent] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [errors, setErrors] = useState<{ content?: string; general?: string }>({})
  const [isLoading, setIsLoading] = useState(false)

  const maxLength = 1000
  const isOverLimit = content.length > maxLength

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setAttachments(files)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Reset errors
    setErrors({})
    
    // Validation
    const newErrors: { content?: string } = {}
    if (!content.trim()) {
      newErrors.content = 'Comment is required'
    }
    
    if (isOverLimit) {
      newErrors.content = 'Comment is too long'
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    
    setIsLoading(true)
    
    try {
      const commentData: CreateCommentRequest = {
        content,
        answerId,
        attachments
      }
      
      // Mock authorId for testing
      const result = await createComment(commentData, questionId, 'current-user-id')
      
      if (result.success) {
        onSuccess()
        setContent('')
        setAttachments([])
      } else {
        setErrors({ general: result.error || 'Failed to create comment' })
      }
    } catch (error) {
      setErrors({ general: 'An unexpected error occurred' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="comment-content" className="block text-sm font-medium text-gray-700">
          {answerId ? 'Reply to this answer' : 'Comment on this question'}
        </label>
        <textarea
          id="comment-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${
            isOverLimit ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
          }`}
          maxLength={maxLength + 100} // Allow typing a bit over limit for better UX
          placeholder="Add your comment..."
        />
        {errors.content && (
          <p className="mt-1 text-sm text-red-600">{errors.content}</p>
        )}
        <div className="mt-1 flex justify-between text-sm">
          <span className={`${isOverLimit ? 'text-red-600' : 'text-gray-500'}`}>
            {content.length} / {maxLength}
          </span>
          {isOverLimit && (
            <span className="text-red-600 font-medium">Comment is too long</span>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="comment-attachments" className="block text-sm font-medium text-gray-700">
          Attach Files (optional)
        </label>
        <input
          id="comment-attachments"
          type="file"
          multiple
          onChange={handleFileChange}
          className="mt-1 block w-full text-sm"
          accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
        />
        {attachments.length > 0 && (
          <div className="mt-2">
            <p className="text-sm text-gray-600">Selected files:</p>
            <ul className="text-sm text-gray-800">
              {attachments.map((file, index) => (
                <li key={index} className="flex justify-between">
                  <span>{file.name}</span>
                  <span className="text-gray-500">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {errors.general && (
        <p className="text-sm text-red-600">{errors.general}</p>
      )}

      <div className="flex space-x-2">
        <button
          type="submit"
          disabled={isLoading || isOverLimit}
          className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 text-sm"
        >
          {isLoading ? 'Adding...' : 'Add Comment'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}