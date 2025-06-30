@description('Location for all resources')
param location string = 'japaneast'

@description('Environment suffix for resource naming')
param environmentName string = 'prod'

@description('Unique suffix for resource naming')
param uniqueSuffix string = uniqueString(resourceGroup().id)

@description('Repository URL for Static Web App')
param repositoryUrl string

@description('Repository branch for Static Web App')
param repositoryBranch string = 'main'

@description('GitHub token for Static Web App deployment')
@secure()
param githubToken string

// Variables
var resourceBaseName = 'shirono-qa-${environmentName}'
var tags = {
  project: 'shirono-qa'
  environment: environmentName
  managedBy: 'bicep'
}


// Storage Account for file uploads
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: 'shironoqa${take(uniqueSuffix, 8)}'
  location: location
  tags: tags
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: true
    allowSharedKeyAccess: true
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    networkAcls: {
      defaultAction: 'Allow'
      bypass: 'AzureServices'
    }
  }
}

// Blob container for QA attachments
resource blobContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  name: '${storageAccount.name}/default/qa-attachments'
  properties: {
    publicAccess: 'Blob'
  }
}

// Cosmos DB Account (Serverless for cost optimization)
resource cosmosDbAccount 'Microsoft.DocumentDB/databaseAccounts@2023-04-15' = {
  name: '${resourceBaseName}-cosmos-${uniqueSuffix}'
  location: location
  tags: tags
  properties: {
    databaseAccountOfferType: 'Standard'
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    capabilities: [
      {
        name: 'EnableServerless'
      }
      {
        name: 'EnableNoSQLVectorSearch'
      }
    ]
    backupPolicy: {
      type: 'Periodic'
      periodicModeProperties: {
        backupIntervalInMinutes: 1440 // 24 hours
        backupRetentionIntervalInHours: 168 // 7 days
        backupStorageRedundancy: 'Local'
      }
    }
  }
}

// Cosmos DB Database
resource cosmosDatabase 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2023-04-15' = {
  parent: cosmosDbAccount
  name: 'ShironoQA'
  properties: {
    resource: {
      id: 'ShironoQA'
    }
  }
}

// Cosmos DB Containers
resource containersArray 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-04-15' = [
  for container in [
    { name: 'users', partitionKey: '/id' }
    { name: 'groups', partitionKey: '/id' }
    { name: 'questions', partitionKey: '/groupId' }
    { name: 'answers', partitionKey: '/questionId' }
    { name: 'comments', partitionKey: '/questionId' }
    { name: 'sessions', partitionKey: '/userId' }
  ]: {
    parent: cosmosDatabase
    name: container.name
    properties: {
      resource: {
        id: container.name
        partitionKey: {
          paths: [
            container.partitionKey
          ]
          kind: 'Hash'
        }
        indexingPolicy: {
          indexingMode: 'consistent'
          automatic: true
          includedPaths: [
            {
              path: '/*'
            }
          ]
          excludedPaths: [
            {
              path: '/"_etag"/?'
            }
          ]
        }
      }
    }
  }
]

// Azure OpenAI Account
resource openAIAccount 'Microsoft.CognitiveServices/accounts@2023-05-01' = {
  name: '${resourceBaseName}-openai-${uniqueSuffix}'
  location: location
  tags: tags
  sku: {
    name: 'S0'
  }
  kind: 'OpenAI'
  properties: {
    customSubDomainName: '${resourceBaseName}-openai-${uniqueSuffix}'
    networkAcls: {
      defaultAction: 'Allow'
    }
    publicNetworkAccess: 'Enabled'
  }
}

// Azure OpenAI Deployments - gpt-4.1-mini (using gpt-4 model with latest version)
resource gpt41MiniDeployment 'Microsoft.CognitiveServices/accounts/deployments@2023-05-01' = {
  parent: openAIAccount
  name: 'gpt-4.1-mini'
  properties: {
    model: {
      format: 'OpenAI'
      name: 'gpt-4.1-mini'
      version: '2025-04-14'
    }
    raiPolicyName: 'Microsoft.Default'
  }
  sku: {
    name: 'GlobalStandard'
    capacity: 1
  }
}

resource embeddingDeployment 'Microsoft.CognitiveServices/accounts/deployments@2023-05-01' = {
  parent: openAIAccount
  name: 'text-embedding-3-large'
  properties: {
    model: {
      format: 'OpenAI'
      name: 'text-embedding-3-large'
      version: '1'
    }
    raiPolicyName: 'Microsoft.Default'
  }
  sku: {
    name: 'GlobalStandard'
    capacity: 5 // Minimum for embedding
  }
  dependsOn: [
    gpt41MiniDeployment
  ]
}

// Static Web App
resource staticWebApp 'Microsoft.Web/staticSites@2023-01-01' = {
  name: '${resourceBaseName}-swa-${uniqueSuffix}'
  location: 'East Asia' // Static Web Apps in East Asia for Japan
  tags: tags
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    repositoryUrl: repositoryUrl
    branch: repositoryBranch
    repositoryToken: githubToken
    buildProperties: {
      appLocation: '/shirono-qa-app'
      apiLocation: 'api'
      outputLocation: 'out'
    }
    stagingEnvironmentPolicy: 'Disabled'
    allowConfigFileUpdates: true
    enterpriseGradeCdnStatus: 'Disabled'
  }
}


// Outputs for azd and application configuration
output AZURE_LOCATION string = location
output AZURE_TENANT_ID string = tenant().tenantId
output AZURE_SUBSCRIPTION_ID string = subscription().subscriptionId

// Static Web App
output STATIC_WEB_APP_NAME string = staticWebApp.name
output STATIC_WEB_APP_URL string = staticWebApp.properties.defaultHostname
output STATIC_WEB_APP_API_URL string = 'https://${staticWebApp.properties.defaultHostname}/api'

// Storage Account
output AZURE_STORAGE_ACCOUNT_NAME string = storageAccount.name
output AZURE_STORAGE_CONTAINER_NAME string = 'qa-attachments'

// Cosmos DB
output COSMOS_DB_ACCOUNT_NAME string = cosmosDbAccount.name
output COSMOS_DB_DATABASE_NAME string = cosmosDatabase.name

// Azure OpenAI
output AZURE_OPENAI_ACCOUNT_NAME string = openAIAccount.name
output AZURE_OPENAI_ENDPOINT string = openAIAccount.properties.endpoint
output AZURE_OPENAI_DEPLOYMENT_NAME string = gpt41MiniDeployment.name
output AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME string = embeddingDeployment.name

// Connection strings and secrets for environment variables
output COSMOS_DB_CONNECTION_STRING string = cosmosDbAccount.listConnectionStrings().connectionStrings[0].connectionString
output AZURE_STORAGE_CONNECTION_STRING string = 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value};EndpointSuffix=core.windows.net'
output AZURE_OPENAI_API_KEY string = openAIAccount.listKeys().key1
output SESSION_SECRET string = uniqueString(resourceGroup().id, 'session-secret')

// Cost estimation (monthly in USD)
output ESTIMATED_MONTHLY_COST object = {
  staticWebApp: 0 // Free tier
  cosmosDBServerless: 25 // Estimated based on 20 users
  storageAccount: 5 // 100GB storage + transactions
  azureOpenAI: 50 // gpt-4.1-mini + embeddings usage
  total: 80
}
