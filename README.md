## 3. 機能要件
./README.mdを参照

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
| 権限レベル   | 機能                                       |
| ------------ | ------------------------------------------ |
| 一般ユーザー | 投稿、同グループ内投稿参照、コメント投稿   |
| 管理者       | 全機能利用可能、ユーザー管理、グループ管理 |

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