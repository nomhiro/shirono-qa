# Shirono QA Site

技術支援・AI関連QAサイト - Next.js 15 + Azure サービス構成

## プロジェクト概要

転職後の個人的なQA受付サイト。元職場の同僚からの技術的な質問に対応するためのプラットフォーム。

### 技術スタック
- **フロントエンド・バックエンド**: Next.js 15 (App Router)
- **データベース**: Azure Cosmos DB
- **ファイルストレージ**: Azure Blob Storage  
- **AI機能**: Azure OpenAI (GPT-4 + text-embedding-3-large)
- **認証**: 独自アカウント認証
- **通知**: Email (Gmail SMTP)

## ローカル開発環境のセットアップ

### 1. 前提条件
- Node.js 18.x 以上
- npm

### 2. プロジェクトクローン・依存関係インストール
```bash
git clone <repository-url>
cd shirono-qa-app
npm install
```

### 3. 環境変数設定
プロジェクトルートに `.env.local` ファイルを作成し、以下の内容を設定：

```env
# Cosmos DB (開発時はモック)
COSMOS_DB_CONNECTION_STRING=mock://localhost
COSMOS_DB_DATABASE_NAME=ShironoQA-Dev

# Azure OpenAI (開発時はモック)
AZURE_OPENAI_ENDPOINT=mock://openai
AZURE_OPENAI_API_KEY=mock-key
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4
AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME=text-embedding-3-large

# Blob Storage (開発時はモック)
AZURE_STORAGE_CONNECTION_STRING=mock://storage
AZURE_STORAGE_CONTAINER_NAME=qa-attachments-dev

# Email (開発時はモック)
SMTP_HOST=mock://smtp
SMTP_PORT=587
SMTP_USER=mock@example.com
SMTP_PASSWORD=mock-password

# Session Secret (必須: 32文字以上のランダム文字列)
SESSION_SECRET=dev-secret-key-please-change-in-production-f8a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6

# Next.js設定
NEXTAUTH_URL=http://localhost:3000
NODE_ENV=development
```

**SESSION_SECRET生成方法:**
```bash
# ランダムな64文字の文字列を生成
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4. データベース初期化
```bash
npm run db:init
```

### 5. 接続テスト（任意）
```bash
npm run test:connections
```

### 6. 開発サーバー起動
```bash
npm run dev
```

アプリケーションは http://localhost:3000 で起動します。

### 7. テストアカウント
初期化後、以下のアカウントでログインできます：

| ユーザー名 | パスワード | 権限 |
|-----------|-----------|------|
| admin | AdminPass123! | 管理者 |
| alice | UserPass123! | 一般ユーザー |
| bob | UserPass123! | 一般ユーザー |
| carol | UserPass123! | 一般ユーザー |

## 利用可能なコマンド

### 開発・ビルド
```bash
npm run dev          # 開発サーバー起動
npm run build        # プロダクションビルド
npm start            # プロダクションサーバー起動
npm run lint         # ESLint実行
npm run type-check   # TypeScript型チェック
```

### テスト
```bash
npm test             # 単体テスト実行
npm run test:watch   # テスト監視モード
npm run test:coverage # テストカバレッジ
npm run test:e2e     # E2Eテスト実行
```

### データベース・接続テスト
```bash
npm run db:init           # データベース初期化
npm run test:connections  # Azure サービス接続テスト
```

## モック機能について

開発環境では、実際のAzureサービスなしでアプリケーションをテストできます：

- **Cosmos DB**: モック実装でCRUD操作をシミュレート
- **Azure OpenAI**: ダミーのAI応答を生成
- **Blob Storage**: ファイル操作をメモリ内でシミュレート
- **Email**: メール送信をコンソール出力

本番環境では環境変数を実際のAzureサービスの値に変更してください。

## プロジェクト構造

```
src/
├── app/                 # Next.js App Router
│   ├── api/            # API Routes
│   ├── globals.css     # グローバルスタイル
│   ├── layout.tsx      # ルートレイアウト
│   └── page.tsx        # ホームページ
├── components/         # Reactコンポーネント
├── hooks/             # カスタムフック
├── lib/               # ライブラリ・ユーティリティ
│   ├── cosmos.ts      # Cosmos DB操作
│   ├── openai.ts      # Azure OpenAI操作
│   ├── blob-storage.ts # Blob Storage操作
│   ├── email.ts       # Email送信
│   └── auth.ts        # 認証機能
├── types/             # TypeScript型定義
└── middleware.ts      # Next.js Middleware

scripts/               # 管理スクリプト
├── init-database.ts   # DB初期化
└── test-connections.ts # 接続テスト
```

## セキュリティ注意事項

1. **環境変数**: `.env.local` をGitにコミットしないでください
2. **SESSION_SECRET**: 本番環境では強固なランダム文字列を使用
3. **パスワード**: デフォルトパスワードを本番環境で変更
4. **アクセス制御**: グループベースのアクセス制御を適切に設定

## トラブルシューティング

### よくある問題

**1. データベース接続エラー**
```bash
npm run test:connections
```
で接続状態を確認してください。

**2. 環境変数が読み込まれない**
- `.env.local` ファイルがプロジェクトルートにあることを確認
- サーバーを再起動してください

**3. TypeScriptエラー**
```bash
npm run type-check
```
で型エラーを確認してください。

## 本番環境への配備

本番環境では以下の環境変数を実際のAzureサービスの値に設定してください：

```env
COSMOS_DB_CONNECTION_STRING=AccountEndpoint=https://...
AZURE_OPENAI_ENDPOINT=https://your-instance.openai.azure.com/
AZURE_OPENAI_API_KEY=your-actual-api-key
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;...
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-gmail@gmail.com
SMTP_PASSWORD=your-gmail-app-password
SESSION_SECRET=production-secret-64-character-random-string
```

詳細な配備手順については `README-DEPLOYMENT.md` を参照してください。

## ライセンス

Private project - All rights reserved

## サポート

技術的な質問や問題については、管理者にお問い合わせください。