import { Question } from './question'

export interface SearchQuery {
  q: string                    // 検索キーワード
  tags?: string[]             // タグフィルター
  status?: string             // ステータスフィルター
  priority?: string           // 優先度フィルター
  authorId?: string           // 投稿者フィルター
  groupId?: string            // グループフィルター
  dateFrom?: Date             // 期間フィルター（開始）
  dateTo?: Date               // 期間フィルター（終了）
  page?: number               // ページ番号
  limit?: number              // 取得件数
  sortBy?: SearchSortField    // ソート項目
  sortOrder?: 'asc' | 'desc'  // ソート順
}

export enum SearchSortField {
  RELEVANCE = 'relevance',      // 関連度（デフォルト）
  CREATED_AT = 'createdAt',     // 投稿日時
  UPDATED_AT = 'updatedAt',     // 更新日時
  PRIORITY = 'priority',        // 優先度
  STATUS = 'status'             // ステータス
}

export interface SearchResult {
  question: Question
  score: number                 // 検索スコア（0-1）
  highlights: SearchHighlight[] // ハイライト情報
  snippet: string               // 検索結果スニペット
}

export interface SearchHighlight {
  field: string                 // ハイライト対象フィールド（title, content）
  fragments: string[]           // ハイライトされたテキスト断片
}

export interface SearchResponse {
  success: boolean
  results?: SearchResult[]
  total?: number
  page?: number
  limit?: number
  query?: string
  suggestions?: string[]        // 検索候補
  error?: string
}

export interface SimilarQuestion {
  id: string
  title: string
  content: string
  similarity: number            // 類似度スコア（0-1）
  snippet: string               // 質問の要約
  status: string
  answersCount: number
  createdAt: Date
}

export interface SimilarQuestionsResult {
  success: boolean
  questions?: SimilarQuestion[]
  error?: string
}

export interface AutoTagResult {
  success: boolean
  tags?: string[]
  confidence?: number           // 信頼度スコア（0-1）
  error?: string
}

export interface SearchSuggestionsResult {
  success: boolean
  suggestions?: string[]
  error?: string
}

// ベクター検索用の型
export interface VectorSearchQuery {
  vector: number[]              // 3072次元のベクター
  threshold?: number            // 類似度閾値（デフォルト: 0.7）
  limit?: number                // 取得件数（デフォルト: 5）
  excludeIds?: string[]         // 除外する質問ID
  groupId?: string              // グループ制限
}

export interface VectorSearchResult {
  id: string
  distance: number              // ベクター距離
  similarity: number            // 類似度スコア（1 - distance）
  question: Question
}