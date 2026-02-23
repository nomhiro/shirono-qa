import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginForm from '../LoginForm'

// Mock the auth module
jest.mock('../../lib/auth', () => ({
  login: jest.fn(),
}))

import { login } from '../../lib/auth'

const mockLogin = login as jest.MockedFunction<typeof login>

describe('LoginForm Component', () => {
  beforeEach(() => {
    mockLogin.mockClear()
  })

  it('should render login form with username and password fields', () => {
    render(<LoginForm onSuccess={() => {}} />)
    
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument()
  })

  it('should show validation errors for empty fields', async () => {
    const user = userEvent.setup()
    render(<LoginForm onSuccess={() => {}} />)
    
    const submitButton = screen.getByRole('button', { name: /log in/i })
    await user.click(submitButton)
    
    expect(screen.getByText(/username is required/i)).toBeInTheDocument()
    expect(screen.getByText(/password is required/i)).toBeInTheDocument()
  })

  it('should call login function with correct credentials', async () => {
    const user = userEvent.setup()
    const onSuccess = jest.fn()
    mockLogin.mockResolvedValue({
      success: true,
      user: { id: '1', username: 'testuser', email: 'test@example.com', groupId: 'group-1', isAdmin: false, createdAt: new Date(), lastLoginAt: null },
      sessionToken: 'token123'
    })
    
    render(<LoginForm onSuccess={onSuccess} />)
    
    await user.type(screen.getByLabelText(/username/i), 'testuser')
    await user.type(screen.getByLabelText(/password/i), 'TestPassword123!')
    await user.click(screen.getByRole('button', { name: /log in/i }))
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('testuser', 'TestPassword123!')
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  it('should show error message for failed login', async () => {
    const user = userEvent.setup()
    mockLogin.mockResolvedValue({
      success: false,
      error: 'Invalid username or password'
    })
    
    render(<LoginForm onSuccess={() => {}} />)
    
    await user.type(screen.getByLabelText(/username/i), 'wronguser')
    await user.type(screen.getByLabelText(/password/i), 'wrongpass')
    await user.click(screen.getByRole('button', { name: /log in/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/invalid username or password/i)).toBeInTheDocument()
    })
  })

  it('should disable submit button during login attempt', async () => {
    const user = userEvent.setup()
    mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({
      success: false,
      error: 'Some error'
    }), 100)))
    
    render(<LoginForm onSuccess={() => {}} />)
    
    await user.type(screen.getByLabelText(/username/i), 'testuser')
    await user.type(screen.getByLabelText(/password/i), 'TestPassword123!')
    await user.click(screen.getByRole('button', { name: /log in/i }))
    
    expect(screen.getByRole('button', { name: /logging in/i })).toBeDisabled()
  })
})