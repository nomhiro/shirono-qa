import { CosmosClient, Database, Container } from '@azure/cosmos'

interface CosmosConfig {
  connectionString: string
  databaseName: string
}

class CosmosService {
  private client: CosmosClient
  private database: Database
  private containers: Map<string, Container> = new Map()

  constructor(config: CosmosConfig) {
    this.client = new CosmosClient(config.connectionString)
    this.database = this.client.database(config.databaseName)
  }

  /**
   * コンテナを取得または作成
   */
  async getContainer(containerId: string, partitionKey?: string): Promise<Container> {
    if (this.containers.has(containerId)) {
      return this.containers.get(containerId)!
    }

    try {
      // コンテナの存在確認
      const { container } = await this.database.containers.createIfNotExists({
        id: containerId,
        partitionKey: partitionKey || '/id'
      })

      this.containers.set(containerId, container)
      return container
    } catch (error) {
      console.error(`Failed to create/get container ${containerId}:`, error)
      throw error
    }
  }

  /**
   * データベース初期化
   */
  async initializeDatabase(): Promise<void> {
    try {
      // データベース作成
      await this.client.databases.createIfNotExists({
        id: this.database.id
      })

      // 必要なコンテナを作成
      const containers = [
        { id: 'users', partitionKey: '/id' },
        { id: 'groups', partitionKey: '/id' },
        { id: 'questions', partitionKey: '/groupId' },
        { id: 'answers', partitionKey: '/questionId' },
        { id: 'comments', partitionKey: '/questionId' },
        { id: 'sessions', partitionKey: '/userId' }
      ]

      for (const containerConfig of containers) {
        await this.getContainer(containerConfig.id, containerConfig.partitionKey)
      }

      console.log('Database initialized successfully')
    } catch (error) {
      console.error('Failed to initialize database:', error)
      throw error
    }
  }

  /**
   * アイテム作成
   */
  async createItem<T>(containerId: string, item: T): Promise<T> {
    try {
      const container = await this.getContainer(containerId)
      const { resource } = await container.items.create(item)
      return resource as T
    } catch (error) {
      console.error(`Failed to create item in ${containerId}:`, error)
      throw error
    }
  }

  /**
   * アイテム取得
   */
  async getItem<T>(containerId: string, id: string, partitionKey?: string): Promise<T | null> {
    try {
      const container = await this.getContainer(containerId)
      const { resource } = await container.item(id, partitionKey || id).read<T>()
      return resource || null
    } catch (error: any) {
      if (error.code === 404) {
        return null
      }
      console.error(`Failed to get item ${id} from ${containerId}:`, error)
      throw error
    }
  }

  /**
   * アイテム更新
   */
  async updateItem<T>(containerId: string, id: string, item: T, partitionKey?: string): Promise<T> {
    try {
      const container = await this.getContainer(containerId)
      const { resource } = await container.item(id, partitionKey || id).replace(item)
      return resource as T
    } catch (error) {
      console.error(`Failed to update item ${id} in ${containerId}:`, error)
      throw error
    }
  }

  /**
   * アイテム削除
   */
  async deleteItem(containerId: string, id: string, partitionKey?: string): Promise<void> {
    try {
      const container = await this.getContainer(containerId)
      await container.item(id, partitionKey || id).delete()
    } catch (error) {
      console.error(`Failed to delete item ${id} from ${containerId}:`, error)
      throw error
    }
  }

  /**
   * クエリ実行
   */
  async queryItems<T>(
    containerId: string, 
    query: string, 
    parameters: any[] = []
  ): Promise<T[]> {
    try {
      const container = await this.getContainer(containerId)
      const { resources } = await container.items.query<T>({
        query,
        parameters
      }).fetchAll()
      
      return resources
    } catch (error) {
      console.error(`Failed to query items in ${containerId}:`, error)
      throw error
    }
  }

  /**
   * ページネーションクエリ
   */
  async queryItemsWithPagination<T>(
    containerId: string,
    query: string,
    parameters: any[] = [],
    continuationToken?: string,
    maxItems = 20
  ): Promise<{ items: T[], continuationToken?: string }> {
    try {
      const container = await this.getContainer(containerId)
      const queryIterator = container.items.query<T>({
        query,
        parameters
      }, {
        maxItemCount: maxItems,
        continuationToken
      })

      const { resources, continuationToken: nextToken } = await queryIterator.fetchNext()
      
      return {
        items: resources,
        continuationToken: nextToken
      }
    } catch (error) {
      console.error(`Failed to query items with pagination in ${containerId}:`, error)
      throw error
    }
  }

  /**
   * ベクタークエリ（類似度検索）
   */
  async vectorQuery<T>(
    containerId: string,
    vectorField: string,
    queryVector: number[],
    limit = 10,
    similarityThreshold = 0.7
  ): Promise<T[]> {
    try {
      const container = await this.getContainer(containerId)
      
      // Cosmos DBのベクター検索クエリ
      const query = `
        SELECT TOP ${limit} c.*, 
               VectorDistance(c.${vectorField}, @queryVector) AS similarity
        FROM c 
        WHERE VectorDistance(c.${vectorField}, @queryVector) > @threshold
        ORDER BY VectorDistance(c.${vectorField}, @queryVector) DESC
      `
      
      const { resources } = await container.items.query<T>({
        query,
        parameters: [
          { name: '@queryVector', value: queryVector },
          { name: '@threshold', value: similarityThreshold }
        ]
      }).fetchAll()
      
      return resources
    } catch (error) {
      console.error(`Failed to execute vector query in ${containerId}:`, error)
      throw error
    }
  }

  /**
   * 接続テスト
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.database.read()
      return true
    } catch (error) {
      console.error('Connection test failed:', error)
      return false
    }
  }

  /**
   * リソースクリーンアップ
   */
  dispose(): void {
    if (this.client) {
      this.client.dispose()
    }
    this.containers.clear()
  }
}

// シングルトンインスタンス
let cosmosServiceInstance: CosmosService | null = null

/**
 * Cosmos DBサービスインスタンスを取得
 */
export function getCosmosService(): CosmosService {
  if (!cosmosServiceInstance) {
    const connectionString = process.env.COSMOS_DB_CONNECTION_STRING
    const databaseName = process.env.COSMOS_DB_DATABASE_NAME

    if (!connectionString || !databaseName) {
      throw new Error('Cosmos DB configuration is missing')
    }

    cosmosServiceInstance = new CosmosService({
      connectionString,
      databaseName
    })
  }

  return cosmosServiceInstance
}

/**
 * Cosmos DB設定の検証
 */
export const validateCosmosConfig = (): { valid: boolean; error?: string } => {
  const connectionString = process.env.COSMOS_DB_CONNECTION_STRING
  const databaseName = process.env.COSMOS_DB_DATABASE_NAME

  if (!connectionString) {
    return { valid: false, error: 'COSMOS_DB_CONNECTION_STRING is required' }
  }
  if (!databaseName) {
    return { valid: false, error: 'COSMOS_DB_DATABASE_NAME is required' }
  }
  return { valid: true }
}

export default CosmosService