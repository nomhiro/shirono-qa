# shiro Assistant 要件定義書
回答は常に日本語にしてください。
コメントは日本語で記載してください。

## 1. プロジェクト概要

### 1.1 目的
転職後の個人的な技術支援サイト「shiro Assistant」を構築し、元職場の同僚からの技術的な質問・検証依頼・調査依頼に対応する。

### 1.2 スコープ
- IT、AI、Azureに関する技術的な質問・検証依頼・調査依頼の受付と対応
- 元職場の同僚20名程度を対象とした限定的なサービス
- 投稿種別：質問、検証依頼、調査依頼、技術相談など

### 1.3 制約事項
- 元職場の業務に関わる機密情報の投稿は禁止
- 異なるAzureテナント環境での運用のため独自認証を使用
- 会社のMicrosoftアカウントや個人アカウントの使用は禁止。本システム用の独自アカウントを使用する。

## 2. システム構成

### 2.1 技術スタック
- **フロントエンドとバックエンド**: Azure App Service
  - **フレームワーク**: Next.js ( App Router )
  - **UIライブラリ**: Material-UI (MUI)
- **データベース**: Azure Cosmos DB (ベクター検索機能を含む)
- **ファイルストレージ**: Azure Blob Storage
- **AI機能**: Azure OpenAI GPT-4.1 + text-embedding-3-large
  - **リージョン**: Japan East
  - **モデル**: GPT-4.1 (gpt-4)
  - **埋め込みモデル**: text-embedding-3-large
- **認証**: 独自アカウント認証
- **通知**: Email通知機能

### 2.2 アーキテクチャ概要
```
[ユーザー] → [App Service] → [Cosmos DB (ベクター検索)]
                          → [Blob Storage]
                          → [Azure OpenAI (GPT-4.1 + Embedding)]
                          → [Email Service]
```

### 2.3 実装済み機能
- ✅ ユーザー認証・セッション管理
- ✅ 投稿機能（質問・検証依頼・調査依頼対応）
- ✅ 回答・コメント機能
- ✅ 投稿一覧・検索・フィルタリング
- ✅ ファイルアップロード・ダウンロード
- ✅ ユーザー管理・グループ管理（管理者機能）
- ✅ レスポンシブUI設計
- ✅ テスト駆動開発（TDD）による実装
- ✅ しろくまアイコン・ブランディング

## 3. 機能要件

### 3.1 ユーザー管理機能

#### 3.1.1 ユーザー登録・認証
- **概要**: 管理者による事前ユーザー登録と独自認証システム
- **詳細**:
  - 管理者が20名程度のユーザーを事前登録
  - ユーザー名・パスワードによる独自認証
  - パスワードリセット機能
  - セッション管理（6時間タイムアウト）

#### 3.1.2 グループ管理
- **概要**: ユーザーのグループ分けと権限管理
- **詳細**:
  - 管理者がグループを定義・管理
  - ユーザーをグループに割り当て
  - グループ内ユーザーは同グループの投稿を参照可能
  - 管理者は全投稿を参照可能

#### 3.1.3 ユーザー権限
| 権限レベル   | 機能                                             |
| ------------ | ------------------------------------------------ |
| 一般ユーザー | 投稿、同グループ内投稿参照、コメント投稿         |
| 管理者       | 全機能利用可能、ユーザー管理、グループ管理       |

### 3.2 投稿管理機能

#### 3.2.1 投稿機能
- **概要**: ユーザーが技術的な質問・検証依頼・調査依頼を投稿
- **投稿可能な内容**:
  - 技術的な質問（使い方、トラブルシューティングなど）
  - 検証依頼（「○○が動作するか確認してもらえますか」など）
  - 調査依頼（「○○の最新情報を調べてもらえますか」など）
  - IT、AI、Azureに関する相談事項
- **詳細**:
  - タイトル（必須、100文字以内）
  - 内容（必須、10,000文字以内）
  - 添付ファイル（任意、最大1GB/ファイル）
  - 優先度設定（高・中・低、デフォルト：中）
  - 投稿時にAIによる自動タグ付け

#### 3.2.2 投稿ステータス管理
- **ステータス一覧**:
  - 未回答：投稿直後の初期状態
  - 回答済み：管理者が回答を投稿した状態
  - 解決済み：投稿者が解決済みとマークした状態
  - 却下：管理者が投稿を却下した状態
  - クローズ：運用終了等で投稿を終了した状態

