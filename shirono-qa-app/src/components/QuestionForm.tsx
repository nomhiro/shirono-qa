'use client'

import { useState } from 'react'
import { Question, QuestionPriority, CreateQuestionRequest } from '../types/question'
import { createQuestion, updateQuestion } from '../lib/questions'

interface QuestionFormProps {
  mode: 'create' | 'edit'
  question?: Question
  onSuccess: () => void
  onCancel: () => void
}

export default function QuestionForm({ mode, question, onSuccess, onCancel }: QuestionFormProps) {
  const [title, setTitle] = useState(question?.title || '')
  const [content, setContent] = useState(question?.content || '')
  const [priority, setPriority] = useState(question?.priority || QuestionPriority.MEDIUM)
  const [attachments, setAttachments] = useState<File[]>([])
  const [errors, setErrors] = useState<{ title?: string; content?: string; general?: string }>({})
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
    const newErrors: { title?: string; content?: string } = {}
    if (!title.trim()) {
      newErrors.title = 'Title is required'
    }
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
        const questionData: CreateQuestionRequest = {
          title,
          content,
          priority,
          attachments
        }
        
        // This component should not be used directly - user session required
        throw new Error('QuestionForm component is deprecated - use authenticated API routes instead')
        
        if (result.success) {
          onSuccess()
        } else {
          setErrors({ general: result.error || 'Failed to create question' })
        }
      } else {
        const updateData = {
          title,
          content,
          priority
        }
        
        const result = await updateQuestion(question!.id, updateData)
        
        if (result.success) {
          onSuccess()
        } else {
          setErrors({ general: result.error || 'Failed to update question' })
        }
      }
    } catch (error) {
      setErrors({ general: 'An unexpected error occurred' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          Title
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          maxLength={100}
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600">{errors.title}</p>
        )}
      </div>

      <div>
        <label htmlFor="content" className="block text-sm font-medium text-gray-700">
          Content
        </label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={8}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          maxLength={10000}
        />
        {errors.content && (
          <p className="mt-1 text-sm text-red-600">{errors.content}</p>
        )}
      </div>

      <div>
        <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
          Priority
        </label>
        <select
          id="priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value as QuestionPriority)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        >
          <option value={QuestionPriority.LOW}>Low</option>
          <option value={QuestionPriority.MEDIUM}>Medium</option>
          <option value={QuestionPriority.HIGH}>High</option>
        </select>
      </div>

      {mode === 'create' && (
        <div>
          <label htmlFor="attachments" className="block text-sm font-medium text-gray-700">
            Attach Files
          </label>
          <input
            id="attachments"
            type="file"
            multiple
            onChange={handleFileChange}
            className="mt-1 block w-full"
          />
          {attachments.length > 0 && (
            <div className="mt-2">
              <p className="text-sm text-gray-600">Selected files:</p>
              <ul className="text-sm text-gray-800">
                {attachments.map((file, index) => (
                  <li key={index}>{file.name}</li>
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
            ? `${mode === 'create' ? 'Creating' : 'Updating'}...` 
            : `${mode === 'create' ? 'Create' : 'Update'} Question`
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