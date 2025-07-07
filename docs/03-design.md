# shiro Assistant システム設計書

**バージョン**: 2.1  
**作成日**: 2025年6月25日  
**最終更新**: 2025年7月4日  
**作成者**: システム開発担当者  

## 1. システムアーキテクチャ

### 1.1 全体アーキテクチャ
```
┌─────────────────────────────────────────────────┐
│                  ユーザー                        │
└─────────────────┬───────────────────────────────┘
                  │ HTTPS
┌─────────────────▼───────────────────────────────┐
│            Azure App Service                    │
│  ┌─────────────────────────────────────────────┐│
│  │           Next.js Application               ││
│  │  ┌─────────────┐  ┌─────────────────────┐  ││
│  │  │  Frontend   │  │      Backend        │  ││
│  │  │  (React)    │  │   (API Routes)      │  ││
│  │  └─────────────┘  └─────────────────────┘  ││
│  └─────────────────────────────────────────────┘│
└─────────────────┬───────────────────────────────┘
                  │
      ┌───────────┼───────────┐
      │           │           │
┌─────▼─────┐ ┌───▼───┐ ┌─────▼─────┐
│  Cosmos   │ │ Blob  │ │Azure      │
│    DB     │ │Storage│ │OpenAI     │
└───────────┘ └───────┘ └───────────┘
```

### 1.2 技術スタック詳細

#### 1.2.1 フロントエンド
- **フレームワーク**: Next.js 14 (App Router)
- **UIライブラリ**: Material-UI (MUI) v5
- **状態管理**: React Hooks (useState, useEffect, useContext)
- **HTTP通信**: fetch API
- **ファイルアップロード**: React Hook Form + custom FileUpload component

#### 1.2.2 バックエンド
- **フレームワーク**: Next.js API Routes
- **認証**: Server-side sessions with HttpOnly cookies
- **ファイル処理**: Multer + Azure Blob Storage SDK
- **メール送信**: Nodemailer with Gmail SMTP

#### 1.2.3 データベース
- **主DB**: Azure Cosmos DB (NoSQL)
- **セッション**: Cosmos DB sessions container
- **TTL設定**: Sessions container (6時間)

#### 1.2.4 外部サービス
- **ファイルストレージ**: Azure Blob Storage
- **メール送信**: Gmail SMTP
- **監視**: Azure Monitor
- **将来拡張**: Azure OpenAI Service (GPT-4.1, text-embedding-3-large)

## 2. データベース設計

### 2.1 Cosmos DB コンテナ設計

#### 2.1.1 データベース構成
```
Database: ShironoQA
├── Container: users
├── Container: groups  
├── Container: questions
├── Container: answers
├── Container: comments
└── Container: sessions
```

#### 2.1.2 各コンテナ詳細


**users コンテナ**
```json
{
  "id": "user_123",
  "username": "testuser",
  "email": "test@example.com", 
  "passwordHash": "$2b$12$...",
  "groupId": "group_456",
  "isAdmin": false,
  "createdAt": "2025-01-01T00:00:00Z",
  "lastLoginAt": "2025-01-01T12:00:00Z"
}
```
- **パーティションキー**: `/id`
- **一意インデックス**: `username`, `email`

**groups コンテナ**
```json
{
  "id": "group_456",
  "name": "TS-AI",
  "description": "技術支援・AI関連グループ",
  "createdAt": "2025-01-01T00:00:00Z"
}
```
- **パーティションキー**: `/id`

**questions コンテナ**
```json
{
  "id": "question_789",
  "title": "Azure App Serviceのデプロイ方法について",
  "content": "Azure App Serviceへのデプロイで...",
  "authorId": "user_123",
  "groupId": "group_456",
  "status": "pending",
  "priority": "medium",
  "tags": ["Azure", "App Service", "デプロイ"],
  "attachments": [
    {
      "fileName": "deploy-config.json",
      "fileSize": 1024,
      "blobUrl": "https://storage.../deploy-config.json"
    }
  ],
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-01T00:00:00Z",
  "resolvedAt": null
}
```
- **パーティションキー**: `/groupId`
- **インデックス**: `authorId`, `status`, `priority`, `createdAt`, `tags`
- **ベクターインデックス**: `contentVector` (diskANN, cosine similarity)