#### 3.2.3 添付ファイル管理
- **対応形式**: PDF、画像（JPG、PNG、GIF）、Officeファイル（Word、Excel、PowerPoint）、プログラムファイル（各種拡張子）
- **制限事項**:
  - 1ファイルあたり最大1GB
  - 1投稿あたりファイル数5個まで
  - Azure Blob Storageに永続保存

### 3.3 回答・コメント機能

#### 3.3.1 回答機能
- **概要**: 管理者が投稿に対して回答を提供
- **詳細**:
  - 回答内容（必須、10,000文字以内）
  - 添付ファイル対応（投稿と同様）
  - 回答投稿時にステータスを「回答済み」に更新

#### 3.3.2 コメント機能
- **概要**: 投稿・回答に対する追加コメント
- **詳細**:
  - 投稿者・管理者ともにコメント投稿可能
  - コメント内容（必須、1,000文字以内）
  - 添付ファイル対応
  - 階層構造なし（フラットな時系列表示）

### 3.4 検索・一覧機能

#### 3.4.1 投稿一覧
- **概要**: 投稿の一覧表示と検索機能
- **表示項目**:
  - 投稿タイトル
  - 投稿者
  - 投稿日時
  - ステータス
  - 優先度
  - タグ
  - 最終更新日時

#### 3.4.2 検索機能
- **検索条件**:
  - キーワード検索（タイトル・本文）
  - ステータス絞り込み
  - 優先度絞り込み
  - タグ絞り込み
  - 投稿者絞り込み
  - 投稿日期間絞り込み

#### 3.4.3 ソート機能
- 投稿日時（昇順・降順）
- 最終更新日時（昇順・降順）
- 優先度（高→低、低→高）

### 3.5 AI機能

#### 3.5.1 自動タグ付け
- **概要**: Azure OpenAI GPT-4.1による投稿の自動カテゴリ分類
- **タグカテゴリ**:
  - **Azureサービス**: App Service, Functions, Storage, SQL Database, Cosmos DB, Active Directory, Virtual Machines, Kubernetes Service, DevOps, Monitor, Security Center 等
  - **プログラミング言語**: C#, Python, JavaScript, TypeScript, Java, PowerShell, ARM Template, Bicep 等
  - **技術分野**: AI/ML, データ分析, セキュリティ, ネットワーク, インフラ 等

#### 3.5.2 タグ付けロジック
- 投稿タイトルと本文を分析
- 複数タグの付与可能
- 管理者による手動タグ編集可能

### 3.6 通知機能

#### 3.6.1 メール通知
- **通知対象者**: 投稿者と管理者
- **通知タイミング**:
  - 投稿時：管理者に通知
  - 回答投稿時：投稿者に通知
  - コメント追加時：投稿者と管理者に通知
  - 解決済みマーク時：管理者と投稿者に通知
  - 却下時：管理者と投稿者に通知

#### 3.6.2 通知内容
- 件名：[shiro Assistant] アクション内容
- 本文：投稿タイトル、投稿者、リンクURL
- HTML形式での送信
- nomhiro1204@gmail.comを送信元アドレスとする

## 4. 非機能要件

### 4.1 性能要件
- **レスポンス時間**: 一般的な操作で3秒以内
- **同時接続数**: 最大20ユーザー
- **ファイルアップロード**: 1GBファイルで10分以内

### 4.2 可用性要件
- **稼働率**: 99%以上（月間）
- **メンテナンス時間**: 月1回、2時間以内

### 4.3 セキュリティ要件
- **認証**: 独自アカウント認証（セッション管理）
- **セッション管理**: 
  - セッションタイムアウト: 6時間
  - セッションIDの定期更新
  - ログアウト時のセッション破棄
- **パスワードポリシー**:
  - 最小文字数: 8文字以上
  - 英数字必須（英字・数字の両方を含む）
  - 記号必須（!@#$%^&*等の特殊文字を含む）
  - パスワードハッシュ化（bcrypt使用）
- **通信**: HTTPS必須
- **データ保護**: 保存データの暗号化
- **アクセス制御**: グループベースのアクセス制御
- **環境変数管理**: App Serviceの環境変数設定（開発時は.env.local）

