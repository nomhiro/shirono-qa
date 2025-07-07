# shiro Assistant 機能仕様書

**バージョン**: 2.1  
**作成日**: 2025年6月25日  
**最終更新**: 2025年7月4日  
**作成者**: システム開発担当者  

## 1. システム構成

### 1.1 技術スタック
- **フロントエンドとバックエンド**: Azure App Service
  - **フレームワーク**: Next.js ( App Router )
  - **UIライブラリ**: Material-UI (MUI) - ライトモード固定
- **データベース**: Azure Cosmos DB (ベクター検索機能を含む)
- **ファイルストレージ**: Azure Blob Storage
- **将来拡張**: Azure OpenAI GPT-4.1 + text-embedding-3-large
  - **リージョン**: Japan East
  - **モデル**: GPT-4.1 (gpt-4)
  - **埋め込みモデル**: text-embedding-3-large
- **認証**: 独自アカウント認証
- **通知**: Email通知機能

### 1.2 アーキテクチャ概要
```
[ユーザー] → [App Service] → [Cosmos DB]
                          → [Blob Storage]
                          → [Email Service]
                          → [将来拡張: Azure OpenAI]
```

## 2. 認証・セッション管理仕様

### 2.1 認証方式
- **認証方式**: Server-side session + HttpOnly Cookie
- **セッションストレージ**: Cosmos DB sessions コンテナ
- **セッション管理**:
  - セッショントークン: crypto.randomUUID() で生成
  - Cookieの設定: HttpOnly, Secure, SameSite=Strict
  - セッション更新: アクセス時に lastAccessedAt を更新
  - 自動ログアウト: 6時間無操作でセッション削除

### 2.2 パスワード管理
- **ハッシュ化**: bcrypt (salt rounds: 12)
- **パスワードリセット**: 一時トークン生成（24時間有効）
- **パスワードポリシー**:
  - 最小文字数: 8文字以上
  - 英数字必須（英字・数字の両方を含む）
  - 記号必須（!@#$%^&*等の特殊文字を含む）

### 2.3 セキュリティヘッダー
- Content-Security-Policy
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Strict-Transport-Security

## 3. API仕様

### 3.1 認証API

#### 3.1.1 ログイン
```
POST /api/auth/login
Content-Type: application/json

Request Body:
{
  "username": "string",
  "password": "string"
}

Response (200):
{
  "success": true,
  "user": {
    "id": "string",
    "username": "string",
    "email": "string",
    "groupId": "string",
    "isAdmin": "boolean"
  },
  "sessionToken": "string"
}

Response (401):
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "ユーザー名またはパスワードが正しくありません"
  }
}
```

#### 3.1.2 ログアウト
```
POST /api/auth/logout
Headers: Authorization: Bearer <sessionToken>

Response (200):
{
  "success": true
}
```

#### 3.1.3 セッション確認
```
GET /api/auth/me
Headers: Authorization: Bearer <sessionToken>

Response (200):
{
  "user": {
    "id": "string",
    "username": "string",
    "email": "string",
    "groupId": "string",
    "isAdmin": "boolean"
  }
}
```

### 3.2 投稿管理API

#### 3.2.1 投稿一覧取得
```
GET /api/questions
Query Parameters:
- page: number (optional, default: 1)
- limit: number (optional, default: 20)
- status: string (optional)
- priority: string (optional)
- authorId: string (optional)
- groupId: string (optional)
- search: string (optional)

Response (200):
{
  "questions": [
    {
      "id": "string",
      "title": "string",
      "content": "string",
      "authorId": "string",
      "authorName": "string",
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
  ],
  "total": "number",
  "page": "number",
  "limit": "number"
}
```

#### 3.2.2 投稿詳細取得
```
GET /api/questions/:id

Response (200):
{
  "question": {
    "id": "string",
    "title": "string",
    "content": "string",
    "authorId": "string",
    "authorName": "string",
    "groupId": "string",
    "status": "string",
    "priority": "string",
    "tags": ["string"],
    "attachments": [...],
    "createdAt": "datetime",
    "updatedAt": "datetime",
    "resolvedAt": "datetime"
  },
  "answers": [
    {
      "id": "string",
      "questionId": "string",
      "content": "string",
      "authorId": "string",
      "authorName": "string",
      "attachments": [...],
      "createdAt": "datetime"
    }
  ],
  "comments": [
    {
      "id": "string",
      "questionId": "string",
      "answerId": "string",
      "content": "string",
      "authorId": "string",
      "authorName": "string",
      "attachments": [...],
      "createdAt": "datetime"
    }
  ]
}
```

