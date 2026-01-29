// Database types for MCP Server

export interface DailySummary {
  id: string;
  user_id: string;
  workspace_id: string;
  date: string;
  summary: string;
  message_count: number | null;
  key_topics: string[] | null;
  created_at: string;
}

export type KnowledgeType = "lesson" | "highlight" | "inspiration";

export interface KnowledgeEntry {
  id: string;
  user_id: string;
  workspace_id: string;
  type: KnowledgeType;
  content: string;
  source_chat_id: string | null;
  source_message_id: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  user_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
  updated_at: string | null;
  image_paths: string[] | null;
  model: string | null;
  sequence_number: number;
}

export interface Chat {
  id: string;
  user_id: string;
  workspace_id: string;
  name: string;
  created_at: string;
  updated_at: string | null;
}

// Tool parameter types
export interface GetDailySummariesParams {
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export interface GetFullChatHistoryParams {
  date: string;
  chatId?: string;
}

export interface SearchKnowledgeParams {
  type?: KnowledgeType | "all";
  query?: string;
  tags?: string[];
  limit?: number;
}

export interface AddKnowledgeEntryParams {
  type: KnowledgeType;
  content: string;
  tags?: string[];
}

// Tool result types
export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
