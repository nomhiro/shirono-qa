#!/usr/bin/env tsx

/**
 * Azure サービス接続テストスクリプト
 * 
 * 使用方法:
 * npm run test:connections
 * 
 * 環境変数設定が必要:
 * - COSMOS_DB_CONNECTION_STRING
 * - AZURE_STORAGE_CONNECTION_STRING
 * - AZURE_OPENAI_ENDPOINT
 * - AZURE_OPENAI_API_KEY
 * - SMTP_HOST, SMTP_USER, SMTP_PASSWORD
 */

// 環境変数の読み込み
import { config } from 'dotenv'
import { join } from 'path'

// .env.local ファイルを読み込み
config({ path: join(process.cwd(), '.env.local') })

import { getCosmosService } from '../src/lib/cosmos'
import { getBlobStorageService } from '../src/lib/blob-storage'
import { embedText, generateTags, chatCompletion } from '../src/lib/openai'
import { getEmailService } from '../src/lib/email'

// 各サービスの有効性チェック
const isCosmosEnabled = (): boolean => !!process.env.COSMOS_DB_CONNECTION_STRING
const isBlobStorageEnabled = (): boolean => !!process.env.AZURE_STORAGE_CONNECTION_STRING
const isEmailEnabled = (): boolean => !!process.env.SMTP_HOST

interface TestResult {
  service: string
  status: 'success' | 'failed' | 'skipped'
  message: string
  details?: any
}

class ConnectionTester {
  results: TestResult[] = []

  private addResult(service: string, status: TestResult['status'], message: string, details?: any) {
    this.results.push({ service, status, message, details })
  }

  private printResult(result: TestResult) {
    const icon = result.status === 'success' ? '✅' : result.status === 'failed' ? '❌' : '⏭️'
    const status = result.status.toUpperCase().padEnd(8)
    console.log(`  ${icon} ${status} ${result.service}: ${result.message}`)
    
    if (result.details && result.status === 'failed') {
      console.log(`    Details: ${result.details}`)
    }
  }

  async testCosmosDB(): Promise<void> {
    console.log('\n📊 Testing Cosmos DB connection...')
    
    if (!isCosmosEnabled()) {
      this.addResult('Cosmos DB', 'skipped', 'Mock mode - no real connection tested')
      this.printResult(this.results[this.results.length - 1])
      return
    }

    try {
      const cosmosService = getCosmosService()
      
      // 接続テスト
      const isConnected = await cosmosService.testConnection()
      
      if (isConnected) {
        // 簡単な読み書きテスト
        const testItem = {
          id: 'test-connection-' + Date.now(),
          testData: 'Connection test',
          timestamp: new Date()
        }
        
        // テストアイテムの作成
        await cosmosService.createItem('users', testItem)
        
        // テストアイテムの読み取り
        const retrievedItem = await cosmosService.getItem<{id: string}>('users', testItem.id)
        
        // テストアイテムの削除
        await cosmosService.deleteItem('users', testItem.id)
        
        if (retrievedItem && retrievedItem.id === testItem.id) {
          this.addResult('Cosmos DB', 'success', 'Connection and CRUD operations successful')
        } else {
          this.addResult('Cosmos DB', 'failed', 'CRUD operations failed')
        }
      } else {
        this.addResult('Cosmos DB', 'failed', 'Connection test failed')
      }
    } catch (error: any) {
      this.addResult('Cosmos DB', 'failed', 'Connection error', error.message)
    }
    
    this.printResult(this.results[this.results.length - 1])
  }