#### 4.3.1 認証・セッション実装詳細
- **認証方式**: Server-side session + HttpOnly Cookie
- **セッションストレージ**: Cosmos DB sessions コンテナ
- **セッション管理**:
  - セッショントークン: crypto.randomUUID() で生成
  - Cookieの設定: HttpOnly, Secure, SameSite=Strict
  - セッション更新: アクセス時に lastAccessedAt を更新
  - 自動ログアウト: 6時間無操作でセッション削除
- **パスワード管理**:
  - ハッシュ化: bcrypt (salt rounds: 12)
  - パスワードリセット: 一時トークン生成（24時間有効）
- **セキュリティヘッダー**:
  - Content-Security-Policy
  - X-Frame-Options: DENY
  - X-Content-Type-Options: nosniff
  - Strict-Transport-Security

### 4.4 運用要件
- **運用期間**: 1年間
- **ログ保存**: 3ヶ月間
- **監視**: Azure Monitor による監視

## 5. データ設計

### 5.1 主要エンティティ

#### 5.1.1 ユーザー (Users)
```json
{
  "id": "string",
  "username": "string",
  "email": "string",
  "passwordHash": "string",
  "groupId": "string",
  "isAdmin": "boolean",
  "createdAt": "datetime",
  "lastLoginAt": "datetime"
}
```

#### 5.1.2 グループ (Groups)
```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "createdAt": "datetime"
}
```

#### 5.1.3 投稿 (Questions)
```json
{
  "id": "string",
  "title": "string",
  "content": "string",
  "authorId": "string",
  "groupId": "string",
  "status": "string",
  "priority": "string",
  "tags": ["string"],
  "attachments": [
    {
      "fileName": "string",
      "fileSize": "number",
      "blobUrl": "string"
    }
  ],
  "createdAt": "datetime",
  "updatedAt": "datetime",
  "resolvedAt": "datetime"
}
```

#### 5.1.4 回答 (Answers)
```json
{
  "id": "string",
  "questionId": "string",
  "content": "string",
  "authorId": "string",
  "attachments": [
    {
      "fileName": "string",
      "fileSize": "number",
      "blobUrl": "string"
    }
  ],
  "createdAt": "datetime"
}
```

#### 5.1.5 コメント (Comments)
```json
{
  "id": "string",
  "questionId": "string",
  "answerId": "string",
  "content": "string",
  "authorId": "string",
  "attachments": [
    {
      "fileName": "string",
      "fileSize": "number",
      "blobUrl": "string"
    }
  ],
  "createdAt": "datetime"
}
```

#### 5.1.6 セッション (Sessions)
```json
{
  "id": "string",
  "userId": "string",
  "sessionToken": "string",
  "expiresAt": "datetime",
  "createdAt": "datetime",
  "lastAccessedAt": "datetime"
}
```

### 5.2 データベース設計詳細

#### 5.2.1 Cosmos DB コンテナ構成
- **データベース名**: ShironoQA
- **コンテナ一覧**:
  - `users` (パーティションキー: `/id`)
  - `groups` (パーティションキー: `/id`)
  - `questions` (パーティションキー: `/groupId`)
  - `answers` (パーティションキー: `/questionId`)
  - `comments` (パーティションキー: `/questionId`)
  - `sessions` (パーティションキー: `/userId`)

#### 5.2.2 インデックス設計
- **questions コンテナ**:
  - `/authorId` (複合インデックス)
  - `/status` (複合インデックス)
  - `/priority` (複合インデックス)
  - `/createdAt` (範囲インデックス)
  - `/tags/*` (配列インデックス)
- **users コンテナ**:
  - `/username` (一意インデックス)
  - `/email` (一意インデックス)
- **sessions コンテナ**:
  - `/sessionToken` (一意インデックス)
  - `/expiresAt` (範囲インデックス、TTL設定)

#### 5.2.3 ベクター検索設定
- **ベクターフィールド**: `questions.contentVector`
- **次元数**: 3072 (text-embedding-3-large)
- **距離メトリック**: コサイン類似度
- **インデックスタイプ**: diskANN

### 5.3 API設計

#### 5.3.1 認証API
```
POST /api/auth/login
  Body: { username: string, password: string }
  Response: { success: boolean, user: User, sessionToken: string }

POST /api/auth/logout
  Headers: { Authorization: Bearer <sessionToken> }
  Response: { success: boolean }

POST /api/auth/refresh
  Headers: { Authorization: Bearer <sessionToken> }
  Response: { success: boolean, sessionToken: string }

GET /api/auth/me
  Headers: { Authorization: Bearer <sessionToken> }
  Response: { user: User }
```

