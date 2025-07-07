# shiro Assistant

技術質問・検証依頼サイト - IT、AI、Azureに関する質問・検証依頼の受付

## 📋 プロジェクト概要

**shiro Assistant**は、転職後の個人的な技術支援サイトとして、元職場の同僚からの技術的な質問・検証依頼・調査依頼に対応するWebアプリケーションです。

### 主な機能
- 技術的な質問・検証依頼・調査依頼の投稿
- 管理者による回答・サポート
- ファイル添付機能（最大1GB/ファイル）
- 手動タグ付け機能
- メール通知機能
- グループベースのアクセス制御

## 🚀 技術スタック

- **Frontend/Backend**: Next.js 14 (App Router)
- **UI Library**: Material-UI (MUI) v5 - ライトモード固定
- **Database**: Azure Cosmos DB
- **File Storage**: Azure Blob Storage  
- **将来拡張**: Azure OpenAI (GPT-4.1, text-embedding-3-large)
- **Authentication**: 独自セッション認証
- **Email**: Gmail SMTP
- **Hosting**: Azure App Service

## 📚 ドキュメント

詳細な仕様については以下のドキュメントを参照してください：

- [要件定義書](./docs/01-requirements.md) - プロジェクトの目的、スコープ、機能要件
- [機能仕様書](./docs/02-specifications.md) - API仕様、データ制限、画面遷移
- [システム設計書](./docs/03-design.md) - アーキテクチャ、データベース設計、セキュリティ

## 🛠️ 開発環境セットアップ

### 前提条件
- Node.js 18.x 以上
- npm
- Azure アカウント（Cosmos DB、Blob Storage、OpenAI Service）

### インストール手順

1. **リポジトリのクローン**
```bash
git clone https://github.com/nomhiro/shirono-qa.git
cd shirono-qa/shirono-qa-app
```

2. **依存関係のインストール**
```bash
npm install
```

3. **環境変数の設定**
```bash
cp .env.example .env.local
# .env.localファイルを編集して必要な環境変数を設定
```

4. **開発サーバーの起動**
```bash
npm run dev
```

ブラウザで http://localhost:3000 にアクセス

### 環境変数設定例

```env
# Cosmos DB
COSMOS_DB_CONNECTION_STRING=AccountEndpoint=https://your-account.documents.azure.com:443/;AccountKey=your-key
COSMOS_DB_DATABASE_NAME=ShironoQA-Dev

# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://your-instance.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4

# Azure Blob Storage
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=your-account;AccountKey=your-key
AZURE_STORAGE_CONTAINER_NAME=qa-attachments-dev

# Email (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-gmail-app-password

# Session
SESSION_SECRET=your-super-secret-session-key-for-development

# Next.js
NEXTAUTH_URL=http://localhost:3000
NODE_ENV=development
```

## 🧪 テスト

本プロジェクトはTDD（テスト駆動開発）で開発されています。

### テストコマンド
```bash
# 単体テスト実行
npm test

# テスト監視モード (TDD用)
npm run test:watch

# E2Eテスト実行  
npm run test:e2e

# カバレッジレポート生成
npm run test:coverage

# Lintチェック
npm run lint

# TypeScript型チェック
npm run type-check
```

### テストカバレッジ
- **目標**: 80%以上
- **実装済み**: 主要機能のテストケース完備

## 📦 デプロイ

### Azure App Service へのデプロイ

1. **ビルド**
```bash
npm run build
```

2. **Azure App Service の設定**
- App Service プランの作成
- 環境変数の設定
- デプロイメント設定

3. **デプロイ実行**
```bash
# GitHub Actions または手動デプロイ
npm start
```

## 🔧 開発ガイドライン

### コード品質
- **型安全性**: TypeScript strict mode
- **Linting**: ESLint + Prettier
- **コミット前チェック**: Husky + lint-staged

### 命名規則
- **ファイル**: PascalCase (コンポーネント), camelCase (その他)
- **変数・関数**: camelCase
- **定数**: UPPER_SNAKE_CASE
- **型・インターフェース**: PascalCase

### TDD開発ルール
1. 失敗するテストを先に書く (Red)
2. テストを通す最小コードを実装 (Green)  
3. コードを改善・リファクタリング (Refactor)

## 🔒 セキュリティ

- **認証**: 独自セッション認証（6時間タイムアウト）
- **パスワード**: bcrypt ハッシュ化（salt rounds: 12）
- **通信**: HTTPS必須
- **Cookie**: HttpOnly, Secure, SameSite=Strict
- **ファイルアップロード**: サイズ・形式制限、ウイルススキャン

## 📈 運用・監視

- **監視**: Azure Monitor
- **ログ**: JSON構造化ログ
- **バックアップ**: Cosmos DB自動バックアップ（7日間）
- **可用性**: 99%以上（月間）

## 🤝 コントリビューション

1. イシューの作成
2. フィーチャーブランチの作成
3. TDDでの実装
4. テスト・Lintの実行
5. プルリクエストの作成

## 📝 ライセンス

このプロジェクトは私的利用のためのものです。

## 👥 コンタクト

- **開発者**: システム開発担当者
- **Email**: nomhiro1204@gmail.com
- **運用期間**: 1年間（2025年6月〜2026年6月）

## 🎯 運用状況

### 実装完了機能 ✅
- ユーザー認証・セッション管理
- 投稿・回答・コメント機能
- ファイルアップロード・ダウンロード
- 検索・フィルタリング機能
- 管理者機能（ユーザー・グループ管理）
- レスポンシブUI（ライトモード固定）
- テスト駆動開発による品質保証

### 今後の拡張予定 🔮
- メール通知機能
- 詳細な分析・レポート機能
- データエクスポート機能
- AI機能（将来検討: 自動タグ付け、類似投稿検索）