  async testBlobStorage(): Promise<void> {
    console.log('\n📁 Testing Blob Storage connection...')
    
    if (!isBlobStorageEnabled()) {
      this.addResult('Blob Storage', 'skipped', 'Mock mode - no real connection tested')
      this.printResult(this.results[this.results.length - 1])
      return
    }

    try {
      const blobService = getBlobStorageService()
      
      // 接続テスト
      const isConnected = await blobService.testConnection()
      
      if (isConnected) {
        // コンテナ初期化テスト
        await blobService.initializeContainer()
        
        // テストファイルのアップロード
        const testContent = Buffer.from('Test file content for connection test')
        const testFileName = `test-connection-${Date.now()}.txt`
        
        const uploadResult = await blobService.uploadFile(
          testFileName,
          testContent,
          'text/plain',
          {
            originalName: 'test.txt',
            uploadedBy: 'connection-test',
            uploadedAt: new Date().toISOString()
          }
        )
        
        // ファイル情報取得テスト
        const fileInfo = await blobService.getFileInfo(uploadResult.fileName)
        
        // ファイル削除
        await blobService.deleteFile(uploadResult.fileName)
        
        if (fileInfo.exists && fileInfo.size === testContent.length) {
          this.addResult('Blob Storage', 'success', 'Connection and file operations successful')
        } else {
          this.addResult('Blob Storage', 'failed', 'File operations failed')
        }
      } else {
        this.addResult('Blob Storage', 'failed', 'Connection test failed')
      }
    } catch (error: any) {
      this.addResult('Blob Storage', 'failed', 'Connection error', error.message)
    }
    
    this.printResult(this.results[this.results.length - 1])
  }

  async testAzureOpenAI(): Promise<void> {
    console.log('\n🤖 Testing Azure OpenAI connection...')
    
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT
    const apiKey = process.env.AZURE_OPENAI_API_KEY
    
    if (!endpoint || !apiKey || endpoint.startsWith('mock://') || apiKey === 'mock-key') {
      this.addResult('Azure OpenAI', 'skipped', 'Mock mode - no real connection tested')
      this.printResult(this.results[this.results.length - 1])
      return
    }

    try {
      // 1. Embedding テスト
      console.log('    Testing embeddings...')
      const embeddingResult = await embedText('Hello, this is a test')
      
      if (Array.isArray(embeddingResult) && embeddingResult.length > 0) {
        console.log(`    ✅ Embeddings: Generated ${embeddingResult.length}-dimensional vector`)
      } else {
        throw new Error('Invalid embedding response')
      }
      
      // 2. Chat Completion テスト
      console.log('    Testing chat completion...')
      const chatResult = await chatCompletion('What is 2+2? Answer in one word.')
      
      if (chatResult.content && chatResult.content.length > 0) {
        console.log(`    ✅ Chat: Received response (${chatResult.content.length} chars)`)
      } else {
        throw new Error('Invalid chat completion response')
      }
      
      // 3. Tag Generation テスト
      console.log('    Testing tag generation...')
      const tagResult = await generateTags(
        'JavaScript async/await問題',
        'JavaScript のasync/awaitを使用した非同期処理で問題が発生しています'
      )
      
      if (tagResult.tags && tagResult.tags.length > 0) {
        console.log(`    ✅ Tags: Generated ${tagResult.tags.length} tags`)
      } else {
        throw new Error('Invalid tag generation response')
      }
      
      this.addResult('Azure OpenAI', 'success', 'All API endpoints working correctly')
      
    } catch (error: any) {
      this.addResult('Azure OpenAI', 'failed', 'API call error', error.message)
    }
    
    this.printResult(this.results[this.results.length - 1])
  }

  async testEmailService(): Promise<void> {
    console.log('\n📧 Testing Email service connection...')
    
    if (!isEmailEnabled()) {
      this.addResult('Email Service', 'skipped', 'Mock mode - no real connection tested')
      this.printResult(this.results[this.results.length - 1])
      return
    }

    try {
      const emailService = getEmailService()
      
      // SMTP接続テスト
      const isConnected = await emailService.testConnection()
      
      if (isConnected) {
        this.addResult('Email Service', 'success', 'SMTP connection verified')
        
        // 実際のテストメール送信は行わない（スパム防止）
        console.log('    Note: Actual email sending not tested to prevent spam')
      } else {
        this.addResult('Email Service', 'failed', 'SMTP connection failed')
      }
    } catch (error: any) {
      this.addResult('Email Service', 'failed', 'Connection error', error.message)
    }
    
    this.printResult(this.results[this.results.length - 1])
  }