#### 3.2.3 投稿作成
```
POST /api/questions
Content-Type: application/json

Request Body:
{
  "title": "string",
  "content": "string",
  "priority": "string",
  "attachments": [
    {
      "fileName": "string",
      "fileSize": "number",
      "blobUrl": "string"
    }
  ]
}

Response (201):
{
  "question": {
    "id": "string",
    "title": "string",
    "content": "string",
    "authorId": "string",
    "groupId": "string",
    "status": "pending",
    "priority": "string",
    "tags": ["string"],
    "attachments": [...],
    "createdAt": "datetime",
    "updatedAt": "datetime"
  }
}
```

#### 3.2.4 投稿更新
```
PUT /api/questions/:id
Content-Type: application/json

Request Body:
{
  "title": "string",
  "content": "string",
  "priority": "string",
  "status": "string"
}

Response (200):
{
  "question": {
    ...
  }
}
```

#### 3.2.5 投稿削除
```
DELETE /api/questions/:id

Response (200):
{
  "success": true
}
```

### 3.3 ファイル管理API

#### 3.3.1 ファイルアップロード
```
POST /api/files/upload
Content-Type: multipart/form-data

Request Body:
- files: File[] (max 5 files, max 1GB each)

Response (200):
{
  "attachments": [
    {
      "fileName": "string",
      "fileSize": "number",
      "blobUrl": "string"
    }
  ]
}

Error Responses:
- 413: FILE_TOO_LARGE
- 400: VALIDATION_ERROR (too many files)
```

#### 3.3.2 ファイルダウンロード
```
GET /api/files/download/:filename

Response (200):
- File content with appropriate headers
```

### 3.4 回答・コメントAPI

#### 3.4.1 回答投稿
```
POST /api/questions/:id/answers
Content-Type: application/json

Request Body:
{
  "content": "string",
  "attachments": [...]
}

Response (201):
{
  "answer": {
    "id": "string",
    "questionId": "string",
    "content": "string",
    "authorId": "string",
    "attachments": [...],
    "createdAt": "datetime"
  }
}
```

#### 3.4.2 コメント投稿
```
POST /api/questions/:id/comments
Content-Type: application/json

Request Body:
{
  "content": "string",
  "answerId": "string",
  "attachments": [...]
}

Response (201):
{
  "comment": {
    "id": "string",
    "questionId": "string",
    "answerId": "string",
    "content": "string",
    "authorId": "string",
    "attachments": [...],
    "createdAt": "datetime"
  }
}
```

### 3.5 管理者API

#### 3.5.1 ユーザー管理
```
GET /api/admin/users
Response: { users: User[] }

POST /api/admin/users
Request: { username, email, password, groupId, isAdmin }
Response: { user: User }

PUT /api/admin/users/:id
Request: { username, email, groupId, isAdmin }
Response: { user: User }

DELETE /api/admin/users/:id
Response: { success: boolean }
```

#### 3.5.2 グループ管理
```
GET /api/admin/groups
Response: { groups: Group[] }

POST /api/admin/groups
Request: { name, description }
Response: { group: Group }

PUT /api/admin/groups/:id
Request: { name, description }
Response: { group: Group }

DELETE /api/admin/groups/:id
Response: { success: boolean }
```

### 3.6 検索API

#### 3.6.1 投稿検索
```
GET /api/questions/search
Query Parameters:
- q: string (キーワード)
- status: string (ステータス絞り込み)
- priority: string (優先度絞り込み)
- tags: string[] (タグ絞り込み)
- authorId: string (投稿者絞り込み)
- from: date (投稿日開始)
- to: date (投稿日終了)
- limit: number (取得件数)
- offset: number (オフセット)

Response (200):
{
  "questions": [
    {
      "id": "string",
      "title": "string",
      "content": "string",
      "authorName": "string",
      "status": "string",
      "priority": "string",
      "tags": ["string"],
      "createdAt": "datetime",
      "updatedAt": "datetime"
    }
  ],
  "total": "number",
  "hasMore": "boolean"
}
```

### 3.7 エラーレスポンス仕様

