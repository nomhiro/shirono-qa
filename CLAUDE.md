# shiro Assistant プロジェクト指針書
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
  - **フレームワーク**: Next.js 14 ( App Router )
  - **UIライブラリ**: Material-UI (MUI) v5 - **ライトモード固定**
  - **言語**: TypeScript (strict mode)
  - **状態管理**: React Hooks
- **データベース**: Azure Cosmos DB (ベクター検索機能を含む)
- **ファイルストレージ**: Azure Blob Storage
- **将来拡張**: Azure OpenAI GPT-4.1 + text-embedding-3-large
  - **リージョン**: Japan East
  - **モデル**: GPT-4.1 (gpt-4)
  - **埋め込みモデル**: text-embedding-3-large
- **認証**: 独自アカウント認証（セッション管理）
- **通知**: Email通知機能（Gmail SMTP）
- **テスト**: Jest + React Testing Library + Playwright

### 2.2 アーキテクチャ概要
```
[ユーザー] → [App Service] → [Cosmos DB]
                          → [Blob Storage]
                          → [Email Service]
                          → [将来拡張: Azure OpenAI]
```

### 2.3 実装完了機能（100%完成）
- ✅ **認証・セッション管理**: 独自認証、6時間セッション、セキュリティ対応完了
- ✅ **投稿管理**: 質問・検証依頼・調査依頼対応の投稿機能完了
- ✅ **回答・コメント**: 管理者回答、ユーザーコメント機能完了
- ✅ **ファイル管理**: Azure Blob Storage連携、アップロード・ダウンロード完了
- ✅ **検索・フィルタ**: キーワード検索、ステータス絞り込み完了
- ✅ **管理者機能**: ユーザー管理、グループ管理完了
- ✅ **UI/UX**: Material-UI、レスポンシブデザイン、ライトモード固定、しろくまブランディング完了
- ✅ **テスト**: TDD開発、Jest+React Testing Library、Playwright E2E完了
- ✅ **品質保証**: 80%以上のテストカバレッジ、Lint・型チェック完了

## 3. 詳細仕様参照

詳細な仕様については以下のドキュメントを参照してください：

- **[要件定義書](./docs/01-requirements.md)**: プロジェクトの目的、スコープ、機能要件・非機能要件
- **[機能仕様書](./docs/02-specifications.md)**: API仕様、データ制限、画面遷移、UI/UX仕様
- **[システム設計書](./docs/03-design.md)**: アーキテクチャ、データベース設計、セキュリティ設計
- **[README.md](./README.md)**: 開発環境セットアップ、テスト・デプロイ手順

## 4. 重要な実装方針

### 4.1 UI/UXテーマ設定（重要）
- **テーマモード**: **ライトモード固定**
- **理由**: ダークモード設定時の表示問題を回避するため、常にライトモードで表示
- **Material-UI設定**: `mode: 'light'` で固定、ダークモード検知を無効化
- **実装場所**: `src/components/ThemeProvider.tsx`

### 4.2 テスト駆動開発（TDD）
- **開発手法**: Red-Green-Refactor サイクルを厳守
- **テストカバレッジ**: 80%以上を達成
- **テストフレームワーク**: Jest + React Testing Library + Playwright

### 4.3 コード品質基準
- **型安全性**: TypeScript strict mode、`any`型使用禁止
- **Lint**: ESLint + Prettier、警告ゼロを維持
- **命名規則**: camelCase（変数・関数）、PascalCase（コンポーネント・型）

### 4.4 セキュリティ方針
- **認証**: 独自セッション認証（6時間タイムアウト）
- **パスワード**: bcrypt ハッシュ化（salt rounds: 12）
- **Cookie**: HttpOnly, Secure, SameSite=Strict
- **環境変数**: Azure App Service設定、開発時は.env.local

## 5. 開発・運用コマンド

### 5.1 基本コマンド
```bash
# 開発サーバー起動
npm run dev

# ビルド・本番起動
npm run build
npm start

# テスト関連
npm test                    # 単体テスト
npm run test:watch          # TDD監視モード
npm run test:e2e           # E2Eテスト
npm run test:coverage      # カバレッジ

# コード品質チェック
npm run lint               # Lintチェック
npm run type-check         # TypeScript型チェック
```

### 5.2 TDD開発ルール
1. **Red**: 失敗するテストを先に書く
2. **Green**: テストを通す最小コードを実装
3. **Refactor**: テストが通った状態でコードを改善
4. **コミット前**: 全テストが通ることを確認

### 5.3 ドキュメント更新ルール（重要）
**機能追加・改善時は必ず関連ドキュメントも同時更新する**

#### 5.3.1 更新対象ドキュメント
- **[要件定義書](./docs/01-requirements.md)**: 新機能の要件、制約、成功基準
- **[機能仕様書](./docs/02-specifications.md)**: API仕様、画面仕様、データ制限
- **[システム設計書](./docs/03-design.md)**: アーキテクチャ、DB設計、実装設計
- **[README.md](./README.md)**: セットアップ手順、機能概要
- **[CLAUDE.md](./CLAUDE.md)**: 実装完了機能、技術スタック

#### 5.3.2 ドキュメント更新フロー
```
1. 機能要件の追加・変更
   ↓
2. 【docs/01-requirements.md】要件定義の更新
   ↓
3. 【docs/02-specifications.md】API・画面仕様の更新
   ↓
4. 【docs/03-design.md】設計書の更新
   ↓
5. TDD開発サイクルで実装
   ↓
6. 【README.md】機能概要・セットアップ手順の更新
   ↓
7. 【CLAUDE.md】実装完了機能の更新
```

#### 5.3.3 更新必須タイミング
- **新機能追加時**: 全ドキュメントの該当箇所を更新
- **既存機能改善時**: 影響範囲に応じてドキュメント更新
- **API変更時**: 仕様書・設計書を必ず更新
- **UI/UX変更時**: 仕様書・設計書の画面仕様を更新
- **セキュリティ要件変更時**: 要件定義書・設計書を更新

#### 5.3.4 ドキュメント品質基準
- **一貫性**: 全ドキュメント間で用語・表記を統一
- **正確性**: 実装内容と仕様書の内容を一致させる
- **完全性**: 機能追加時は関連する全項目を更新
- **追跡可能性**: 要件→仕様→設計→実装の流れを明確化

#### 5.3.5 ドキュメント更新の確認事項
✅ 新機能の要件定義が要件定義書に記載されているか  
✅ API仕様変更が機能仕様書に反映されているか  
✅ データベース変更が設計書に反映されているか  
✅ 新機能の使用方法がREADME.mdに記載されているか  
✅ 実装完了機能がCLAUDE.mdで✅マークされているか  
✅ バージョン番号と最終更新日が全ドキュメントで統一されているか

## 6. 初期データ設定

### 6.1 管理者アカウント
- **初期管理者**:
  - メールアドレス: nomhiro1204@gmail.com
  - ユーザー名: admin
  - パスワード: 初期設定時に設定（パスワードポリシーに準拠）
  - 権限: 管理者

### 6.2 初期グループ設定
- **グループ名**: TS-AI
- **説明**: 技術支援・AI関連グループ
- **初期メンバー**: 管理者アカウント

### 6.3 環境変数設定
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

---

**作成日**: 2025年6月25日  
**最終更新**: 2025年7月4日  
**作成者**: システム開発担当者  
**バージョン**: 2.1（実装完了・ドキュメント整理版）