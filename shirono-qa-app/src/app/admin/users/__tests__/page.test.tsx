import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import AdminUsersPage from '../page'
import { User } from '@/types/auth'

// MaterialUI のモック
jest.mock('@mui/material', () => ({
  Box: ({ children, ...props }: any) => <div data-testid="box" {...props}>{children}</div>,
  Typography: ({ children, ...props }: any) => <div data-testid="typography" {...props}>{children}</div>,
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
  Card: ({ children, ...props }: any) => <div data-testid="card" {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div data-testid="card-content" {...props}>{children}</div>,
  Table: ({ children, ...props }: any) => <table data-testid="table" {...props}>{children}</table>,
  TableHead: ({ children, ...props }: any) => <thead data-testid="table-head" {...props}>{children}</thead>,
  TableBody: ({ children, ...props }: any) => <tbody data-testid="table-body" {...props}>{children}</tbody>,
  TableRow: ({ children, ...props }: any) => <tr data-testid="table-row" {...props}>{children}</tr>,
  TableCell: ({ children, ...props }: any) => <td data-testid="table-cell" {...props}>{children}</td>,
  TextField: ({ value, onChange, placeholder, label, ...props }: any) => (
    <input 
      value={value} 
      onChange={onChange} 
      placeholder={placeholder || label}
      aria-label={label}
      {...props} 
    />
  ),
  FormControl: ({ children, ...props }: any) => <div data-testid="form-control" {...props}>{children}</div>,
  InputLabel: ({ children, ...props }: any) => <label {...props}>{children}</label>,
  Select: ({ value, onChange, children, ...props }: any) => (
    <select value={value} onChange={onChange} {...props}>{children}</select>
  ),
  MenuItem: ({ value, children, ...props }: any) => <option value={value} {...props}>{children}</option>,
  Dialog: ({ open, children, ...props }: any) => open ? <div data-testid="dialog" {...props}>{children}</div> : null,
  DialogTitle: ({ children, ...props }: any) => <div data-testid="dialog-title" {...props}>{children}</div>,
  DialogContent: ({ children, ...props }: any) => <div data-testid="dialog-content" {...props}>{children}</div>,
  DialogActions: ({ children, ...props }: any) => <div data-testid="dialog-actions" {...props}>{children}</div>,
  Alert: ({ children, severity, ...props }: any) => (
    <div data-testid="alert" data-severity={severity} {...props}>{children}</div>
  ),
  CircularProgress: () => <div data-testid="progress">Loading...</div>,
  Chip: ({ label, ...props }: any) => <span data-testid="chip" {...props}>{label}</span>,
  IconButton: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
  Tooltip: ({ title, children }: any) => <div title={title}>{children}</div>,
}))

jest.mock('@mui/icons-material', () => ({
  Add: () => <span>Add Icon</span>,
  Edit: () => <span>Edit Icon</span>,
  Delete: () => <span>Delete Icon</span>,
  Person: () => <span>Person Icon</span>,
  AdminPanelSettings: () => <span>Admin Icon</span>,
}))

// Next.js navigation のモック
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// API calls のモック
jest.mock('@/lib/auth', () => ({
  validateSession: jest.fn(),
}))

// Admin API のモック
const mockGetUsers = jest.fn()
const mockCreateUser = jest.fn()
const mockUpdateUser = jest.fn()
const mockDeleteUser = jest.fn()
const mockGetGroups = jest.fn()

jest.mock('@/lib/admin', () => ({
  getUsers: () => mockGetUsers(),
  createUser: (userData: any) => mockCreateUser(userData),
  updateUser: (id: string, userData: any) => mockUpdateUser(id, userData),
  deleteUser: (id: string) => mockDeleteUser(id),
  getGroups: () => mockGetGroups(),
}))

import { validateSession } from '@/lib/auth'

const mockValidateSession = validateSession as jest.MockedFunction<typeof validateSession>
const mockRouter = { push: jest.fn() }
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>

const mockUsers: User[] = [
  {
    id: 'user-1',
    username: 'alice',
    email: 'alice@example.com',
    passwordHash: 'hashedpassword',
    groupId: 'group-ts-ai',
    isAdmin: false,
    createdAt: new Date('2024-01-01'),
    lastLoginAt: new Date('2024-01-15'),
  },
  {
    id: 'user-2',
    username: 'bob',
    email: 'bob@example.com',
    passwordHash: 'hashedpassword',
    groupId: 'group-ts-ai',
    isAdmin: false,
    createdAt: new Date('2024-01-02'),
    lastLoginAt: new Date('2024-01-14'),
  },
  {
    id: 'admin-1',
    username: 'admin',
    email: 'admin@example.com',
    passwordHash: 'hashedpassword',
    groupId: 'group-admin',
    isAdmin: true,
    createdAt: new Date('2024-01-01'),
    lastLoginAt: new Date('2024-01-16'),
  }
]

const mockGroups = [
  {
    id: 'group-ts-ai',
    name: 'TS-AI',
    description: 'Technical Support - AI Group',
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'group-admin',
    name: 'Administrators',
    description: 'System Administrators',
    createdAt: new Date('2024-01-01'),
  }
]

describe('AdminUsersPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRouter.mockReturnValue(mockRouter as any)
    
    // デフォルトのモック設定
    mockValidateSession.mockResolvedValue({
      valid: true,
      user: {
        id: 'admin-1',
        username: 'admin',
        email: 'admin@example.com',
        groupId: 'group-admin',
        isAdmin: true,
      } as User
    })
    
    mockGetUsers.mockResolvedValue({
      success: true,
      users: mockUsers
    })
    
    mockGetGroups.mockResolvedValue({
      success: true,
      groups: mockGroups
    })
  })

  describe('アクセス制御', () => {
    it('should redirect non-admin users', async () => {
      mockValidateSession.mockResolvedValue({
        valid: true,
        user: {
          id: 'user-1',
          username: 'alice',
          email: 'alice@example.com',
          groupId: 'group-ts-ai',
          isAdmin: false,
        } as User
      })

      render(<AdminUsersPage />)

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/questions')
      })
    })

    it('should redirect unauthenticated users', async () => {
      mockValidateSession.mockResolvedValue({ valid: false })

      render(<AdminUsersPage />)

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/')
      })
    })
  })

  describe('ユーザー一覧表示', () => {
    it('should display user list', async () => {
      render(<AdminUsersPage />)

      await waitFor(() => {
        expect(screen.getByText('User Management')).toBeInTheDocument()
      })

      expect(screen.getByText('alice')).toBeInTheDocument()
      expect(screen.getByText('bob')).toBeInTheDocument()
      expect(screen.getByText('admin')).toBeInTheDocument()
      expect(screen.getByText('alice@example.com')).toBeInTheDocument()
      expect(screen.getByText('TS-AI')).toBeInTheDocument()
    })

    it('should show admin badges for admin users', async () => {
      render(<AdminUsersPage />)

      await waitFor(() => {
        expect(screen.getByText('User Management')).toBeInTheDocument()
      })

      // admin ユーザーにAdmin badgeが表示される
      const adminChips = screen.getAllByText('Admin')
      expect(adminChips.length).toBe(1)
    })

    it('should display loading state', () => {
      mockGetUsers.mockImplementation(() => new Promise(() => {}))

      render(<AdminUsersPage />)

      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })

    it('should handle API error', async () => {
      mockGetUsers.mockResolvedValue({
        success: false,
        error: 'Failed to load users'
      })

      render(<AdminUsersPage />)

      await waitFor(() => {
        expect(screen.getByText('Failed to load users')).toBeInTheDocument()
      })
    })
  })

  describe('ユーザー作成', () => {
    it('should open create user dialog', async () => {
      render(<AdminUsersPage />)

      await waitFor(() => {
        expect(screen.getByText('User Management')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText(/add user/i))

      expect(screen.getByText('Create New User')).toBeInTheDocument()
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    })

    it('should create new user successfully', async () => {
      const newUser = {
        id: 'user-3',
        username: 'charlie',
        email: 'charlie@example.com',
        passwordHash: 'hashedpassword',
        groupId: 'group-ts-ai',
        isAdmin: false,
        createdAt: new Date(),
        lastLoginAt: new Date(),
      }

      mockCreateUser.mockResolvedValue({
        success: true,
        user: newUser
      })

      render(<AdminUsersPage />)

      await waitFor(() => {
        fireEvent.click(screen.getByText(/add user/i))
      })

      // フォーム入力
      fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'charlie' } })
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'charlie@example.com' } })
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'Password123!' } })

      fireEvent.click(screen.getByText(/create/i))

      await waitFor(() => {
        expect(mockCreateUser).toHaveBeenCalledWith({
          username: 'charlie',
          email: 'charlie@example.com',
          password: 'Password123!',
          groupId: 'group-ts-ai',
          isAdmin: false
        })
      })
    })

    it('should validate form fields', async () => {
      render(<AdminUsersPage />)

      await waitFor(() => {
        fireEvent.click(screen.getByText(/add user/i))
      })

      // 空のフォームで送信
      fireEvent.click(screen.getByText(/create/i))

      await waitFor(() => {
        expect(screen.getByText(/username is required/i)).toBeInTheDocument()
      })
    })
  })

  describe('ユーザー編集', () => {
    it('should open edit user dialog', async () => {
      render(<AdminUsersPage />)

      await waitFor(() => {
        expect(screen.getByText('User Management')).toBeInTheDocument()
      })

      // 最初のユーザーの編集ボタンをクリック
      const editButtons = screen.getAllByText('Edit Icon')
      fireEvent.click(editButtons[0])

      expect(screen.getByText('Edit User')).toBeInTheDocument()
      expect(screen.getByDisplayValue('alice')).toBeInTheDocument()
      expect(screen.getByDisplayValue('alice@example.com')).toBeInTheDocument()
    })

    it('should update user successfully', async () => {
      mockUpdateUser.mockResolvedValue({
        success: true,
        user: { ...mockUsers[0], username: 'alice_updated' }
      })

      render(<AdminUsersPage />)

      await waitFor(() => {
        const editButtons = screen.getAllByText('Edit Icon')
        fireEvent.click(editButtons[0])
      })

      fireEvent.change(screen.getByDisplayValue('alice'), { target: { value: 'alice_updated' } })
      fireEvent.click(screen.getByText(/save/i))

      await waitFor(() => {
        expect(mockUpdateUser).toHaveBeenCalledWith('user-1', {
          username: 'alice_updated',
          email: 'alice@example.com',
          groupId: 'group-ts-ai',
          isAdmin: false
        })
      })
    })
  })

  describe('ユーザー削除', () => {
    it('should delete user with confirmation', async () => {
      // window.confirm をモック
      const mockConfirm = jest.spyOn(window, 'confirm').mockReturnValue(true)
      
      mockDeleteUser.mockResolvedValue({
        success: true,
        message: 'User deleted successfully'
      })

      render(<AdminUsersPage />)

      await waitFor(() => {
        const deleteButtons = screen.getAllByText('Delete Icon')
        fireEvent.click(deleteButtons[0])
      })

      await waitFor(() => {
        expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to delete user "alice"?')
        expect(mockDeleteUser).toHaveBeenCalledWith('user-1')
      })

      mockConfirm.mockRestore()
    })

    it('should cancel deletion if not confirmed', async () => {
      const mockConfirm = jest.spyOn(window, 'confirm').mockReturnValue(false)

      render(<AdminUsersPage />)

      await waitFor(() => {
        const deleteButtons = screen.getAllByText('Delete Icon')
        fireEvent.click(deleteButtons[0])
      })

      expect(mockDeleteUser).not.toHaveBeenCalled()
      mockConfirm.mockRestore()
    })
  })

  describe('フィルタリング・検索', () => {
    it('should filter users by search term', async () => {
      render(<AdminUsersPage />)

      await waitFor(() => {
        expect(screen.getByText('User Management')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText(/search users/i)
      fireEvent.change(searchInput, { target: { value: 'alice' } })

      // alice のみ表示される
      expect(screen.getByText('alice')).toBeInTheDocument()
      expect(screen.queryByText('bob')).not.toBeInTheDocument()
    })

    it('should filter users by group', async () => {
      render(<AdminUsersPage />)

      await waitFor(() => {
        expect(screen.getByText('User Management')).toBeInTheDocument()
      })

      const groupSelect = screen.getByLabelText(/filter by group/i)
      fireEvent.change(groupSelect, { target: { value: 'group-admin' } })

      // admin ユーザーのみ表示される
      expect(screen.getByText('admin')).toBeInTheDocument()
      expect(screen.queryByText('alice')).not.toBeInTheDocument()
      expect(screen.queryByText('bob')).not.toBeInTheDocument()
    })

    it('should filter users by role', async () => {
      render(<AdminUsersPage />)

      await waitFor(() => {
        expect(screen.getByText('User Management')).toBeInTheDocument()
      })

      const roleSelect = screen.getByLabelText(/filter by role/i)
      fireEvent.change(roleSelect, { target: { value: 'admin' } })

      // admin ユーザーのみ表示される
      expect(screen.getByText('admin')).toBeInTheDocument()
      expect(screen.queryByText('alice')).not.toBeInTheDocument()
      expect(screen.queryByText('bob')).not.toBeInTheDocument()
    })
  })
})