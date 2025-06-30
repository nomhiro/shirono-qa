import { render, screen } from '@testing-library/react'
import Home from '../page'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  redirect: jest.fn(),
}))

describe('Home Page', () => {
  it('should redirect unauthenticated users to login', () => {
    render(<Home />)
    
    // 未認証ユーザーの場合、ログインフォームが表示される
    expect(screen.getByRole('button', { name: 'ログイン' })).toBeInTheDocument()
    expect(screen.getByLabelText('ユーザー名')).toBeInTheDocument()
    expect(screen.getByLabelText('パスワード')).toBeInTheDocument()
  })

  it('should show login form with proper validation', () => {
    render(<Home />)
    
    const usernameInput = screen.getByLabelText('ユーザー名')
    const passwordInput = screen.getByLabelText('パスワード')
    const loginButton = screen.getByRole('button', { name: 'ログイン' })
    
    expect(usernameInput).toBeRequired()
    expect(passwordInput).toBeRequired()
    expect(passwordInput).toHaveAttribute('type', 'password')
    expect(loginButton).toBeInTheDocument()
  })

  it('should have proper page title and heading', () => {
    render(<Home />)
    
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('QAサイト')
    // Note: document.title in Jest tests doesn't reflect Next.js metadata
    // This would need a different testing approach for metadata
  })
})