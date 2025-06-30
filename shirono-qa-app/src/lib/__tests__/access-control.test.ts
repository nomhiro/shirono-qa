import { 
  canAccessQuestion, 
  canEditQuestion, 
  canDeleteQuestion,
  canAccessGroup,
  checkGroupPermission 
} from '../access-control'
import { QuestionStatus, QuestionPriority } from '@/types/question'
import { User } from '@/types/auth'

const mockAdminUser: User = {
  id: 'admin-123',
  username: 'admin',
  email: 'admin@example.com',
  passwordHash: 'hashedpassword',
  groupId: 'group-admin',
  isAdmin: true,
  createdAt: new Date(),
  lastLoginAt: new Date()
}

const mockRegularUser: User = {
  id: 'user-123',
  username: 'testuser',
  email: 'test@example.com',
  passwordHash: 'hashedpassword',
  groupId: 'group-ts-ai',
  isAdmin: false,
  createdAt: new Date(),
  lastLoginAt: new Date()
}

const mockOtherGroupUser: User = {
  id: 'user-456',
  username: 'otheruser',
  email: 'other@example.com',
  passwordHash: 'hashedpassword',
  groupId: 'group-other',
  isAdmin: false,
  createdAt: new Date(),
  lastLoginAt: new Date()
}

const mockQuestion = {
  id: 'question-123',
  title: 'Test Question',
  content: 'Test content',
  authorId: 'user-123',
  groupId: 'group-ts-ai',
  status: QuestionStatus.UNANSWERED,
  priority: QuestionPriority.MEDIUM,
  tags: ['test'],
  attachments: [],
  createdAt: new Date(),
  updatedAt: new Date()
}

describe('Access Control System', () => {
  describe('canAccessQuestion', () => {
    it('should allow admin to access any question', () => {
      const result = canAccessQuestion(mockAdminUser, mockQuestion)
      expect(result).toBe(true)
    })

    it('should allow user to access question in same group', () => {
      const result = canAccessQuestion(mockRegularUser, mockQuestion)
      expect(result).toBe(true)
    })

    it('should deny user access to question in different group', () => {
      const result = canAccessQuestion(mockOtherGroupUser, mockQuestion)
      expect(result).toBe(false)
    })

    it('should allow question author to access own question regardless of group', () => {
      const questionInOtherGroup = { ...mockQuestion, groupId: 'group-other' }
      const result = canAccessQuestion(mockRegularUser, questionInOtherGroup)
      expect(result).toBe(true)
    })
  })

  describe('canEditQuestion', () => {
    it('should allow admin to edit any question', () => {
      const result = canEditQuestion(mockAdminUser, mockQuestion)
      expect(result).toBe(true)
    })

    it('should allow question author to edit own question', () => {
      const result = canEditQuestion(mockRegularUser, mockQuestion)
      expect(result).toBe(true)
    })

    it('should deny non-author non-admin user to edit question', () => {
      const questionByOtherUser = { ...mockQuestion, authorId: 'different-user' }
      const result = canEditQuestion(mockRegularUser, questionByOtherUser)
      expect(result).toBe(false)
    })

    it('should deny user from different group to edit question', () => {
      const result = canEditQuestion(mockOtherGroupUser, mockQuestion)
      expect(result).toBe(false)
    })
  })

  describe('canDeleteQuestion', () => {
    it('should allow admin to delete any question', () => {
      const result = canDeleteQuestion(mockAdminUser, mockQuestion)
      expect(result).toBe(true)
    })

    it('should allow question author to delete own question', () => {
      const result = canDeleteQuestion(mockRegularUser, mockQuestion)
      expect(result).toBe(true)
    })

    it('should deny non-author non-admin user to delete question', () => {
      const questionByOtherUser = { ...mockQuestion, authorId: 'different-user' }
      const result = canDeleteQuestion(mockRegularUser, questionByOtherUser)
      expect(result).toBe(false)
    })

    it('should deny user from different group to delete question', () => {
      const result = canDeleteQuestion(mockOtherGroupUser, mockQuestion)
      expect(result).toBe(false)
    })
  })

  describe('canAccessGroup', () => {
    it('should allow admin to access any group', () => {
      const result = canAccessGroup(mockAdminUser, 'any-group-id')
      expect(result).toBe(true)
    })

    it('should allow user to access own group', () => {
      const result = canAccessGroup(mockRegularUser, 'group-ts-ai')
      expect(result).toBe(true)
    })

    it('should deny user access to different group', () => {
      const result = canAccessGroup(mockRegularUser, 'group-other')
      expect(result).toBe(false)
    })
  })

  describe('checkGroupPermission', () => {
    it('should return permission details for admin', () => {
      const result = checkGroupPermission(mockAdminUser, 'any-group')
      
      expect(result.canAccess).toBe(true)
      expect(result.canManage).toBe(true)
      expect(result.role).toBe('admin')
    })

    it('should return permission details for group member', () => {
      const result = checkGroupPermission(mockRegularUser, 'group-ts-ai')
      
      expect(result.canAccess).toBe(true)
      expect(result.canManage).toBe(false)
      expect(result.role).toBe('member')
    })

    it('should return permission details for non-group member', () => {
      const result = checkGroupPermission(mockRegularUser, 'group-other')
      
      expect(result.canAccess).toBe(false)
      expect(result.canManage).toBe(false)
      expect(result.role).toBe('none')
    })
  })

  describe('edge cases', () => {
    it('should handle undefined user gracefully', () => {
      const result = canAccessQuestion(undefined as any, mockQuestion)
      expect(result).toBe(false)
    })

    it('should handle undefined question gracefully', () => {
      const result = canAccessQuestion(mockRegularUser, undefined as any)
      expect(result).toBe(false)
    })

    it('should handle missing groupId in question', () => {
      const questionWithoutGroup = { ...mockQuestion, groupId: undefined as any }
      const result = canAccessQuestion(mockRegularUser, questionWithoutGroup)
      expect(result).toBe(false)
    })

    it('should handle missing groupId in user', () => {
      const userWithoutGroup = { ...mockRegularUser, groupId: undefined as any }
      const result = canAccessQuestion(userWithoutGroup, mockQuestion)
      expect(result).toBe(false)
    })
  })
})