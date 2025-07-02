// Azure OpenAI integration using openai SDK
import { AzureOpenAI } from 'openai'

export interface EmbeddingResponse {
  data: Array<{
    embedding: number[]
    index: number
  }>
  usage: {
    prompt_tokens: number
    total_tokens: number
  }
}

export interface TagGenerationResponse {
  tags: string[]
  confidence: number
}

export interface ChatCompletionResponse {
  content: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

class OpenAIClient {
  private client: AzureOpenAI
  private endpoint: string
  private apiKey: string
  private deploymentName: string
  private embeddingModel: string
  private apiVersion: string

  constructor() {
    // ビルド時はダミー値を使用（実際のAPI呼び出しは行われない）
    this.endpoint = process.env.AZURE_OPENAI_ENDPOINT || 'https://dummy.openai.azure.com/'
    this.apiKey = process.env.AZURE_OPENAI_API_KEY || 'dummy-key'
    this.deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4'
    this.embeddingModel = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME || 'text-embedding-3-large'
    this.apiVersion = '2024-10-21'

    // 本番環境でのみ厳密なチェックを行う
    if (process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV !== 'preview' && (!process.env.AZURE_OPENAI_ENDPOINT || !process.env.AZURE_OPENAI_API_KEY)) {
      console.warn('Azure OpenAI configuration is missing in production. Some AI features may not work.')
    }

    // クライアントの初期化は実際に使用される時まで遅延
    this.client = new AzureOpenAI({
      endpoint: this.endpoint,
      apiKey: this.apiKey,
      apiVersion: this.apiVersion,
    })
  }

  async embedText(text: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: this.embeddingModel,
        input: text,
      })

      if (response.data?.[0]?.embedding) {
        return response.data[0].embedding
      }

      throw new Error('Invalid embedding response')
    } catch (error) {
      console.error('Error generating embedding:', error)
      throw error
    }
  }

  async generateTags(title: string, content: string): Promise<TagGenerationResponse> {
    try {
      const prompt = `Based on the following question title and content, generate up to 5 relevant technical tags. Focus on technologies, programming languages, frameworks, and concepts mentioned.

Title: ${title}
Content: ${content}

Respond with only a JSON object in this format:
{
  "tags": ["tag1", "tag2", "tag3"],
  "confidence": 0.95
}

Tags should be lowercase and use common technical terms.`

      const response = await this.client.chat.completions.create({
        model: this.deploymentName,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 200
      })

      const responseContent = response.choices?.[0]?.message?.content
      if (responseContent) {
        try {
          const parsed = JSON.parse(responseContent)
          return {
            tags: parsed.tags?.slice(0, 5) || [],
            confidence: parsed.confidence || 0.8
          }
        } catch (parseError) {
          console.error('Failed to parse OpenAI response:', parseError)
          throw new Error('Invalid response format from OpenAI')
        }
      }

      throw new Error('No response content from OpenAI')
    } catch (error) {
      console.error('Error generating tags:', error)
      throw error
    }
  }


  async chatCompletion(prompt: string): Promise<ChatCompletionResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.deploymentName,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 500
      })

      const responseContent = response.choices?.[0]?.message?.content
      if (responseContent) {
        return {
          content: responseContent,
          usage: {
            prompt_tokens: response.usage?.prompt_tokens || 0,
            completion_tokens: response.usage?.completion_tokens || 0,
            total_tokens: response.usage?.total_tokens || 0
          }
        }
      }

      throw new Error('Invalid chat completion response')
    } catch (error) {
      console.error('Error in chat completion:', error)
      throw error
    }
  }
}

// Lazy singleton instance
let openAIClientInstance: OpenAIClient | null = null

function getOpenAIClient(): OpenAIClient {
  if (!openAIClientInstance) {
    openAIClientInstance = new OpenAIClient()
  }
  return openAIClientInstance
}

// Export convenience functions
export async function embedText(text: string): Promise<number[]> {
  return getOpenAIClient().embedText(text)
}

export async function generateTags(title: string, content: string): Promise<TagGenerationResponse> {
  return getOpenAIClient().generateTags(title, content)
}

export async function chatCompletion(prompt: string): Promise<ChatCompletionResponse> {
  return getOpenAIClient().chatCompletion(prompt)
}

export function getOpenAIClientInstance(): OpenAIClient {
  return getOpenAIClient()
}