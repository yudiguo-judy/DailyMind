export interface DailySummary {
  id: string
  user_id: string
  workspace_id: string
  created_at: string
  updated_at: string | null
  date: string
  summary: string
  message_count: number | null
  key_topics: string[] | null
}

export interface DailySummaryWithContext extends DailySummary {
  chat_count?: number
  user_message_count?: number
  assistant_message_count?: number
}

export interface CreateDailySummaryInput {
  user_id: string
  workspace_id: string
  date: string // YYYY-MM-DD format
  summary: string
  message_count?: number
  key_topics?: string[]
}

export interface UpdateDailySummaryInput {
  summary?: string
  message_count?: number
  key_topics?: string[]
}

export interface DailySummaryFilters {
  startDate?: string
  endDate?: string
  keyTopics?: string[]
  minMessageCount?: number
  limit?: number
  offset?: number
}

export interface GenerateSummaryRequest {
  date: string // YYYY-MM-DD format
  workspace_id: string
}

export interface GenerateSummaryResponse {
  success: boolean
  summary?: DailySummary
  error?: string
}
