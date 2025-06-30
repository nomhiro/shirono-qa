import { BlobServiceClient, ContainerClient, BlobClient } from '@azure/storage-blob'
import { Readable } from 'stream'

interface BlobConfig {
  connectionString: string
  containerName: string
}

interface UploadResult {
  fileName: string
  blobUrl: string
  fileSize: number
  contentType: string
}

interface FileMetadata {
  originalName: string
  uploadedBy: string
  uploadedAt: string
  questionId?: string
  answerId?: string
  commentId?: string
}

class BlobStorageService {
  private blobServiceClient: BlobServiceClient
  private containerClient: ContainerClient
  private containerName: string

  constructor(config: BlobConfig) {
    this.blobServiceClient = BlobServiceClient.fromConnectionString(config.connectionString)
    this.containerName = config.containerName
    this.containerClient = this.blobServiceClient.getContainerClient(config.containerName)
  }

  /**
   * コンテナ初期化
   */
  async initializeContainer(): Promise<void> {
    try {
      // コンテナが存在しない場合は作成
      await this.containerClient.createIfNotExists({
        access: 'blob' // パブリックアクセス（読み取り専用）
      })

      console.log(`Blob container '${this.containerName}' initialized successfully`)
    } catch (error) {
      console.error('Failed to initialize blob container:', error)
      throw error
    }
  }

  /**
   * ファイルアップロード（Buffer形式）
   */
  async uploadFile(
    fileName: string,
    fileBuffer: Buffer,
    contentType: string,
    metadata: FileMetadata
  ): Promise<UploadResult> {
    try {
      // ユニークなファイル名を生成
      const uniqueFileName = this.generateUniqueFileName(fileName)
      const blobClient = this.containerClient.getBlobClient(uniqueFileName)
      const blockBlobClient = blobClient.getBlockBlobClient()

      // メタデータを設定
      const blobMetadata = {
        originalName: metadata.originalName,
        uploadedBy: metadata.uploadedBy,
        uploadedAt: metadata.uploadedAt,
        questionId: metadata.questionId || '',
        answerId: metadata.answerId || '',
        commentId: metadata.commentId || ''
      }

      // ファイルをアップロード
      await blockBlobClient.upload(fileBuffer, fileBuffer.length, {
        blobHTTPHeaders: {
          blobContentType: contentType
        },
        metadata: blobMetadata
      })

      return {
        fileName: uniqueFileName,
        blobUrl: blobClient.url,
        fileSize: fileBuffer.length,
        contentType
      }
    } catch (error) {
      console.error('Failed to upload file:', error)
      throw error
    }
  }

  /**
   * ファイルアップロード（Stream形式）
   */
  async uploadFileStream(
    fileName: string,
    fileStream: Readable,
    fileSize: number,
    contentType: string,
    metadata: FileMetadata
  ): Promise<UploadResult> {
    try {
      const uniqueFileName = this.generateUniqueFileName(fileName)
      const blobClient = this.containerClient.getBlobClient(uniqueFileName)
      const blockBlobClient = blobClient.getBlockBlobClient()

      const blobMetadata = {
        originalName: metadata.originalName,
        uploadedBy: metadata.uploadedBy,
        uploadedAt: metadata.uploadedAt,
        questionId: metadata.questionId || '',
        answerId: metadata.answerId || '',
        commentId: metadata.commentId || ''
      }

      await blockBlobClient.uploadStream(fileStream, undefined, undefined, {
        blobHTTPHeaders: {
          blobContentType: contentType
        },
        metadata: blobMetadata
      })

      return {
        fileName: uniqueFileName,
        blobUrl: blobClient.url,
        fileSize,
        contentType
      }
    } catch (error) {
      console.error('Failed to upload file stream:', error)
      throw error
    }
  }

  /**
   * ファイルダウンロード
   */
  async downloadFile(fileName: string): Promise<Buffer> {
    try {
      const blobClient = this.containerClient.getBlobClient(fileName)
      const downloadResponse = await blobClient.download()
      
      if (!downloadResponse.readableStreamBody) {
        throw new Error('Failed to get file stream')
      }

      const chunks: Buffer[] = []
      for await (const chunk of downloadResponse.readableStreamBody) {
        chunks.push(chunk)
      }

      return Buffer.concat(chunks)
    } catch (error) {
      console.error('Failed to download file:', error)
      throw error
    }
  }

