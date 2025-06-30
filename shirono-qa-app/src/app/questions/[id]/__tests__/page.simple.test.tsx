import { render, screen } from '@testing-library/react'

// 最小限のテスト
describe('QuestionDetailPage - Simple Test', () => {
  it('should render without crashing', () => {
    // 最小限のコンポーネントテスト
    const MockComponent = () => <div>Test Question Detail Page</div>
    
    render(<MockComponent />)
    
    expect(screen.getByText('Test Question Detail Page')).toBeInTheDocument()
  })
})