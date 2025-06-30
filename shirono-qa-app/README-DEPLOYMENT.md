# 🚀 Azure 自動デプロイメント手順

## 前提条件

1. **Azure CLI インストール**
   ```bash
   # Windows (winget)
   winget install Microsoft.AzureCLI
   
   # macOS (Homebrew)
   brew install azure-cli
   
   # Linux (apt)
   curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
   ```

2. **Azure Developer CLI (azd) インストール**
   ```bash
   # Windows (winget)
   winget install Microsoft.Azd
   
   # macOS (Homebrew)
   brew tap azure/azd && brew install azd
   
   # Linux (script)
   curl -fsSL https://aka.ms/install-azd.sh | bash
   ```

3. **GitHub Personal Access Token 作成**
   - GitHub → Settings → Developer settings → Personal access tokens
   - 以下の権限を付与：`repo`, `workflow`, `write:packages`

## 🏗️ デプロイメント手順

### 1. Azure へのログイン
```bash
az login
azd auth login
```

### 2. プロジェクト初期化
```bash
# プロジェクトディレクトリに移動
cd shirono-qa-app

# azd プロジェクト初期化
azd init
```

### 3. パラメータ設定
`infra/main.parameters.json` を編集：
```json
{
  "parameters": {
    "repositoryUrl": {
      "value": "https://github.com/YOUR_USERNAME/shirono-qa"
    },
    "githubToken": {
      "value": "ghp_xxxxxxxxxxxxxxxxxxxx"
    }
  }
}
```

### 4. デプロイ実行
```bash
# 一括デプロイ（リソース作成 + アプリデプロイ）
azd up

# または段階的デプロイ
azd provision  # リソース作成のみ
azd deploy     # アプリデプロイのみ
```

## 📋 デプロイされるAzureリソース

### 💰 **コスト最適化構成（月額約 $83）**

| リソース | SKU/プラン | 月額コスト |
|----------|------------|------------|
| **Static Web App** | Free | $0 |
| **Cosmos DB** | サーバーレス | ~$25 |
| **Storage Account** | Standard LRS | ~$5 |
| **Azure OpenAI** | GPT-4.1 + Embeddings | ~$50 |
| **Key Vault** | Standard | ~$3 |
| **合計** | | **~$83** |

### 🔧 **リソース詳細**

#### Static Web App (フロントエンド)
- **プラン**: Free tier
- **機能**: Next.js ホスティング、自動CI/CD
- **URL**: 自動生成される `.azurestaticapps.net` ドメイン

#### Azure Cosmos DB (データベース)
- **モード**: サーバーレス（従量課金）
- **機能**: NoSQL、ベクター検索、自動バックアップ
- **コンテナ**: users, groups, questions, answers, comments, sessions

#### Azure OpenAI (AI機能)
- **モデル**: GPT-4.1 (0125-Preview) 
- **埋め込み**: text-embedding-3-large
- **キャパシティ**: GPT-4 (10 TPM), Embeddings (5 TPM)

#### Storage Account (ファイル保存)
- **SKU**: Standard LRS
- **コンテナ**: qa-attachments (パブリック読み取り)
- **容量**: 無制限（従量課金）

#### Key Vault (シークレット管理)
- **プラン**: Standard
- **保存内容**: DB接続文字列、API キー、セッションシークレット

## 🔧 デプロイ後の設定

### 1. メール設定（手動）
```bash
# Key Vault にメール設定を追加
az keyvault secret set --vault-name <key-vault-name> --name "smtp-host" --value "smtp.gmail.com"
az keyvault secret set --vault-name <key-vault-name> --name "smtp-user" --value "nomhiro1204@gmail.com"
az keyvault secret set --vault-name <key-vault-name> --name "smtp-password" --value "<gmail-app-password>"
```

### 2. カスタムドメイン設定（オプション）
```bash
# Static Web App にカスタムドメインを追加
az staticwebapp hostname set --name <static-web-app-name> --hostname your-domain.com
```

### 3. 管理者アカウント作成
アプリケーション初回アクセス時に自動的に管理者アカウントが作成されます：
- **ユーザー名**: admin
- **メール**: nomhiro1204@gmail.com
- **パスワード**: AdminPass123!

## 🔍 監視・管理

### リソース確認
```bash
# デプロイされたリソース一覧
az resource list --resource-group <resource-group-name> --output table

# アプリケーションURL確認
azd show
```

### ログ確認
```bash
# Static Web App ログ
az staticwebapp logs --name <static-web-app-name>

# Cosmos DB メトリクス
az cosmosdb show --name <cosmos-db-name> --resource-group <resource-group-name>
```

### コスト監視
```bash
# リソースグループのコスト確認
az consumption usage list --billing-period-name <billing-period>
```

## 🗑️ リソース削除

```bash
# 全リソース削除
azd down --purge

# または手動削除
az group delete --name <resource-group-name> --yes
```

## 🔧 トラブルシューティング

### よくある問題

1. **GitHub Token エラー**
   ```bash
   # Token の権限を確認
   curl -H "Authorization: token <your-token>" https://api.github.com/user
   ```

2. **OpenAI モデル利用不可**
   ```bash
   # Japan East でのモデル利用可能性を確認
   az cognitiveservices account list-models --name <openai-account-name>
   ```

3. **静的サイト生成エラー**
   ```bash
   # ローカルでビルドテスト
   npm run build
   npm run start
   ```

## 📞 サポート

問題が発生した場合：
1. Azure Portal でリソースの状態を確認
2. `azd show` でデプロイ状況を確認  
3. GitHub Issues でエラー報告

---

**🎉 デプロイ完了後、自動で以下が設定されます：**
- ✅ データベース初期化とサンプルデータ投入
- ✅ 環境変数の自動設定
- ✅ Static Web App の自動ビルド・デプロイ
- ✅ HTTPS 対応と独自ドメイン対応
- ✅ セキュリティヘッダーの設定