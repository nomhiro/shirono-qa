#!/usr/bin/env tsx

/**
 * データベース初期化スクリプト
 * 
 * 使用方法:
 * npm run db:init
 * 
 * 環境変数設定が必要:
 * - COSMOS_DB_CONNECTION_STRING
 * - COSMOS_DB_DATABASE_NAME
 */

// 環境変数の読み込み
import { config } from 'dotenv'
import { join } from 'path'

// .env.local ファイルを読み込み
config({ path: join(process.cwd(), '.env.local') })

import { getCosmosService } from '../src/lib/cosmos'
import { hash } from 'bcryptjs'
import { QuestionStatus, QuestionPriority } from '../src/types/question'

interface User {
  id: string
  username: string
  email: string
  passwordHash: string
  groupId: string
  isAdmin: boolean
  createdAt: Date
  lastLoginAt: Date
}

interface Group {
  id: string
  name: string
  description: string
  createdAt: Date
}

interface Question {
  id: string
  title: string
  content: string
  authorId: string
  groupId: string
  status: QuestionStatus
  priority: QuestionPriority
  tags: string[]
  attachments: any[]
  createdAt: Date
  updatedAt: Date
  resolvedAt?: Date
}

async function initializeDatabase() {
  console.log('🚀 Initializing database...')

  try {
    const cosmosService = getCosmosService()

    // データベースとコンテナを初期化
    console.log('📦 Creating database and containers...')
    await cosmosService.initializeDatabase()

    // サンプルデータを作成
    console.log('👥 Creating sample data...')

    // 1. グループ作成
    const sampleGroups: Group[] = [
      {
        id: 'group-ts-ai',
        name: 'TS-AI',
        description: '技術支援・AI関連グループ',
        createdAt: new Date()
      },
      {
        id: 'group-dev-team',
        name: 'Development Team',
        description: '開発チーム',
        createdAt: new Date()
      }
    ]

    for (const group of sampleGroups) {
      await cosmosService.createItem('groups', group)
      console.log(`  ✅ Created group: ${group.name}`)
    }

    // 2. ユーザー作成
    // モック環境では軽量なパスワードハッシュを使用
    const isCosmosEnabled = !process.env.COSMOS_DB_CONNECTION_STRING?.startsWith('mock://')
    const saltRounds = isCosmosEnabled ? 12 : 1 // モック環境では高速化
    
    const adminPasswordHash = await hash('AdminPass123!', saltRounds)
    const userPasswordHash = await hash('UserPass123!', saltRounds)

    const sampleUsers: User[] = [
      {
        id: 'user-admin',
        username: 'admin',
        email: 'nomhiro1204@gmail.com',
        passwordHash: adminPasswordHash,
        groupId: 'group-ts-ai',
        isAdmin: true,
        createdAt: new Date(),
        lastLoginAt: new Date()
      },
      {
        id: 'user-alice',
        username: 'alice',
        email: 'alice@example.com',
        passwordHash: userPasswordHash,
        groupId: 'group-ts-ai',
        isAdmin: false,
        createdAt: new Date(),
        lastLoginAt: new Date()
      },
      {
        id: 'user-bob',
        username: 'bob',
        email: 'bob@example.com',
        passwordHash: userPasswordHash,
        groupId: 'group-dev-team',
        isAdmin: false,
        createdAt: new Date(),
        lastLoginAt: new Date()
      },
      {
        id: 'user-carol',
        username: 'carol',
        email: 'carol@example.com',
        passwordHash: userPasswordHash,
        groupId: 'group-ts-ai',
        isAdmin: false,
        createdAt: new Date(),
        lastLoginAt: new Date()
      }
    ]

    for (const user of sampleUsers) {
      await cosmosService.createItem('users', user)
      console.log(`  ✅ Created user: ${user.username} (${user.isAdmin ? 'Admin' : 'User'})`)
    }

    // 3. サンプル質問作成
    const sampleQuestions: Question[] = [
      {
        id: 'question-1',
        title: 'Next.js 15でのJWT認証実装について',
        content: `Next.js 15のApp Routerを使用してJWT認証を実装したいのですが、セキュリティを考慮したベストプラクティスを教えてください。

具体的には以下の点について知りたいです：
1. JWTトークンの保存方法（Cookie vs localStorage）
2. リフレッシュトークンの実装
3. CSRF攻撃対策
4. セッション管理の方法

現在はクライアント側でlocalStorageに保存していますが、セキュリティ面で心配があります。`,
        authorId: 'user-alice',
        groupId: 'group-ts-ai',
        status: QuestionStatus.ANSWERED,
        priority: QuestionPriority.HIGH,
        tags: ['next.js', 'authentication', 'jwt', 'security'],
        attachments: [],
        createdAt: new Date('2024-06-25T09:00:00Z'),
        updatedAt: new Date('2024-06-25T14:30:00Z')
      },
      {
        id: 'question-2',
        title: 'Azure Cosmos DBでのパフォーマンス最適化',
        content: `Azure Cosmos DBを使用したアプリケーションのパフォーマンスが悪く、RU消費量が予想以上に高くなっています。

現在の状況：
- パーティションキーの設計が適切でない可能性
- クエリが非効率的
- インデックス設定が最適化されていない

パフォーマンス向上のための具体的な手法を教えてください。`,
        authorId: 'user-bob',
        groupId: 'group-dev-team',
        status: QuestionStatus.RESOLVED,
        priority: QuestionPriority.MEDIUM,
        tags: ['azure', 'cosmos-db', 'performance', 'optimization'],
        attachments: [],
        createdAt: new Date('2024-06-24T10:30:00Z'),
        updatedAt: new Date('2024-06-24T16:45:00Z'),
        resolvedAt: new Date('2024-06-24T16:45:00Z')
      },
      {
        id: 'question-3',
        title: 'React 19の新機能について',
        content: `React 19がリリースされましたが、主な新機能と既存プロジェクトへの移行時の注意点を教えてください。

特に気になる点：
- Server Componentsの改善点
- Concurrent Featuresの変更
- 既存のhooksへの影響
- パフォーマンスの向上

現在React 18を使用しているプロジェクトがあるため、移行計画を立てたいと思います。`,
        authorId: 'user-carol',
        groupId: 'group-ts-ai',
        status: QuestionStatus.UNANSWERED,
        priority: QuestionPriority.LOW,
        tags: ['react', 'upgrade', 'server-components', 'hooks'],
        attachments: [],
        createdAt: new Date('2024-06-26T08:15:00Z'),
        updatedAt: new Date('2024-06-26T08:15:00Z')
      },
      {
        id: 'question-4',
        title: 'TypeScriptの型エラーが解決できません',
        content: `以下のTypeScriptコードで型エラーが発生しており、解決方法がわかりません。

\`\`\`typescript
interface User {
  id: string
  name: string
  email?: string
}

function updateUser<T extends User>(user: T, updates: Partial<T>): T {
  return { ...user, ...updates }
}

const user = { id: '1', name: 'John', role: 'admin' }
const updated = updateUser(user, { name: 'Jane' })
\`\`\`

エラーメッセージ：
"Argument of type '{ id: string; name: string; role: string; }' is not assignable to parameter of type 'User'"

このような場合の適切な型定義方法を教えてください。`,
        authorId: 'user-alice',
        groupId: 'group-ts-ai',
        status: QuestionStatus.UNANSWERED,
        priority: QuestionPriority.MEDIUM,
        tags: ['typescript', 'generics', 'type-error', 'debugging'],
        attachments: [],
        createdAt: new Date('2024-06-26T11:20:00Z'),
        updatedAt: new Date('2024-06-26T11:20:00Z')
      },
      {
        id: 'question-5',
        title: 'Azure OpenAIのレート制限対策',
        content: `Azure OpenAI Serviceを使用したアプリケーションで、レート制限エラーが頻発しています。

現在の実装：
- GPT-4モデルを使用
- 同時リクエスト数の制御なし
- リトライ機能なし
- エラーハンドリングが不十分

効果的なレート制限対策とエラーハンドリングの実装方法を教えてください。`,
        authorId: 'user-bob',
        groupId: 'group-dev-team',
        status: QuestionStatus.ANSWERED,
        priority: QuestionPriority.HIGH,
        tags: ['azure', 'openai', 'rate-limiting', 'error-handling'],
        attachments: [],
        createdAt: new Date('2024-06-25T15:45:00Z'),
        updatedAt: new Date('2024-06-26T09:30:00Z')
      }
    ]

    for (const question of sampleQuestions) {
      await cosmosService.createItem('questions', question)
      console.log(`  ✅ Created question: ${question.title}`)
    }

    // 4. サンプル回答作成（一部の質問に対して）
    const sampleAnswers = [
      {
        id: 'answer-1',
        questionId: 'question-1',
        content: `JWT認証の実装についてお答えします。

## 1. JWTトークンの保存方法

**推奨：HttpOnly Cookie**
- XSS攻撃に対する保護
- CSRF対策と組み合わせて使用
- サーバーサイドでの管理が容易

**避けるべき：localStorage**
- XSSに対して脆弱
- サードパーティスクリプトからアクセス可能

## 2. リフレッシュトークンの実装

\`\`\`typescript
// アクセストークン: 短期間（15分程度）
// リフレッシュトークン: 長期間（7日程度）

const tokens = {
  accessToken: jwt.sign(payload, secret, { expiresIn: '15m' }),
  refreshToken: jwt.sign(payload, refreshSecret, { expiresIn: '7d' })
}
\`\`\`

## 3. CSRF攻撃対策

- SameSite Cookieの使用
- CSRFトークンの実装
- Origin/Refererヘッダーの検証

詳細な実装例が必要でしたら、コードサンプルを提供できます。`,
        authorId: 'user-admin',
        attachments: [],
        createdAt: new Date('2024-06-25T14:30:00Z')
      },
      {
        id: 'answer-2',
        questionId: 'question-2',
        content: `Cosmos DBのパフォーマンス最適化について説明します。

## 1. パーティションキーの最適化

**良い例:**
- ユーザーIDやタイムスタンプの組み合わせ
- データの均等分散を考慮

**悪い例:**
- 固定値や少数の値のみ
- ホットパーティションの原因

## 2. クエリの最適化

\`\`\`sql
-- 効率的なクエリ
SELECT * FROM c WHERE c.partitionKey = "value" AND c.status = "active"

-- 非効率なクエリ（Cross-partition）
SELECT * FROM c WHERE c.status = "active"
\`\`\`

## 3. インデックス設定

- 必要な属性のみインデックス化
- 複合インデックスの活用
- レンジインデックスとハッシュインデックスの使い分け

## 4. RU最適化のコツ

- バッチ処理でのトランザクション使用
- 軽量な読み取り操作の活用
- キャッシュ戦略の実装

実際のクエリ例を教えていただければ、より具体的なアドバイスができます。`,
        authorId: 'user-admin',
        attachments: [],
        createdAt: new Date('2024-06-24T16:45:00Z')
      },
      {
        id: 'answer-3',
        questionId: 'question-5',
        content: `Azure OpenAIのレート制限対策について説明します。

## 1. 指数バックオフでのリトライ実装

\`\`\`typescript
async function callWithRetry(apiCall: () => Promise<any>, maxRetries = 3) {
  let delay = 1000 // 初期遅延時間（1秒）
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await apiCall()
    } catch (error) {
      if (error.status === 429 && i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay))
        delay *= 2 // 指数バックオフ
      } else {
        throw error
      }
    }
  }
}
\`\`\`

## 2. リクエストキューイング

- セマフォを使用した同時実行数制御
- 優先度付きキューの実装
- レート制限情報の監視

## 3. 効率的なプロンプト設計

- トークン数の最適化
- バッチ処理での複数リクエスト統合
- キャッシュ機能の活用

## 4. 監視とアラート

- レート制限エラーの頻度監視
- レスポンス時間の追跡
- 使用量ダッシュボードの構築

実装の詳細についてご質問があれば、お気軽にお聞きください。`,
        authorId: 'user-admin',
        attachments: [],
        createdAt: new Date('2024-06-26T09:30:00Z')
      }
    ]

    for (const answer of sampleAnswers) {
      await cosmosService.createItem('answers', answer)
      console.log(`  ✅ Created answer for question: ${answer.questionId}`)
    }

    console.log('\n🎉 Database initialization completed successfully!')
    console.log('\n📊 Summary:')
    console.log(`  - Groups: ${sampleGroups.length}`)
    console.log(`  - Users: ${sampleUsers.length}`)
    console.log(`  - Questions: ${sampleQuestions.length}`)
    console.log(`  - Answers: ${sampleAnswers.length}`)

    console.log('\n👤 Test Accounts:')
    console.log('  📧 Admin: admin / AdminPass123!')
    console.log('  📧 User: alice / UserPass123!')
    console.log('  📧 User: bob / UserPass123!')
    console.log('  📧 User: carol / UserPass123!')

  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    process.exit(1)
  }
}

// スクリプト実行
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('\n✅ Initialization script completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Script failed:', error)
      process.exit(1)
    })
}