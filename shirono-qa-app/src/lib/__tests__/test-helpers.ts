// テスト用のInMemoryデータストア

export class InMemoryDataStore {
  private data: Map<string, Map<string, any>> = new Map()
  
  clear() {
    this.data.clear()
  }
  
  getContainer(containerId: string) {
    if (!this.data.has(containerId)) {
      this.data.set(containerId, new Map())
    }
    return this.data.get(containerId)!
  }
  
  async createItem<T>(containerId: string, item: T & { id: string }): Promise<T> {
    const container = this.getContainer(containerId)
    container.set(item.id, item)
    return item
  }
  
  async getItem<T>(containerId: string, id: string): Promise<T | null> {
    const container = this.getContainer(containerId)
    return container.get(id) || null
  }
  
  async queryItems<T>(containerId: string, query: string, parameters: any[] = []): Promise<T[]> {
    const container = this.getContainer(containerId)
    let filteredItems = Array.from(container.values())
    
    // パラメータを連想配列に変換
    const paramMap: { [key: string]: any } = {}
    parameters.forEach(param => {
      paramMap[param.name] = param.value
    })
    
    // 各フィルタ条件をチェック
    
    // username の完全一致検索
    if (query.includes('c.username = @username') && paramMap['@username']) {
      filteredItems = filteredItems.filter(item => item.username === paramMap['@username'])
    }
    
    // email の完全一致検索
    if (query.includes('c.email = @email') && paramMap['@email']) {
      filteredItems = filteredItems.filter(item => item.email === paramMap['@email'])
    }
    
    // groupId によるフィルタリング
    if (query.includes('c.groupId = @groupId') && paramMap['@groupId']) {
      filteredItems = filteredItems.filter(item => item.groupId === paramMap['@groupId'])
    }
    
    // isAdmin によるフィルタリング
    if (query.includes('c.isAdmin = @isAdmin') && paramMap['@isAdmin'] !== undefined) {
      filteredItems = filteredItems.filter(item => item.isAdmin === paramMap['@isAdmin'])
    }
    
    // username の部分検索（CONTAINS）
    if (query.includes('CONTAINS(UPPER(c.username), UPPER(@search))') && paramMap['@search']) {
      const searchTerm = paramMap['@search'].toUpperCase()
      filteredItems = filteredItems.filter(item => 
        item.username && item.username.toUpperCase().includes(searchTerm)
      )
    }
    
    // セッショントークンの検索
    if (query.includes('c.sessionToken = @sessionToken') && paramMap['@sessionToken']) {
      filteredItems = filteredItems.filter(item => item.sessionToken === paramMap['@sessionToken'])
    }
    
    // 除外条件（AND c.id != @userId など）
    if (query.includes('c.id != @userId') && paramMap['@userId']) {
      filteredItems = filteredItems.filter(item => item.id !== paramMap['@userId'])
    }
    
    if (query.includes('c.username = @username AND c.id != @userId') && paramMap['@username'] && paramMap['@userId']) {
      filteredItems = filteredItems.filter(item => 
        item.username === paramMap['@username'] && item.id !== paramMap['@userId']
      )
    }
    
    if (query.includes('c.email = @email AND c.id != @userId') && paramMap['@email'] && paramMap['@userId']) {
      filteredItems = filteredItems.filter(item => 
        item.email === paramMap['@email'] && item.id !== paramMap['@userId']
      )
    }
    
    // ソート処理（ORDER BY）
    if (query.includes('ORDER BY c.createdAt DESC')) {
      filteredItems.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime()
        const dateB = new Date(b.createdAt).getTime()
        return dateB - dateA // DESC
      })
    } else if (query.includes('ORDER BY c.createdAt ASC')) {
      filteredItems.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime()
        const dateB = new Date(b.createdAt).getTime()
        return dateA - dateB // ASC
      })
    }
    
    return filteredItems
  }
  
  async updateItem<T>(containerId: string, id: string, item: T): Promise<T> {
    const container = this.getContainer(containerId)
    container.set(id, item)
    return item
  }
  
  async deleteItem(containerId: string, id: string): Promise<void> {
    const container = this.getContainer(containerId)
    container.delete(id)
  }

  async queryItemsWithPagination<T>(
    containerId: string, 
    query: string, 
    parameters: any[] = [], 
    page: number = 1, 
    limit: number = 10
  ): Promise<{ items: T[], totalCount: number }> {
    const container = this.getContainer(containerId)
    const allItems = Array.from(container.values()) as T[]
    
    // 簡単なページネーション
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const items = allItems.slice(startIndex, endIndex)
    
    return {
      items,
      totalCount: allItems.length
    }
  }
}

// グローバルなテスト用データストア
export const testDataStore = new InMemoryDataStore()

// CosmosService のモック実装
export const mockCosmosService = {
  createItem: testDataStore.createItem.bind(testDataStore),
  getItem: testDataStore.getItem.bind(testDataStore),
  queryItems: testDataStore.queryItems.bind(testDataStore),
  queryItemsWithPagination: testDataStore.queryItemsWithPagination.bind(testDataStore),
  updateItem: testDataStore.updateItem.bind(testDataStore),
  deleteItem: testDataStore.deleteItem.bind(testDataStore),
  initializeDatabase: jest.fn().mockResolvedValue(undefined),
  testConnection: jest.fn().mockResolvedValue(true),
  dispose: jest.fn()
}