#### 5.3.2 投稿管理API
```
GET /api/questions
  Query: { page?, limit?, status?, priority?, authorId?, groupId?, search? }
  Response: { questions: Question[], total: number, page: number }

GET /api/questions/:id
  Response: { question: Question, answers: Answer[], comments: Comment[] }

POST /api/questions
  Body: { title: string, content: string, priority: string, attachments?: File[] }
  Response: { question: Question }

PUT /api/questions/:id
  Body: { title?: string, content?: string, priority?: string, status?: string }
  Response: { question: Question }

DELETE /api/questions/:id
  Response: { success: boolean }

POST /api/questions/:id/attachments
  Body: FormData with files
  Response: { attachments: Attachment[] }
```

#### 5.3.3 回答・コメントAPI
```
POST /api/questions/:id/answers
  Body: { content: string, attachments?: File[] }
  Response: { answer: Answer }

POST /api/questions/:id/comments
  Body: { content: string, answerId?: string, attachments?: File[] }
  Response: { comment: Comment }

PUT /api/answers/:id
  Body: { content: string }
  Response: { answer: Answer }

DELETE /api/answers/:id
  Response: { success: boolean }
```

#### 5.3.4 ユーザー・グループ管理API (管理者のみ)
```
GET /api/admin/users
  Response: { users: User[] }

POST /api/admin/users
  Body: { username: string, email: string, password: string, groupId: string, isAdmin?: boolean }
  Response: { user: User }

PUT /api/admin/users/:id
  Body: { username?: string, email?: string, groupId?: string, isAdmin?: boolean }
  Response: { user: User }

GET /api/admin/groups
  Response: { groups: Group[] }

POST /api/admin/groups
  Body: { name: string, description: string }
  Response: { group: Group }
```

#### 5.3.5 検索・AI機能API
```
GET /api/questions/search
  Query: { q: string, limit?: number }
  Response: { questions: Question[], suggestions: string[] }

POST /api/ai/auto-tag
  Body: { title: string, content: string }
  Response: { tags: string[] }

GET /api/questions/:id/similar
  Response: { questions: Question[] }
```