**answers コンテナ**
```json
{
  "id": "answer_101",
  "questionId": "question_789", 
  "content": "Azure App Serviceへのデプロイは...",
  "authorId": "user_123",
  "attachments": [...],
  "createdAt": "2025-01-01T01:00:00Z"
}
```
- **パーティションキー**: `/questionId`

**comments コンテナ**
```json
{
  "id": "comment_202",
  "questionId": "question_789",
  "answerId": "answer_101",
  "content": "ありがとうございます。参考になりました。",
  "authorId": "user_123", 
  "attachments": [],
  "createdAt": "2025-01-01T02:00:00Z"
}
```
- **パーティションキー**: `/questionId`

**sessions コンテナ**
```json
{
  "id": "session_303",
  "userId": "user_123",
  "sessionToken": "uuid-token-here",
  "expiresAt": "2025-01-01T06:00:00Z",
  "createdAt": "2025-01-01T00:00:00Z",
  "lastAccessedAt": "2025-01-01T00:30:00Z",
  "ttl": 21600
}
```
- **パーティションキー**: `/userId`
- **TTL**: 6時間（21600秒）

### 2.2 インデックス戦略

#### 2.2.1 複合インデックス
```json
// questions コンテナ
[
  { "path": "/groupId", "order": "ascending" },
  { "path": "/status", "order": "ascending" },
  { "path": "/priority", "order": "ascending" },
  { "path": "/createdAt", "order": "descending" }
]
```

#### 2.2.2 ベクターインデックス
```json
{
  "vectorIndexes": [
    {
      "path": "/contentVector",
      "type": "diskANN",
      "dimensions": 3072,
      "similarityMetric": "cosine"
    }
  ]
}
```

## 3. API設計

### 3.1 ディレクトリ構造
```
src/app/api/
├── auth/
│   ├── login/route.ts
│   ├── logout/route.ts
│   └── me/route.ts
├── questions/
│   ├── route.ts (GET, POST)
│   ├── [id]/
│   │   ├── route.ts (GET, PUT, DELETE)
│   │   ├── answers/route.ts
│   │   ├── comments/route.ts
│   │   └── search/route.ts
├── files/
│   ├── upload/route.ts
│   └── download/[filename]/route.ts
└── admin/
    ├── users/
    │   ├── route.ts
    │   └── [id]/route.ts
    └── groups/
        ├── route.ts
        └── [id]/route.ts
```

### 3.2 認証ミドルウェア

#### 3.2.1 セッション検証
```typescript
// lib/auth.ts
export async function validateSession(request: Request) {
  const sessionToken = request.headers.get('authorization')?.replace('Bearer ', '');
  
  if (!sessionToken) {
    throw new Error('UNAUTHORIZED');
  }
  
  const session = await cosmosClient
    .database('ShironoQA')
    .container('sessions')
    .item(sessionToken, sessionToken)
    .read();
    
  if (!session.resource || session.resource.expiresAt < new Date()) {
    throw new Error('UNAUTHORIZED');
  }
  
  // セッション更新
  await updateSessionAccess(sessionToken);
  
  return session.resource;
}
```

#### 3.2.2 権限チェック
```typescript
export async function checkPermission(userId: string, resource: string, action: string) {
  const user = await getUser(userId);
  
  // 管理者は全権限
  if (user.isAdmin) return true;
  
  // グループベースの権限チェック
  switch (action) {
    case 'read_question':
      return resource.groupId === user.groupId;
    case 'edit_question':
      return resource.authorId === userId;
    default:
      return false;
  }
}
```

### 3.3 エラーハンドリング

