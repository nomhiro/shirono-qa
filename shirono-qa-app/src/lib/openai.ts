// Azure OpenAI integration using @azure/openai SDK
import { OpenAIApi, Configuration } from '@azure/openai'

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
  private client: OpenAIApi | null = null
  private endpoint: string
  private apiKey: string
  private deploymentName: string
  private embeddingModel: string

  constructor() {
    this.endpoint = process.env.AZURE_OPENAI_ENDPOINT || 'mock://openai'
    this.apiKey = process.env.AZURE_OPENAI_API_KEY || 'mock-key'
    this.deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4'
    this.embeddingModel = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME || 'text-embedding-3-large'

    // Initialize Azure OpenAI client if not in mock mode
    if (!this.endpoint.startsWith('mock://') && this.apiKey !== 'mock-key') {
      try {
        const configuration = new Configuration({
          apiKey: this.apiKey,
          basePath: `${this.endpoint}/openai/deployments`,
          baseOptions: {
            headers: {
              'api-key': this.apiKey,
            },
            params: {
              'api-version': '2024-02-15-preview'
            }
          }
        })
        this.client = new OpenAIApi(configuration)
      } catch (error) {
        console.warn('Failed to initialize Azure OpenAI client, falling back to mock mode:', error)
      }
    }
  }

  async embedText(text: string): Promise<number[]> {
    try {
      // Mock implementation for testing
      if (this.endpoint.startsWith('mock://') || !this.client) {
        // Return a mock 3072-dimensional vector
        return new Array(3072).fill(0).map(() => Math.random() * 2 - 1)
      }

      // Production implementation using Azure OpenAI SDK
      const response = await this.client.createEmbedding({
        model: this.embeddingModel,
        input: [text]
      })

      if (response.data?.data?.[0]?.embedding) {
        return response.data.data[0].embedding
      }

      throw new Error('Invalid embedding response')
    } catch (error) {
      console.error('Error generating embedding:', error)
      // Fallback to mock for development
      return new Array(3072).fill(0).map(() => Math.random() * 2 - 1)
    }
  }

  async generateTags(title: string, content: string): Promise<TagGenerationResponse> {
    try {
      // Mock implementation for testing
      if (this.endpoint.startsWith('mock://') || !this.client) {
        const text = `${title} ${content}`.toLowerCase()
        const possibleTags = [
          'next.js', 'react', 'javascript', 'typescript', 'authentication', 
          'security', 'database', 'azure', 'api', 'performance', 'optimization',
          'deployment', 'testing', 'debugging', 'frontend', 'backend',
          'cors', 'jwt', 'oauth', 'sql', 'nosql', 'mongodb', 'postgresql'
        ]

        const tags = possibleTags.filter(tag => text.includes(tag.toLowerCase()))
        
        // Add some intelligent matching
        if (text.includes('auth')) tags.push('authentication')
        if (text.includes('db') || text.includes('database')) tags.push('database')
        if (text.includes('deploy')) tags.push('deployment')
        if (text.includes('error') || text.includes('bug')) tags.push('debugging')
        if (text.includes('slow') || text.includes('performance')) tags.push('performance')

        return {
          tags: tags.slice(0, 5), // Limit to 5 tags
          confidence: Math.random() * 0.3 + 0.7 // 0.7-1.0
        }
      }

      // Production implementation using Azure OpenAI
      const prompt = `Based on the following question title and content, generate up to 5 relevant technical tags. Focus on technologies, programming languages, frameworks, and concepts mentioned.

Title: ${title}
Content: ${content}

Respond with only a JSON object in this format:
{
  "tags": ["tag1", "tag2", "tag3"],
  "confidence": 0.95
}

Tags should be lowercase and use common technical terms.`

      const response = await this.client.createChatCompletion({
        model: this.deploymentName,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 200
      })

      const responseContent = response.data?.choices?.[0]?.message?.content
      if (responseContent) {
        try {
          const parsed = JSON.parse(responseContent)
          return {
            tags: parsed.tags?.slice(0, 5) || [],
            confidence: parsed.confidence || 0.8
          }
        } catch {
          // Fallback to mock if parsing fails
          return this.generateTagsMock(title, content)
        }
      }

      return this.generateTagsMock(title, content)
    } catch (error) {
      console.error('Error generating tags:', error)
      // Fallback to mock implementation
      return this.generateTagsMock(title, content)
    }
  }

  private generateTagsMock(title: string, content: string): TagGenerationResponse {
    const text = `${title} ${content}`.toLowerCase()
    const possibleTags = [
      'next.js', 'react', 'javascript', 'typescript', 'authentication', 
      'security', 'database', 'azure', 'api', 'performance', 'optimization',
      'deployment', 'testing', 'debugging', 'frontend', 'backend',
      'cors', 'jwt', 'oauth', 'sql', 'nosql', 'mongodb', 'postgresql'
    ]

    const tags = possibleTags.filter(tag => text.includes(tag.toLowerCase()))
    
    // Add some intelligent matching
    if (text.includes('auth')) tags.push('authentication')
    if (text.includes('db') || text.includes('database')) tags.push('database')
    if (text.includes('deploy')) tags.push('deployment')
    if (text.includes('error') || text.includes('bug')) tags.push('debugging')
    if (text.includes('slow') || text.includes('performance')) tags.push('performance')

    return {
      tags: tags.slice(0, 5), // Limit to 5 tags
      confidence: Math.random() * 0.3 + 0.7 // 0.7-1.0
    }
  }

  async chatCompletion(prompt: string): Promise<ChatCompletionResponse> {
    try {
      // Mock implementation for testing
      if (this.endpoint.startsWith('mock://') || !this.client) {
        return {
          content: `Mock response for: ${prompt.substring(0, 50)}...`,
          usage: {
            prompt_tokens: 100,
            completion_tokens: 50,
            total_tokens: 150
          }
        }
      }

      // Production implementation using Azure OpenAI SDK
      const response = await this.client.createChatCompletion({
        model: this.deploymentName,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 500
      })

      const responseContent = response.data?.choices?.[0]?.message?.content
      if (responseContent) {
        return {
          content: responseContent,
          usage: {
            prompt_tokens: response.data?.usage?.prompt_tokens || 0,
            completion_tokens: response.data?.usage?.completion_tokens || 0,
            total_tokens: response.data?.usage?.total_tokens || 0
          }
        }
      }

      throw new Error('Invalid chat completion response')
    } catch (error) {
      console.error('Error in chat completion:', error)
      // Fallback to mock for development
      return {
        content: `Fallback response for: ${prompt.substring(0, 50)}...`,
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150
        }
      }
    }
  }
}

// Create singleton instance
const openAIClient = new OpenAIClient()

// Export convenience functions
export async function embedText(text: string): Promise<number[]> {
  return openAIClient.embedText(text)
}

export async function generateTags(title: string, content: string): Promise<TagGenerationResponse> {
  return openAIClient.generateTags(title, content)
}

export async function chatCompletion(prompt: string): Promise<ChatCompletionResponse> {
  return openAIClient.chatCompletion(prompt)
}

export default openAIClient