#### 5.3.6 エラーレスポンス形式
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "ユーザが理解できるエラーメッセージと、必要であればユーザアクション",
    "details": {}
  }
}
```

#### 5.3.7 エラーコード一覧
- `UNAUTHORIZED`: 認証エラー
- `FORBIDDEN`: 権限エラー
- `NOT_FOUND`: リソースが見つからない
- `VALIDATION_ERROR`: 入力検証エラー
- `FILE_TOO_LARGE`: ファイルサイズ超過
- `RATE_LIMIT_EXCEEDED`: レート制限超過
- `INTERNAL_ERROR`: サーバー内部エラー

## 6. 画面設計

### 6.1 画面一覧
1. **ログイン画面**
2. **投稿一覧画面**（メイン画面）
3. **投稿詳細・Q&A画面**（統合画面）
4. **新規投稿画面**
5. **ユーザー管理画面**（管理者のみ）
6. **グループ管理画面**（管理者のみ）
7. **プロフィール画面**

### 6.2 主要画面の機能

#### 6.2.1 投稿一覧画面
- 投稿リストの表示
- 検索・フィルタリング機能
- ページネーション
- 新規投稿ボタン
- ステータス・優先度の視覚的表示

#### 6.2.2 新規投稿画面
- **投稿種別の明示**:
  - 技術的な質問（使い方、トラブルシューティングなど）
  - 検証依頼（「○○が動作するか確認してもらえますか」など）
  - 調査依頼（「○○の最新情報を調べてもらえますか」など）
  - IT、AI、Azureに関する相談事項
- **入力フォーム**:
  - タイトル・内容の入力
  - 優先度設定
  - ファイルアップロード機能
  - 投稿・キャンセルボタン

#### 6.2.3 投稿詳細・Q&A画面（統合画面）
- **投稿表示モード**:
  - 投稿タイトル・内容の表示
  - 投稿者・投稿日時・ステータス情報
  - タグ・優先度の表示
  - 添付ファイルのダウンロード機能
  - 編集ボタン（投稿者のみ）
- **投稿編集モード**:
  - インライン編集フォーム
  - タイトル・内容・優先度の編集
  - ファイルの追加・削除
  - 保存・キャンセルボタン
- **回答・コメントセクション**:
  - 既存回答・コメントの表示
  - 新規回答・コメント投稿フォーム
  - 時系列表示（フラット構造）
  - ステータス変更ボタン（管理者・投稿者）

#### 6.2.4 画面モード遷移
- **一覧画面から投稿詳細**: 投稿タイトルクリックで表示モードで開く
- **新規投稿**: 「新規投稿」ボタンで投稿画面へ遷移
- **編集モード**: 投稿詳細画面の「編集」ボタンで編集モードに切り替え
- **モード間の切り替え**: シームレスなUIでスムーズな操作性を提供

### 6.3 ブランディング・UI
- **サイト名**: shiro Assistant
- **アイコン**: しろくまの顔とチャットバブル（？マーク）
- **カラースキーム**: 青系統（信頼感・技術感）
- **レスポンシブデザイン**: モバイル・タブレット・PC対応
- **アクセシビリティ**: WCAG 2.1 AA準拠

## 7. 運用・保守

### 7.1 運用体制
- **運用責任者**: 1名（システム構築者）

### 7.2 保守項目
- **定期メンテナンス**: 月1回
- **セキュリティアップデート**: 随時
- **利用状況監視**: 週次レポート

### 7.3 課金管理
- Azure Portalでの手動管理

## 8. 制約・リスク

### 8.1 技術的制約
- Azure App Service の制約事項
- Azure Functions の実行時間制限
- Cosmos DB の RU制限
- Cosmos DB ベクター検索の性能制限
- text-embedding-3-large の利用制限（1分あたりのリクエスト数）

### 8.2 運用リスク
- 単一運用者によるリスク
- 機密情報投稿のリスク
- 1年後のデータ移行・削除

### 8.3 対応策
- 詳細な運用マニュアルの作成
- 利用規約の明確化
- データエクスポート機能の実装

## 9. 初期データ設定

### 9.1 管理者アカウント
- **初期管理者**:
  - メールアドレス: nomhiro1204@gmail.com
  - ユーザー名: admin
  - パスワード: 初期設定時に設定（パスワードポリシーに準拠）
  - 権限: 管理者

### 9.2 初期グループ設定
- **グループ名**: TS-AI
- **説明**: 技術支援・AI関連グループ
- **初期メンバー**: 管理者アカウント

### 9.3 環境変数設定
- **Azure OpenAI設定**:
  - AZURE_OPENAI_ENDPOINT
  - AZURE_OPENAI_API_KEY
  - AZURE_OPENAI_DEPLOYMENT_NAME
- **Cosmos DB設定**:
  - COSMOS_DB_CONNECTION_STRING
  - COSMOS_DB_DATABASE_NAME
- **Blob Storage設定**:
  - AZURE_STORAGE_CONNECTION_STRING
  - AZURE_STORAGE_CONTAINER_NAME
- **Email設定**:
  - SMTP_HOST: smtp.gmail.com
  - SMTP_PORT: 587
  - SMTP_USER: nomhiro1204@gmail.com
  - SMTP_PASSWORD: Gmailアプリパスワード
- **セッション設定**:
  - SESSION_SECRET

### 9.4 開発・テスト環境設定

#### 9.4.1 ローカル開発環境
- **Node.js バージョン**: 18.x 以上
- **パッケージマネージャー**: npm
- **開発サーバー**: Next.js dev server (port: 3000)
- **環境変数ファイル**: `.env.local`

#### 9.4.2 .env.local 設定例
```env
# Cosmos DB
COSMOS_DB_CONNECTION_STRING=AccountEndpoint=https://localhost:8081/;AccountKey=C2y6yDjf5...
COSMOS_DB_DATABASE_NAME=ShironoQA-Dev

# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://your-instance.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4

# Blob Storage
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...
AZURE_STORAGE_CONTAINER_NAME=qa-attachments-dev

# Email (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=nomhiro1204@gmail.com
SMTP_PASSWORD=your-gmail-app-password

# Session
SESSION_SECRET=your-super-secret-session-key-for-development