#### 3.7.1 エラーレスポンス形式
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "ユーザが理解できるエラーメッセージ",
    "details": {}
  }
}
```

#### 3.7.2 エラーコード一覧
- `UNAUTHORIZED`: 認証エラー
- `FORBIDDEN`: 権限エラー
- `NOT_FOUND`: リソースが見つからない
- `VALIDATION_ERROR`: 入力検証エラー
- `FILE_TOO_LARGE`: ファイルサイズ超過
- `RATE_LIMIT_EXCEEDED`: レート制限超過
- `INTERNAL_ERROR`: サーバー内部エラー

## 4. データ入力制限

### 4.1 文字数制限
- **投稿タイトル**: 100文字以内
- **投稿内容**: 10,000文字以内
- **回答内容**: 10,000文字以内
- **コメント内容**: 1,000文字以内
- **ユーザー名**: 50文字以内
- **グループ名**: 100文字以内

### 4.2 ファイル制限
- **1ファイルあたりの最大サイズ**: 1GB
- **1投稿あたりの最大ファイル数**: 5個
- **対応ファイル形式**: 
  - 画像: JPG, JPEG, PNG, GIF
  - 文書: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT
  - プログラム: JS, TS, PY, CS, JAVA, JSON, XML, YAML, MD 等

### 4.3 その他制限
- **同時ログインセッション数**: ユーザーあたり5セッション
- **API呼び出し制限**: ユーザーあたり1分間に100リクエスト
- **ファイルアップロード制限**: 1分間に10ファイル

## 5. 画面遷移仕様

### 5.1 画面一覧
1. **ログイン画面** (`/login`)
2. **投稿一覧画面** (`/`) - メイン画面
3. **投稿詳細画面** (`/questions/[id]`)
4. **新規投稿画面** (`/questions/new`)
5. **ユーザー管理画面** (`/admin/users`) - 管理者のみ
6. **グループ管理画面** (`/admin/groups`) - 管理者のみ
7. **プロフィール画面** (`/profile`)

### 5.2 画面遷移ルール
- **認証が必要な画面**: ログイン画面以外のすべて
- **管理者のみアクセス可能**: ユーザー管理、グループ管理画面
- **グループ制限**: 投稿詳細は同グループまたは管理者のみアクセス可能

### 5.3 レスポンシブ対応
- **ブレークポイント**:
  - モバイル: 〜767px
  - タブレット: 768px〜1023px
  - デスクトップ: 1024px〜

## 6. UI/UX仕様

### 6.1 ブランディング
- **サイト名**: shiro Assistant
- **アイコン**: しろくまの顔とチャットバブル（？マーク）
- **カラースキーム**: 
  - プライマリ: #1976d2 (青)
  - セカンダリ: #dc004e (赤)
  - 背景: #ffffff (白) - 固定
  - テキスト: #171717 (黒) - 固定

### 6.2 テーマ設定
- **テーマモード**: ライトモード固定
- **理由**: ダークモード設定時の表示問題を回避するため、常にライトモードで表示
- **Material-UI設定**: `mode: 'light'` で固定

### 6.3 フォント設定
- **メインフォント**: Geist Sans
- **モノスペースフォント**: Geist Mono
- **フォールバック**: Arial, Helvetica, sans-serif

### 6.4 アクセシビリティ
- **準拠レベル**: WCAG 2.1 AA
- **キーボードナビゲーション**: 全機能対応
- **スクリーンリーダー**: 適切なARIAラベル設定
- **コントラスト比**: 4.5:1以上

## 7. 通知仕様

### 7.1 メール通知設定
- **SMTP設定**: Gmail SMTP (smtp.gmail.com:587)
- **送信者**: nomhiro1204@gmail.com
- **認証**: Gmailアプリパスワード使用

### 7.2 通知テンプレート

#### 7.2.1 新規投稿通知（管理者宛）
```
件名: [shiro Assistant] 新しい質問が投稿されました

{投稿者名}さんから新しい質問が投稿されました。

タイトル: {投稿タイトル}
投稿者: {投稿者名}
投稿日時: {投稿日時}

詳細を確認: {投稿詳細URL}
```

#### 7.2.2 回答通知（投稿者宛）
```
件名: [shiro Assistant] あなたの質問に回答がありました

あなたの質問「{投稿タイトル}」に回答がありました。

回答者: {回答者名}
回答日時: {回答日時}

詳細を確認: {投稿詳細URL}
```

### 7.3 通知制限
- **送信制限**: 1日500通（Gmail制限）
- **重複送信防止**: 同一イベントの重複通知を防止
- **配信失敗時**: 3回まで再送信