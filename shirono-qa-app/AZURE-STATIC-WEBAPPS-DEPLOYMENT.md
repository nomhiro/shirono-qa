# Azure Static Web Apps デプロイ手順

## ⚠️ 重要な注意事項

このアプリケーションは **Next.js APIルート** と **サーバーサイド機能** を多用しているため、Azure Static Web Apps での直接デプロイは **推奨されません**。

## 🏗️ 推奨デプロイ方法

### オプション1: Azure App Service (推奨)
```bash
# App Service でのデプロイ
az webapp create --name shirono-qa-app --resource-group rg-shirono-qa --plan asp-shirono-qa --runtime "NODE:18-lts"
az webapp deployment source config --name shirono-qa-app --resource-group rg-shirono-qa --repo-url https://github.com/YOUR_USERNAME/shirono-qa --branch main
```

### オプション2: Azure Container Apps
```bash
# Container Apps でのデプロイ
az containerapp up --name shirono-qa-app --resource-group rg-shirono-qa --environment shirono-qa-env --source .
```

## 🔧 Static Web Apps 用の修正（上級者向け）

Static Web Apps を使用する場合は、以下の大幅な修正が必要です：

### 1. アーキテクチャの変更
- **フロントエンド**: Next.js (Static Generation)
- **バックエンド**: Azure Functions (TypeScript)
- **認証**: Azure Static Web Apps 認証

### 2. 必要な修正作業

#### 2.1 Next.js設定修正
```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true
  },
  trailingSlash: true
}

module.exports = nextConfig
```

#### 2.2 API Routes → Azure Functions 移行
```
src/app/api/ → api/ (Azure Functions)
├── auth/
│   ├── login/
│   │   └── index.ts
│   ├── logout/
│   │   └── index.ts
│   └── me/
│       └── index.ts
├── questions/
│   └── index.ts
└── package.json
```

#### 2.3 Static Web Apps 設定
```json
{
  "routes": [
    {
      "route": "/api/*",
      "allowedRoles": ["anonymous"]
    }
  ],
  "navigationFallback": {
    "rewrite": "/index.html"
  }
}
```

### 3. GitHub Actions設定
```yaml
# .github/workflows/azure-static-web-apps.yml
name: Azure Static Web Apps CI/CD

on:
  push:
    branches: [ main ]
  pull_request:
    types: [opened, synchronize, reopened, closed]
    branches: [ main ]

jobs:
  build_and_deploy_job:
    if: github.event_name == 'push' || (github.event_name == 'pull_request' && github.event.action != 'closed')
    runs-on: ubuntu-latest
    name: Build and Deploy Job
    steps:
      - uses: actions/checkout@v3
        with:
          submodules: true
      - name: Build And Deploy
        id: builddeploy
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "/"
          api_location: "api"
          output_location: "out"
        env:
          NODE_VERSION: "18"
```

## 📋 作業見積もり

### Static Web Apps 対応作業
- **工数**: 40-60時間
- **難易度**: 高
- **リスク**: 高（認証機能の大幅変更）

### App Service 移行作業  
- **工数**: 4-8時間
- **難易度**: 低
- **リスク**: 低（最小限の設定変更のみ）

## 🎯 推奨アクション

1. **即座にデプロイしたい場合**:
   - **Azure App Service** を使用
   - 既存コードをほぼそのまま使用可能

2. **Static Web Apps にこだわる場合**:
   - 大幅なアーキテクチャ変更が必要
   - フロントエンド/バックエンド分離設計
   - Azure Functions + Static Web Apps 構成

3. **開発継続が優先の場合**:
   - 当面は **Azure App Service** でデプロイ
   - 後でStatic Web Apps移行を検討

## ⚡ 今すぐ使えるコマンド (App Service)

```bash
# 1. リソースグループ作成
az group create --name rg-shirono-qa --location japaneast

# 2. App Service Plan作成
az appservice plan create --name asp-shirono-qa --resource-group rg-shirono-qa --sku B1 --is-linux

# 3. Web App作成
az webapp create --name shirono-qa-app-$(date +%s) --resource-group rg-shirono-qa --plan asp-shirono-qa --runtime "NODE:18-lts"

# 4. 環境変数設定
az webapp config appsettings set --name <your-webapp-name> --resource-group rg-shirono-qa --settings \
  COSMOS_DB_CONNECTION_STRING="your-cosmos-connection" \
  AZURE_STORAGE_CONNECTION_STRING="your-storage-connection" \
  AZURE_OPENAI_ENDPOINT="your-openai-endpoint" \
  AZURE_OPENAI_API_KEY="your-openai-key"

# 5. GitHub デプロイ設定
az webapp deployment source config --name <your-webapp-name> --resource-group rg-shirono-qa --repo-url https://github.com/YOUR_USERNAME/shirono-qa --branch main --manual-integration
```

**結論**: 現在のアプリケーション構成では **Azure App Service** が最適です。