# Next.js
NEXTAUTH_URL=http://localhost:3000
NODE_ENV=development
```

#### 9.4.3 テスト設定・TDD開発手法
- **開発手法**: テスト駆動開発（TDD）を採用
- **テストフレームワーク**: Jest + React Testing Library
- **E2Eテスト**: Playwright
- **テストカバレッジ**: 80%以上を達成
- **テストコマンド**:
  - `npm test`: 単体テスト実行
  - `npm run test:watch`: テスト監視モード（TDD用）
  - `npm run test:e2e`: E2Eテスト実行
  - `npm run test:coverage`: カバレッジレポート生成

#### 9.4.4 TDD開発サイクル
**Red-Green-Refactor サイクルを厳守**:

1. **🔴 Red Phase (失敗するテストを書く)**:
   ```bash
   # まず失敗するテストを作成
   npm run test:watch
   ```
   - 機能要件に基づいてテストケースを先に実装
   - テストが失敗することを確認
   - 最小限のテストから開始

2. **🟢 Green Phase (テストを通す最小コード)**:
   - テストが通る最小限のコードを実装
   - 美しいコードは書かない（動くことを優先）
   - テストが緑になることを確認

3. **🔵 Refactor Phase (コードを改善)**:
   - テストが通った状態でコードを改善
   - パフォーマンス最適化
   - コードの可読性向上
   - 重複排除

#### 9.4.5 実装完了機能
**全機能をTDDサイクルで実装完了**:

1. **✅ フェーズ1: 認証機能**
   - ユーザーログイン/ログアウト
   - セッション管理
   - パスワード検証

2. **✅ フェーズ2: 投稿管理機能**
   - 投稿CRUD操作
   - バリデーション
   - ファイルアップロード

3. **✅ フェーズ3: 回答・コメント機能**
   - 回答投稿
   - コメント投稿
   - ステータス管理

4. **✅ フェーズ4: 検索・UI機能**
   - キーワード検索
   - フィルタリング
   - レスポンシブUI

5. **✅ フェーズ5: 管理者機能**
   - ユーザー管理
   - グループ管理

#### 9.4.6 テストケース設計方針
- **単体テスト**: 各関数・コンポーネントの動作検証
- **統合テスト**: API⇔DB間の連携検証
- **E2Eテスト**: ユーザーシナリオ全体の動作検証
- **境界値テスト**: 入力値の上限・下限値テスト
- **エラーケーステスト**: 異常系の動作検証

#### 9.4.7 テストファイル命名規則
```
src/
├── components/
│   ├── LoginForm.tsx
│   └── __tests__/
│       └── LoginForm.test.tsx
├── pages/api/
│   ├── auth/login.ts
│   └── __tests__/
│       └── login.test.ts
└── lib/
    ├── auth.ts
    └── __tests__/
        └── auth.test.ts
```

#### 9.4.8 TDD開発ルール
1. **テストなしのコード追加禁止**
2. **失敗するテストが無い限り、プロダクションコードを書かない**
3. **テストを通すために必要以上のコードを書かない**
4. **リファクタリング時はテストが通った状態を維持**
5. **コミット前に全テストが通ることを確認**

#### 9.4.9 コード品質・Lint ルール
**Lintでのチェック時にWarningにならないように以下のルールを厳守**:

1. **型安全性の徹底**:
   - `any`型の使用禁止（`unknown`型を使用）
   - 明示的な型注釈を使用
   - 型アサーションは必要最小限に留める

2. **変数・関数の命名規則**:
   - 未使用変数は削除または先頭にアンダースコア（`_variable`）
   - 明確で説明的な変数名を使用
   - camelCase命名規則の徹底

3. **ESLint警告対応**:
   - コンソールログの最小限使用（下記ルール参照）
   - 未使用のimportは削除
   - 非同期処理のawaitを適切に使用

#### 9.4.10 コンソールログ使用ルール
**必要最小限の原則で以下の場合のみ使用**:

1. **エラーログ（必須）**:
   - `console.error()`: 例外・エラー発生時
   - `console.warn()`: 警告が必要な異常状態

2. **重要な成功ログ（限定的）**:
   - ユーザー認証成功
   - 重要な処理完了（メール送信成功など）
   - データベース接続確立

3. **デバッグログ（開発時のみ、本番では削除）**:
   - `console.log()`: 一時的なデバッグ用途
   - 本番デプロイ前に必ず削除

4. **禁止するログ**:
   - API呼び出しの詳細パラメータ
   - データベースクエリの詳細
   - 正常フローの途中経過
   - キャッシュヒット/ミスの通知
   - 関数の開始/終了通知

5. **ログレベル指針**:
   ```typescript
   // ✅ 良い例
   console.error('Failed to send email:', error)
   console.warn('Cache expired, refreshing data')
   
   // ❌ 悪い例
   console.log('Getting questions with query:', queryData)
   console.log('Questions result:', result)
   console.log('User logged in:', username)
   ```

4. **TypeScript固有のルール**:
   - インターフェースとtypeの適切な使い分け
   - Genericsの適切な使用
   - nullish coalescing（`??`）とoptional chaining（`?.`）の活用

5. **React/Next.js固有のルール**:
   - useEffectの依存配列を適切に設定
   - key propを適切に設定
   - コンポーネントの適切なメモ化

6. **エラーハンドリング**:
   - 例外処理の適切な実装
   - エラー型の明示的な定義
   - 非同期処理のエラーハンドリング

#### 9.4.11 Lintコマンド
```bash
# Lint実行
npm run lint

