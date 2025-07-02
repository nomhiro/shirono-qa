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
   * 構造化されたパスでファイルアップロード
   */
  async uploadFileWithPath(
    filePath: string,
    fileName: string,
    fileBuffer: Buffer,
    contentType: string,
    metadata: FileMetadata
  ): Promise<UploadResult> {
    try {
      // パスとファイル名を組み合わせて完全なBlob名を作成
      const fullBlobName = `${filePath}/${fileName}`.replace(/\/+/g, '/')
      const blobClient = this.containerClient.getBlobClient(fullBlobName)
      const blockBlobClient = blobClient.getBlockBlobClient()

      // メタデータを設定（ASCII文字のみ許可されるためBase64エンコード）
      const blobMetadata = {
        originalName: this.encodeMetadataValue(metadata.originalName),
        uploadedBy: this.sanitizeMetadataValue(metadata.uploadedBy),
        uploadedAt: this.sanitizeMetadataValue(metadata.uploadedAt),
        questionId: this.sanitizeMetadataValue(metadata.questionId || ''),
        answerId: this.sanitizeMetadataValue(metadata.answerId || ''),
        commentId: this.sanitizeMetadataValue(metadata.commentId || '')
      }

      // ファイルをアップロード
      await blockBlobClient.upload(fileBuffer, fileBuffer.length, {
        blobHTTPHeaders: {
          blobContentType: contentType
        },
        metadata: blobMetadata
      })

      return {
        fileName: fullBlobName,
        blobUrl: blobClient.url,
        fileSize: fileBuffer.length,
        contentType
      }
    } catch (error) {
      console.error('Failed to upload file with path:', error)
      throw error
    }
  }

  /**
   * ファイルアップロード（Buffer形式）- 後方互換性のため残す
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

      // メタデータを設定（ASCII文字のみ許可されるためBase64エンコード）
      const blobMetadata = {
        originalName: this.encodeMetadataValue(metadata.originalName),
        uploadedBy: this.sanitizeMetadataValue(metadata.uploadedBy),
        uploadedAt: this.sanitizeMetadataValue(metadata.uploadedAt),
        questionId: this.sanitizeMetadataValue(metadata.questionId || ''),
        answerId: this.sanitizeMetadataValue(metadata.answerId || ''),
        commentId: this.sanitizeMetadataValue(metadata.commentId || '')
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
        originalName: this.encodeMetadataValue(metadata.originalName),
        uploadedBy: this.sanitizeMetadataValue(metadata.uploadedBy),
        uploadedAt: this.sanitizeMetadataValue(metadata.uploadedAt),
        questionId: this.sanitizeMetadataValue(metadata.questionId || ''),
        answerId: this.sanitizeMetadataValue(metadata.answerId || ''),
        commentId: this.sanitizeMetadataValue(metadata.commentId || '')
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

      // メタデータをデコード
      const decodedMetadata: Record<string, string> = {}
      if (properties.metadata) {
        for (const [key, value] of Object.entries(properties.metadata)) {
          decodedMetadata[key] = this.decodeMetadataValue(value)
        }
      }

      return {
        exists: true,
        size: properties.contentLength,
        contentType: properties.contentType,
        metadata: decodedMetadata,
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
   * Blob URLからファイル削除
   */
  async deleteFileByUrl(blobUrl: string): Promise<boolean> {
    try {
      const fileName = this.extractFileNameFromUrl(blobUrl)
      return await this.deleteFile(fileName)
    } catch (error) {
      console.error('Failed to delete file by URL:', error)
      return false
    }
  }

  /**
   * 複数ファイルを一括削除
   */
  async deleteFiles(fileNames: string[]): Promise<{ success: number; failed: string[] }> {
    const failed: string[] = []
    let success = 0

    for (const fileName of fileNames) {
      try {
        const result = await this.deleteFile(fileName)
        if (result) {
          success++
        } else {
          failed.push(fileName)
        }
      } catch (error) {
        console.error(`Failed to delete file ${fileName}:`, error)
        failed.push(fileName)
      }
    }

    return { success, failed }
  }

  /**
   * 複数のBlob URLからファイルを一括削除
   */
  async deleteFilesByUrls(blobUrls: string[]): Promise<{ success: number; failed: string[] }> {
    const failed: string[] = []
    let success = 0

    for (const blobUrl of blobUrls) {
      try {
        const result = await this.deleteFileByUrl(blobUrl)
        if (result) {
          success++
        } else {
          failed.push(blobUrl)
        }
      } catch (error) {
        console.error(`Failed to delete file by URL ${blobUrl}:`, error)
        failed.push(blobUrl)
      }
    }

    return { success, failed }
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
    let nameWithoutExt = originalFileName.replace(/\.[^/.]+$/, '')
    
    // Blob Storageでは日本語などの非ASCII文字がファイル名に含まれると問題が発生するため
    // ASCII文字以外を安全な文字に置換またはBase64エンコード
    const safeName = this.sanitizeFileName(nameWithoutExt)
    
    return `${timestamp}-${randomString}-${safeName}.${extension}`
  }

  /**
   * ファイル名をBlob Storage用にサニタイズ
   */
  private sanitizeFileName(fileName: string): string {
    // ASCII文字以外を削除またはエンコード
    return fileName
      .replace(/[^\x20-\x7E]/g, '') // 非ASCII文字を削除
      .replace(/\s+/g, '_') // スペースをアンダースコアに
      .replace(/[<>:"/\\|?*]/g, '') // 特殊文字を削除
      .substring(0, 100) // 長さ制限
  }

  /**
   * Blob Storage用のパス生成
   */
  generateBlobPath(type: 'question' | 'answer' | 'comment', questionId: string, itemId?: string): string {
    const basePath = `questions/${questionId}`
    
    switch (type) {
      case 'question':
        return `${basePath}/question`
      case 'answer':
        return `${basePath}/answers/${itemId}`
      case 'comment':
        return `${basePath}/comments/${itemId}`
      default:
        throw new Error(`Unknown upload type: ${type}`)
    }
  }

  /**
   * ファイル名の重複を避けるため、必要に応じて番号を付与
   */
  async generateUniqueFileNameInPath(filePath: string, originalFileName: string): Promise<string> {
    let fileName = originalFileName
    let counter = 1
    
    while (true) {
      const fullBlobName = `${filePath}/${fileName}`.replace(/\/+/g, '/')
      const blobClient = this.containerClient.getBlobClient(fullBlobName)
      
      try {
        const exists = await blobClient.exists()
        if (!exists) {
          return fileName
        }
        
        // ファイルが既に存在する場合は番号を付与
        const nameParts = originalFileName.split('.')
        const extension = nameParts.pop()
        const baseName = nameParts.join('.')
        fileName = `${baseName}_${counter}.${extension}`
        counter++
        
      } catch (error) {
        // exists() でエラーが発生した場合は、ファイルが存在しないと仮定
        return fileName
      }
    }
  }

  /**
   * メタデータ値をBase64エンコード（非ASCII文字対応）
   */
  private encodeMetadataValue(value: string): string {
    if (!value) return ''
    try {
      // 非ASCII文字が含まれているかチェック
      if (/[^\x00-\x7F]/.test(value)) {
        // Base64エンコードしてプレフィックスを付与
        return 'b64:' + Buffer.from(value, 'utf8').toString('base64')
      }
      // ASCII文字のみの場合はそのまま
      return this.sanitizeMetadataValue(value)
    } catch (error) {
      console.warn('Failed to encode metadata value:', value, error)
      return 'encoded-error'
    }
  }

  /**
   * メタデータ値をサニタイズ（ASCII文字のみ許可）
   */
  private sanitizeMetadataValue(value: string): string {
    if (!value) return ''
    // ASCII文字以外を削除し、制御文字も除去
    return value.replace(/[^\x20-\x7E]/g, '').substring(0, 8192) // Azure の制限
  }

  /**
   * エンコードされたメタデータ値をデコード
   */
  private decodeMetadataValue(value: string): string {
    if (!value) return ''
    try {
      if (value.startsWith('b64:')) {
        // Base64デコード
        return Buffer.from(value.substring(4), 'base64').toString('utf8')
      }
      // そのまま返す
      return value
    } catch (error) {
      console.warn('Failed to decode metadata value:', value, error)
      return value
    }
  }

  /**
   * Blob URLからフルパス（コンテナ名以降）を抽出（パブリックメソッド）
   */
  extractFileNameFromUrl(blobUrl: string): string {
    if (blobUrl.startsWith('mock://')) {
      return blobUrl.replace('mock://blob/', '')
    }
    
    try {
      const url = new URL(blobUrl)
      const pathParts = url.pathname.split('/').filter(part => part.length > 0)
      
      // パスの最初の部分はコンテナ名、それ以降がファイルパス
      if (pathParts.length < 2) {
        throw new Error('Invalid blob URL structure')
      }
      
      // コンテナ名（pathParts[0]）を除いたフルパスを取得
      const fullPath = pathParts.slice(1).join('/')
      
      // URLデコードを適用
      let decodedPath = fullPath
      try {
        decodedPath = decodeURIComponent(fullPath)
      } catch (decodeError) {
        console.warn('Failed to decode full path:', fullPath, decodeError)
        // デコードに失敗した場合はそのまま使用
      }
      
      console.log('Extracted full path from URL:', { blobUrl, fullPath: decodedPath })
      return decodedPath
    } catch (error) {
      console.error('Failed to extract full path from URL:', blobUrl, error)
      throw new Error(`Invalid blob URL: ${blobUrl}`)
    }
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