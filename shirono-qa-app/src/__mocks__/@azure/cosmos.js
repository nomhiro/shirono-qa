// Azure Cosmos DB モック

const mockResources = []

const mockContainer = {
  items: {
    create: jest.fn().mockImplementation((item) => {
      const newItem = { ...item }
      mockResources.push(newItem)
      return Promise.resolve({ resource: newItem })
    }),
    query: jest.fn().mockImplementation((_query) => ({
      fetchAll: jest.fn().mockResolvedValue({
        resources: mockResources.filter(() => true) // 簡単なフィルタ
      }),
      fetchNext: jest.fn().mockResolvedValue({
        resources: mockResources.slice(0, 20),
        continuationToken: undefined
      })
    }))
  },
  item: jest.fn().mockImplementation((id, _partitionKey) => ({
    read: jest.fn().mockImplementation(() => {
      const item = mockResources.find(r => r.id === id)
      if (item) {
        return Promise.resolve({ resource: item })
      } else {
        const error = new Error('Not Found')
        error.code = 404
        throw error
      }
    }),
    replace: jest.fn().mockImplementation((newItem) => {
      const index = mockResources.findIndex(r => r.id === id)
      if (index >= 0) {
        mockResources[index] = newItem
        return Promise.resolve({ resource: newItem })
      } else {
        const error = new Error('Not Found')
        error.code = 404
        throw error
      }
    }),
    delete: jest.fn().mockImplementation(() => {
      const index = mockResources.findIndex(r => r.id === id)
      if (index >= 0) {
        mockResources.splice(index, 1)
        return Promise.resolve({})
      } else {
        const error = new Error('Not Found')
        error.code = 404
        throw error
      }
    })
  }))
}

const mockDatabase = {
  id: 'ShironoQA-Test',
  read: jest.fn().mockResolvedValue({}),
  containers: {
    createIfNotExists: jest.fn().mockResolvedValue({
      container: mockContainer
    })
  }
}

const mockClient = {
  database: jest.fn().mockReturnValue(mockDatabase),
  databases: {
    createIfNotExists: jest.fn().mockResolvedValue({
      database: mockDatabase
    })
  },
  dispose: jest.fn()
}

export const CosmosClient = jest.fn().mockImplementation(() => mockClient)

// テスト用ヘルパー
export const clearMockData = () => {
  mockResources.length = 0
}

export const getMockData = () => mockResources

export const addMockData = (data) => {
  mockResources.push(...data)
}