# Lint自動修正
npm run lint:fix

# 型チェック
npm run type-check

# 全チェック（Lint + 型チェック + テスト）
npm run check-all
```

#### 9.4.12 テストデータ
- **初期テストデータ**: `/scripts/seed-data.js`
- **テストユーザー**:
  - 管理者: testadmin / TestPass123!
  - 一般ユーザー: testuser1 / TestPass123!
- **テスト用グループ**: Test-Group
- **サンプル投稿**: 10件のサンプル投稿データ

#### 9.4.13 開発用コマンド
```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 本番サーバー起動
npm start

# リント
npm run lint

# 型チェック
npm run type-check

# データベース初期化
npm run db:seed

# テストデータ投入
npm run test:seed
```

### 9.5 Gmail SMTP設定手順
1. Googleアカウントに2段階認証を有効化
2. アプリパスワードを生成：
   - Googleアカウント > セキュリティ > アプリパスワード
   - アプリを選択: 「その他」で「shiro Assistant」と入力
3. 生成された16桁のパスワードをSMTP_PASSWORDに設定
4. 送信制限: 1日500通（本システムでは十分）

## 10. システム開発完了状況

### 10.1 実装完了機能
- ✅ **認証・セッション管理**: 独自認証、6時間セッション、セキュリティ対応完了
- ✅ **投稿管理**: 質問・検証依頼・調査依頼対応の投稿機能完了
- ✅ **回答・コメント**: 管理者回答、ユーザーコメント機能完了
- ✅ **ファイル管理**: Azure Blob Storage連携、アップロード・ダウンロード完了
- ✅ **検索・フィルタ**: キーワード検索、ステータス絞り込み完了
- ✅ **管理者機能**: ユーザー管理、グループ管理完了
- ✅ **UI/UX**: Material-UI、レスポンシブデザイン、しろくまブランディング完了
- ✅ **テスト**: TDD開発、Jest+React Testing Library、Playwright E2E完了

### 10.2 品質保証
- **テストカバレッジ**: 80%以上達成
- **E2Eテスト**: 主要ユーザーシナリオ全パス
- **セキュリティ**: 認証・認可・セッション管理適切に実装
- **パフォーマンス**: レスポンス時間要件クリア
- **アクセシビリティ**: 基本的なアクセシビリティ対応完了

### 10.3 残課題・今後の拡張
- **AI機能**: 自動タグ付け機能（Azure OpenAI連携）
- **メール通知**: SMTP設定完了後の通知機能実装
- **ベクター検索**: Cosmos DB ベクター検索機能
- **詳細検索**: 高度な検索・フィルタリング機能
- **レポート機能**: 利用統計・分析機能

## 11. 今後の拡張性

### 11.1 機能拡張候補
- FAQ機能
- 回答の評価機能
- より高度な検索機能
- モバイルアプリ対応
- チャット機能の多言語対応
- ファイル内容の音声読み上げ

### 11.2 技術的拡張
- マルチテナント対応
- API公開
- 他システム連携

---

**作成日**: 2025年6月25日  
**最終更新**: 2025年7月2日  
**作成者**: システム開発担当者  
**バージョン**: 2.0（システム開発完了版）