#### 3.3.1 統一エラーレスポンス
```typescript
// lib/errors.ts
export class APIError extends Error {
  code: string;
  statusCode: number;
  
  constructor(code: string, message: string, statusCode: number = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

export function handleAPIError(error: unknown) {
  if (error instanceof APIError) {
    return Response.json(
      { error: { code: error.code, message: error.message } },
      { status: error.statusCode }
    );
  }
  
  return Response.json(
    { error: { code: 'INTERNAL_ERROR', message: 'サーバー内部エラーが発生しました' } },
    { status: 500 }
  );
}
```

## 4. フロントエンド設計

### 4.1 コンポーネント設計

#### 4.1.1 ディレクトリ構造
```
src/
├── app/
│   ├── login/page.tsx
│   ├── page.tsx (投稿一覧)
│   ├── questions/
│   │   ├── new/page.tsx
│   │   └── [id]/page.tsx
│   ├── admin/
│   │   ├── users/page.tsx
│   │   └── groups/page.tsx
│   └── layout.tsx
├── components/
│   ├── ThemeProvider.tsx
│   ├── FileUpload.tsx
│   ├── QuestionList.tsx
│   ├── QuestionDisplay.tsx
│   ├── ReplyForm.tsx
│   └── UserManagement.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useFileUpload.ts
│   └── useQuestions.ts
└── lib/
    ├── auth.ts
    ├── api.ts
    └── utils.ts
```

#### 4.1.2 主要コンポーネント

**ThemeProvider.tsx**
```typescript
'use client';
import { createTheme, ThemeProvider } from '@mui/material/styles';

export function AppThemeProvider({ children }) {
  const theme = createTheme({
    palette: {
      mode: 'light', // 固定
      primary: { main: '#1976d2' },
      secondary: { main: '#dc004e' },
    },
    components: {
      MuiTextField: {
        styleOverrides: {
          root: {
            '& input': {
              color: '#171717 !important',
              backgroundColor: '#ffffff !important',
            },
          },
        },
      },
    },
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
```

**FileUpload.tsx**
```typescript
interface FileUploadProps {
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
  accept?: string;
}

export default function FileUpload({ onFilesChange, maxFiles = 5 }) {
  // ドラッグ&ドロップ、プレビュー、検証機能を実装
  // 最大1GB/ファイル、最大5ファイルの制限
}
```

### 4.2 状態管理

#### 4.2.1 認証状態
```typescript
// hooks/useAuth.ts
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  const login = async (username: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    
    if (response.ok) {
      const data = await response.json();
      setUser(data.user);
      // セッショントークンはHttpOnly Cookieで自動管理
    }
  };
  
  return { user, login, logout, loading };
}
```

#### 4.2.2 投稿データ管理
```typescript
// hooks/useQuestions.ts
export function useQuestions() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    priority: '', 
    search: '',
  });
  
  const fetchQuestions = async () => {
    const params = new URLSearchParams(filters);
    const response = await fetch(`/api/questions?${params}`);
    const data = await response.json();
    setQuestions(data.questions);
  };
  
  return { questions, filters, setFilters, fetchQuestions, loading };
}
```

## 5. セキュリティ設計

### 5.1 認証・認可

#### 5.1.1 セッション管理
- **セッショントークン**: crypto.randomUUID()で生成
- **Cookie設定**: HttpOnly, Secure, SameSite=Strict
- **有効期限**: 6時間（アクセス時に更新）
- **同時セッション**: ユーザーあたり最大5セッション

#### 5.1.2 パスワードセキュリティ
```typescript
// lib/password.ts
import bcrypt from 'bcrypt';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function validatePasswordPolicy(password: string): boolean {
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const hasMinLength = password.length >= 8;
  
  return hasLetter && hasNumber && hasSymbol && hasMinLength;
}
```

### 5.2 入力検証

#### 5.2.1 バリデーション関数
```typescript
// lib/validation.ts
export const questionSchema = {
  title: { required: true, maxLength: 100 },
  content: { required: true, maxLength: 10000 },
  priority: { enum: ['high', 'medium', 'low'] },
};

export function validateQuestion(data: any) {
  const errors: string[] = [];
  
  if (!data.title || data.title.length > 100) {
    errors.push('タイトルは1-100文字で入力してください');
  }
  
  if (!data.content || data.content.length > 10000) {
    errors.push('内容は1-10000文字で入力してください');
  }
  
  return errors;
}
```