  async testEnvironmentVariables(): Promise<void> {
    console.log('\n🔧 Testing environment variables...')
    
    const requiredVars = [
      'COSMOS_DB_CONNECTION_STRING',
      'COSMOS_DB_DATABASE_NAME',
      'AZURE_STORAGE_CONNECTION_STRING',
      'AZURE_STORAGE_CONTAINER_NAME',
      'AZURE_OPENAI_ENDPOINT',
      'AZURE_OPENAI_API_KEY',
      'AZURE_OPENAI_DEPLOYMENT_NAME',
      'SMTP_HOST',
      'SMTP_USER',
      'SMTP_PASSWORD',
      'SESSION_SECRET'
    ]
    
    const missing: string[] = []
    const mock: string[] = []
    
    for (const varName of requiredVars) {
      const value = process.env[varName]
      if (!value) {
        missing.push(varName)
      } else if (value.startsWith('mock://') || value === 'mock-key') {
        mock.push(varName)
      }
    }
    
    if (missing.length > 0) {
      this.addResult(
        'Environment Variables', 
        'failed', 
        `Missing variables: ${missing.join(', ')}`
      )
    } else if (mock.length > 0) {
      this.addResult(
        'Environment Variables', 
        'success', 
        `All variables set (${mock.length} in mock mode)`
      )
    } else {
      this.addResult('Environment Variables', 'success', 'All variables configured')
    }
    
    this.printResult(this.results[this.results.length - 1])
  }

  printSummary(): void {
    console.log('\n' + '='.repeat(60))
    console.log('🎯 CONNECTION TEST SUMMARY')
    console.log('='.repeat(60))
    
    const successCount = this.results.filter(r => r.status === 'success').length
    const failedCount = this.results.filter(r => r.status === 'failed').length
    const skippedCount = this.results.filter(r => r.status === 'skipped').length
    
    console.log(`✅ Successful: ${successCount}`)
    console.log(`❌ Failed: ${failedCount}`)
    console.log(`⏭️ Skipped: ${skippedCount}`)
    console.log(`📊 Total: ${this.results.length}`)
    
    if (failedCount > 0) {
      console.log('\n❌ FAILED SERVICES:')
      this.results
        .filter(r => r.status === 'failed')
        .forEach(result => {
          console.log(`  - ${result.service}: ${result.message}`)
          if (result.details) {
            console.log(`    ${result.details}`)
          }
        })
    }
    
    if (skippedCount > 0) {
      console.log('\n⏭️ SKIPPED SERVICES (Mock mode):')
      this.results
        .filter(r => r.status === 'skipped')
        .forEach(result => {
          console.log(`  - ${result.service}`)
        })
    }
    
    console.log('\n' + '='.repeat(60))
    
    if (failedCount === 0) {
      console.log('🎉 All enabled services are working correctly!')
    } else {
      console.log('⚠️ Some services have issues. Please check the configuration.')
    }
  }

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Azure services connection tests...')
    console.log('=' .repeat(60))
    
    await this.testEnvironmentVariables()
    await this.testCosmosDB()
    await this.testBlobStorage()
    await this.testAzureOpenAI()
    await this.testEmailService()
    
    this.printSummary()
  }
}

// スクリプト実行
async function main() {
  const tester = new ConnectionTester()
  
  try {
    await tester.runAllTests()
    
    // 失敗があった場合は終了コード1で終了
    const hasFailures = tester.results.some(r => r.status === 'failed')
    process.exit(hasFailures ? 1 : 0)
    
  } catch (error) {
    console.error('💥 Test script failed:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}