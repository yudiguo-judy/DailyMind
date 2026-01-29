export type KnowledgeType = "lesson" | "highlight" | "inspiration"

export interface KnowledgeEntry {
  id: string
  user_id: string
  workspace_id: string
  source_chat_id: string | null
  source_message_id: string | null
  created_at: string
  updated_at: string | null
  type: KnowledgeType
  content: string
  tags: string[] | null
}

export interface KnowledgeEntryWithSource extends KnowledgeEntry {
  source_chat?: {
    id: string
    name: string
  }
  source_message?: {
    id: string
    content: string
    created_at: string
  }
}

export interface CreateKnowledgeEntryInput {
  user_id: string
  workspace_id: string
  type: KnowledgeType
  content: string
  tags?: string[]
  source_chat_id?: string
  source_message_id?: string
}

export interface UpdateKnowledgeEntryInput {
  type?: KnowledgeType
  content?: string
  tags?: string[]
}

export interface KnowledgeEntryFilters {
  type?: KnowledgeType | "all"
  tags?: string[]
  query?: string
  limit?: number
  offset?: number
  sortBy?: "created_at" | "updated_at" | "relevance"
  sortOrder?: "asc" | "desc"
}

export interface KnowledgeSearchResult extends KnowledgeEntry {
  rank?: number
  similarity?: number
}

export interface KnowledgeStats {
  total_count: number
  lesson_count: number
  highlight_count: number
  inspiration_count: number
  unique_tags_count: number
}

export interface ExtractedKnowledge {
  lessons: Array<{ content: string; tags: string[] }>
  highlights: Array<{ content: string; tags: string[] }>
  inspirations: Array<{ content: string; tags: string[] }>
}

export interface DuplicateCheckResult {
  id: string
  content: string
  similarity: number
}