#### 5.2.2 ファイルアップロード検証
```typescript
export function validateFile(file: File): string[] {
  const errors: string[] = [];
  const maxSize = 1024 * 1024 * 1024; // 1GB
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif',
    'application/pdf', 'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    // その他許可形式
  ];
  
  if (file.size > maxSize) {
    errors.push('ファイルサイズは1GB以下にしてください');
  }
  
  if (!allowedTypes.includes(file.type)) {
    errors.push('対応していないファイル形式です');
  }
  
  return errors;
}
```

### 5.3 セキュリティヘッダー

#### 5.3.1 Next.js設定
```typescript
// next.config.js
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options', 
            value: 'nosniff',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline';",
          },
        ],
      },
    ];
  },
};
```

## 6. 開発・テスト設計

### 6.1 開発環境設定

#### 6.1.1 環境変数
```bash
# .env.local (開発環境)
COSMOS_DB_CONNECTION_STRING=AccountEndpoint=https://localhost:8081/...
COSMOS_DB_DATABASE_NAME=ShironoQA-Dev
AZURE_OPENAI_ENDPOINT=https://your-instance.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https...
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=nomhiro1204@gmail.com
SMTP_PASSWORD=gmail-app-password
SESSION_SECRET=your-super-secret-session-key
NEXTAUTH_URL=http://localhost:3000
NODE_ENV=development
```

### 6.2 テスト戦略

#### 6.2.1 TDD開発手法
- **Red-Green-Refactor** サイクルを厳守
- **テストカバレッジ**: 80%以上を目標
- **テストフレームワーク**: Jest + React Testing Library + Playwright

#### 6.2.2 テスト種別
- **単体テスト**: 各関数・コンポーネントの動作検証
- **統合テスト**: API⇔DB間の連携検証  
- **E2Eテスト**: ユーザーシナリオ全体の動作検証

#### 6.2.3 テストコマンド
```bash
npm test                # 単体テスト実行
npm run test:watch      # テスト監視モード (TDD用)
npm run test:e2e        # E2Eテスト実行
npm run test:coverage   # カバレッジレポート生成
npm run lint            # Lintチェック
npm run type-check      # TypeScript型チェック
```

## 7. 運用設計

### 7.1 監視・ログ

#### 7.1.1 Azure Monitor設定
- **メトリクス監視**: CPU、メモリ、レスポンス時間
- **ログ収集**: アプリケーションログ、エラーログ
- **アラート設定**: エラー率5%超過、レスポンス時間3秒超過

#### 7.1.2 ログ設計
```typescript
// lib/logger.ts
export const logger = {
  info: (message: string, data?: any) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      data,
      timestamp: new Date().toISOString(),
    }));
  },
  
  error: (message: string, error?: Error) => {
    console.error(JSON.stringify({
      level: 'error', 
      message,
      error: error?.stack,
      timestamp: new Date().toISOString(),
    }));
  },
};
```

### 7.2 バックアップ・復旧

#### 7.2.1 データバックアップ
- **Cosmos DB**: 自動バックアップ（7日間保持）
- **Blob Storage**: 地理冗長ストレージ (GRS)
- **設定情報**: App Service設定のエクスポート

#### 7.2.2 障害復旧手順
1. **データベース障害**: Cosmos DBポイントインタイム復元
2. **アプリケーション障害**: App Serviceの再起動・再デプロイ
3. **ファイル障害**: Blob Storageの冗長化による自動復旧

### 7.3 スケーリング設計

#### 7.3.1 パフォーマンス制限
- **同時接続数**: 最大20ユーザー
- **Cosmos DB RU**: 400 RU/s (手動スケーリング)
- **App Service**: B1プラン（必要に応じてスケールアップ）

#### 7.3.2 ボトルネック対策
- **データベース**: クエリ最適化、適切なインデックス設定
- **ファイルアップロード**: 非同期処理、進捗表示
- **AI機能**: レート制限、キャッシュ機能