/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GroupManagementPage from '../page'

// 認証とAPIのモック
jest.mock('@/lib/auth', () => ({
  validateSession: jest.fn(),
}))

jest.mock('@/lib/groups', () => ({
  getGroups: jest.fn(),
  createGroup: jest.fn(),
}))

import { validateSession } from '@/lib/auth'
import { getGroups, createGroup } from '@/lib/groups'

const mockValidateSession = validateSession as jest.MockedFunction<typeof validateSession>
const mockGetGroups = getGroups as jest.MockedFunction<typeof getGroups>
const mockCreateGroup = createGroup as jest.MockedFunction<typeof createGroup>

const mockAdminUser = {
  id: 'admin-123',
  username: 'admin',
  email: 'admin@example.com',
  groupId: 'group-admin',
  isAdmin: true,
  createdAt: new Date(),
  lastLoginAt: null,
}

const mockGroups = [
  {
    id: 'group-1',
    name: 'TS-AI',
    description: 'Technical Support AI',
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'group-2',
    name: 'DevOps',
    description: 'Development Operations Team',
    createdAt: new Date('2024-01-02'),
  },
]

describe('GroupManagementPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // 認証成功をモック
    mockValidateSession.mockResolvedValue({
      valid: true,
      user: mockAdminUser
    })
    
    // グループ取得成功をモック
    mockGetGroups.mockResolvedValue({
      success: true,
      groups: mockGroups
    })
    
    // document.cookieをモック
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: 'session=admin-session-token'
    })
  })

  it('管理者ユーザーに対してグループ管理ページを表示する', async () => {
    render(<GroupManagementPage />)
    
    // 最初にローディング状態を確認
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    
    // ページの読み込み完了を待つ
    await waitFor(() => {
      expect(screen.getByText('Group Management')).toBeInTheDocument()
    })
    
    // グループリストを確認
    expect(screen.getByText('TS-AI')).toBeInTheDocument()
    expect(screen.getByText('DevOps')).toBeInTheDocument()
    expect(screen.getByText('Technical Support AI')).toBeInTheDocument()
    expect(screen.getByText('Development Operations Team')).toBeInTheDocument()
  })

  it('Add Groupボタンがクリックされた時にグループ追加フォームを表示する', async () => {
    const user = userEvent.setup()
    render(<GroupManagementPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Group Management')).toBeInTheDocument()
    })
    
    const addButton = screen.getByRole('button', { name: /add group/i })
    await user.click(addButton)
    
    // フォーム要素を確認
    expect(screen.getByLabelText(/group name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create group/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('フォームが送信された時に新しいグループを作成する', async () => {
    const user = userEvent.setup()
    const newGroup = {
      id: 'group-3',
      name: 'Security',
      description: 'Security and Compliance Team',
      createdAt: new Date(),
    }
    
    mockCreateGroup.mockResolvedValue({
      success: true,
      group: newGroup
    })
    
    render(<GroupManagementPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Group Management')).toBeInTheDocument()
    })
    
    // フォームを開く
    const addButton = screen.getByRole('button', { name: /add group/i })
    await user.click(addButton)
    
    // フォームに入力
    const nameInput = screen.getByLabelText(/group name/i)
    const descriptionInput = screen.getByLabelText(/description/i)
    
    await user.type(nameInput, 'Security')
    await user.type(descriptionInput, 'Security and Compliance Team')
    
    // フォームを送信
    const createButton = screen.getByRole('button', { name: /create group/i })
    await user.click(createButton)
    
    // API呼び出しを確認
    await waitFor(() => {
      expect(mockCreateGroup).toHaveBeenCalledWith({
        name: 'Security',
        description: 'Security and Compliance Team'
      })
    })
  })

  it('必須フィールドのバリデーションを行う', async () => {
    const user = userEvent.setup()
    render(<GroupManagementPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Group Management')).toBeInTheDocument()
    })
    
    // フォームを開く
    const addButton = screen.getByRole('button', { name: /add group/i })
    await user.click(addButton)
    
    // フォームを空のまま送信
    const createButton = screen.getByRole('button', { name: /create group/i })
    await user.click(createButton)
    
    // バリデーションメッセージを確認
    expect(screen.getByText(/group name is required/i)).toBeInTheDocument()
    expect(screen.getByText(/description is required/i)).toBeInTheDocument()
  })

  it('フォームのキャンセルを処理する', async () => {
    const user = userEvent.setup()
    render(<GroupManagementPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Group Management')).toBeInTheDocument()
    })
    
    // フォームを開く
    const addButton = screen.getByRole('button', { name: /add group/i })
    await user.click(addButton)
    
    // フォームが表示されることを確認
    expect(screen.getByLabelText(/group name/i)).toBeInTheDocument()
    
    // フォームをキャンセル
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)
    
    // フォームが非表示になることを確認
    await waitFor(() => {
      expect(screen.queryByLabelText(/group name/i)).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/description/i)).not.toBeInTheDocument()
    })
  })

  it('グループ作成が失敗した時にエラーメッセージを表示する', async () => {
    const user = userEvent.setup()
    
    mockCreateGroup.mockResolvedValue({
      success: false,
      error: 'Group name already exists'
    })
    
    render(<GroupManagementPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Group Management')).toBeInTheDocument()
    })
    
    // フォームを開いて入力
    const addButton = screen.getByRole('button', { name: /add group/i })
    await user.click(addButton)
    
    const nameInput = screen.getByLabelText(/group name/i)
    const descriptionInput = screen.getByLabelText(/description/i)
    
    await user.type(nameInput, 'Existing Group')
    await user.type(descriptionInput, 'Description')
    
    // フォームを送信
    const createButton = screen.getByRole('button', { name: /create group/i })
    await user.click(createButton)
    
    // エラーメッセージを確認
    await waitFor(() => {
      expect(screen.getByText('Group name already exists')).toBeInTheDocument()
    })
  })

  it('非管理者ユーザーをリダイレクトする', async () => {
    mockValidateSession.mockResolvedValue({
      valid: true,
      user: { ...mockAdminUser, isAdmin: false }
    })
    
    render(<GroupManagementPage />)
    
    // 非管理者の場合はページがレンダリングされないことを確認
    await waitFor(() => {
      expect(screen.queryByText('Group Management')).not.toBeInTheDocument()
    })
  })

  it('未認証ユーザーをリダイレクトする', async () => {
    mockValidateSession.mockResolvedValue({ valid: false })
    
    render(<GroupManagementPage />)
    
    // 未認証の場合はページがレンダリングされないことを確認
    await waitFor(() => {
      expect(screen.queryByText('Group Management')).not.toBeInTheDocument()
    })
  })

  it('作成成功後にグループリストを更新する', async () => {
    const user = userEvent.setup()
    const newGroup = {
      id: 'group-3',
      name: 'Security',
      description: 'Security and Compliance Team',
      createdAt: new Date(),
    }
    
    mockCreateGroup.mockResolvedValue({
      success: true,
      group: newGroup
    })
    
    render(<GroupManagementPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Group Management')).toBeInTheDocument()
    })
    
    // フォームを開いてグループを作成
    const addButton = screen.getByRole('button', { name: /add group/i })
    await user.click(addButton)
    
    const nameInput = screen.getByLabelText(/group name/i)
    const descriptionInput = screen.getByLabelText(/description/i)
    
    await user.type(nameInput, 'Security')
    await user.type(descriptionInput, 'Security and Compliance Team')
    
    const createButton = screen.getByRole('button', { name: /create group/i })
    await user.click(createButton)
    
    // getGroupsが再度呼ばれることを確認（リスト更新のため）
    await waitFor(() => {
      expect(mockGetGroups).toHaveBeenCalledTimes(2) // 初期読み込み + 更新
    })
  })

  it('グループを作成日順で表示する', async () => {
    render(<GroupManagementPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Group Management')).toBeInTheDocument()
    })
    
    // すべてのグループカードを取得
    const groupCards = screen.getAllByTestId(/group-card-/i)
    
    // 順序を確認（TS-AIが最初、次にDevOps）
    expect(groupCards[0]).toHaveTextContent('TS-AI')
    expect(groupCards[1]).toHaveTextContent('DevOps')
  })
})