  /**
   * ファイル情報取得
   */
  async getFileInfo(fileName: string): Promise<{
    exists: boolean
    size?: number
    contentType?: string
    metadata?: Record<string, string>
    lastModified?: Date
  }> {
    try {
      const blobClient = this.containerClient.getBlobClient(fileName)
      const properties = await blobClient.getProperties()

      return {
        exists: true,
        size: properties.contentLength,
        contentType: properties.contentType,
        metadata: properties.metadata,
        lastModified: properties.lastModified
      }
    } catch (error: any) {
      if (error.statusCode === 404) {
        return { exists: false }
      }
      console.error('Failed to get file info:', error)
      throw error
    }
  }

  /**
   * ファイル削除
   */
  async deleteFile(fileName: string): Promise<boolean> {
    try {
      const blobClient = this.containerClient.getBlobClient(fileName)
      await blobClient.delete()
      return true
    } catch (error: any) {
      if (error.statusCode === 404) {
        return false // ファイルが存在しない
      }
      console.error('Failed to delete file:', error)
      throw error
    }
  }

  /**
   * ファイル一覧取得
   */
  async listFiles(prefix?: string): Promise<Array<{
    name: string
    size: number
    lastModified: Date
    contentType?: string
  }>> {
    try {
      const files: Array<{
        name: string
        size: number
        lastModified: Date
        contentType?: string
      }> = []

      for await (const blob of this.containerClient.listBlobsFlat({ prefix })) {
        files.push({
          name: blob.name,
          size: blob.properties.contentLength || 0,
          lastModified: blob.properties.lastModified || new Date(),
          contentType: blob.properties.contentType
        })
      }

      return files
    } catch (error) {
      console.error('Failed to list files:', error)
      throw error
    }
  }

  /**
   * ファイルの一時的なアクセスURL生成（SAS Token）
   */
  async generateDownloadUrl(fileName: string, expiresInMinutes = 60): Promise<string> {
    try {
      const blobClient = this.containerClient.getBlobClient(fileName)
      
      // SAS Token生成（実際の実装では適切な権限設定が必要）
      const sasUrl = await blobClient.generateSasUrl({
        permissions: 'r', // 読み取り専用
        expiresOn: new Date(Date.now() + expiresInMinutes * 60 * 1000)
      })

      return sasUrl
    } catch (error) {
      console.error('Failed to generate download URL:', error)
      throw error
    }
  }

  /**
   * ファイルサイズ制限チェック
   */
  validateFileSize(fileSize: number, maxSizeBytes = 1024 * 1024 * 1024): boolean {
    return fileSize <= maxSizeBytes // デフォルト1GB
  }

  /**
   * ファイル形式チェック
   */
  validateFileType(fileName: string, allowedExtensions: string[]): boolean {
    const extension = fileName.toLowerCase().split('.').pop()
    return extension ? allowedExtensions.includes(extension) : false
  }

  /**
   * ユニークなファイル名生成
   */
  private generateUniqueFileName(originalFileName: string): string {
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 8)
    const extension = originalFileName.split('.').pop()
    const nameWithoutExt = originalFileName.replace(/\.[^/.]+$/, '')
    
    return `${timestamp}-${randomString}-${nameWithoutExt}.${extension}`
  }

  /**
   * 接続テスト
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.containerClient.getProperties()
      return true
    } catch (error) {
      console.error('Blob storage connection test failed:', error)
      return false
    }
  }
}

// シングルトンインスタンス
let blobStorageServiceInstance: BlobStorageService | null = null

/**
 * Blob Storageサービスインスタンスを取得
 */
export function getBlobStorageService(): BlobStorageService {
  if (!blobStorageServiceInstance) {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING
    const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME

    if (!connectionString || !containerName) {
      throw new Error('Azure Storage configuration is missing')
    }

    blobStorageServiceInstance = new BlobStorageService({
      connectionString,
      containerName
    })
  }

  return blobStorageServiceInstance
}

/**
 * 開発用のモック機能フラグ
 */
export const isBlobStorageEnabled = (): boolean => {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING
  return connectionString !== undefined && !connectionString.startsWith('mock://')
}

// 許可されるファイル形式
export const ALLOWED_FILE_EXTENSIONS = [
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg',
  'txt', 'md', 'json', 'xml', 'csv',
  'js', 'ts', 'html', 'css', 'py', 'java', 'cs', 'cpp', 'c',
  'zip', 'rar', '7z', 'tar', 'gz'
]

export default BlobStorageService