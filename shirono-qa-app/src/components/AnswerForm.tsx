'use client'

import { useState } from 'react'
import { Answer } from '../types/answer'
import { updateAnswer } from '../lib/answers'

interface AnswerFormProps {
  mode: 'create' | 'edit'
  questionId: string
  answer?: Answer
  onSuccess: () => void
  onCancel: () => void
}

export default function AnswerForm({ mode, answer, onSuccess, onCancel }: AnswerFormProps) {
  const [content, setContent] = useState(answer?.content || '')
  const [attachments, setAttachments] = useState<File[]>([])
  const [errors, setErrors] = useState<{ content?: string; general?: string }>({})
  const [isLoading, setIsLoading] = useState(false)

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
      newErrors.content = 'Content is required'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsLoading(true)

    try {
      if (mode === 'create') {

        // Note: This component is deprecated, use the main question detail page instead
        throw new Error('AnswerForm component is deprecated. Use question detail page for posting answers.')

        if (result.success) {
          onSuccess()
        } else {
          setErrors({ general: result.error || 'Failed to create answer' })
        }
      } else {
        const updateData = {
          content
        }

        const result = await updateAnswer(answer!.id, updateData)

        if (result.success) {
          onSuccess()
        } else {
          setErrors({ general: result.error || 'Failed to update answer' })
        }
      }
    } catch {
      setErrors({ general: 'An unexpected error occurred' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="answer-content" className="block text-sm font-medium text-gray-700">
          Answer Content
        </label>
        <textarea
          id="answer-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          maxLength={10000}
          placeholder="Provide your answer here..."
        />
        {errors.content && (
          <p className="mt-1 text-sm text-red-600">{errors.content}</p>
        )}
        <p className="mt-1 text-sm text-gray-500">
          {content.length} / 10000 characters
        </p>
      </div>

      {mode === 'create' && (
        <div>
          <label htmlFor="answer-attachments" className="block text-sm font-medium text-gray-700">
            Attach Files
          </label>
          <input
            id="answer-attachments"
            type="file"
            multiple
            onChange={handleFileChange}
            className="mt-1 block w-full"
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
                      ({(file.size / 1024 / 1024).toFixed(1)} MB)
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {errors.general && (
        <p className="text-sm text-red-600">{errors.general}</p>
      )}

      <div className="flex space-x-4">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isLoading
            ? 'Submitting...'
            : `${mode === 'create' ? 'Submit' : 'Update'} Answer`
          }
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}