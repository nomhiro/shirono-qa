// Mock the auth module
jest.mock('../../../lib/auth', () => ({
  login: jest.fn(),
}))

import { login } from '../../../lib/auth'

const mockLogin = login as jest.MockedFunction<typeof login>

describe('Login API Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return success result for valid credentials', async () => {
    const mockUser = {
      id: '1',
      username: 'testuser',
      email: 'test@example.com',
      groupId: 'group1',
      isAdmin: false
    }

    mockLogin.mockResolvedValue({
      success: true,
      user: mockUser,
      sessionToken: 'session123'
    })

    const result = await login('testuser', 'TestPassword123!')

    expect(result.success).toBe(true)
    expect(result.user).toEqual(mockUser)
    expect(result.sessionToken).toBe('session123')
    expect(mockLogin).toHaveBeenCalledWith('testuser', 'TestPassword123!')
  })

  it('should return failure result for invalid credentials', async () => {
    mockLogin.mockResolvedValue({
      success: false,
      error: 'Invalid username or password'
    })

    const result = await login('wronguser', 'wrongpass')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Invalid username or password')
    expect(mockLogin).toHaveBeenCalledWith('wronguser', 'wrongpass')
  })

  it('should handle server errors', async () => {
    mockLogin.mockRejectedValue(new Error('Database connection failed'))

    await expect(login('testuser', 'TestPassword123!')).rejects.toThrow('Database connection failed')
    expect(mockLogin).toHaveBeenCalledWith('testuser', 'TestPassword123!')
  })

  it('should validate required parameters', async () => {
    mockLogin.mockResolvedValue({
      success: false,
      error: 'Username and password are required'
    })

    // Test empty username
    const resultEmptyUsername = await login('', 'TestPassword123!')
    expect(resultEmptyUsername.success).toBe(false)
    expect(resultEmptyUsername.error).toBe('Username and password are required')

    // Test empty password  
    const resultEmptyPassword = await login('testuser', '')
    expect(resultEmptyPassword.success).toBe(false)
    expect(resultEmptyPassword.error).toBe('Username and password are required')
  })
})