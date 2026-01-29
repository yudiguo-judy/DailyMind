/**
 * Memory tools executor
 * Executes memory tools and returns results
 */

import { SupabaseClient } from "@supabase/supabase-js"
import { MemoryToolName } from "./definitions"

// Types for tool parameters
interface GetDailySummariesParams {
  startDate?: string
  endDate?: string
  limit?: number
}

interface GetFullChatHistoryParams {
  date: string
  chatId?: string
}

interface SearchKnowledgeParams {
  type?: "lesson" | "highlight" | "inspiration" | "all"
  query?: string
  tags?: string[]
  limit?: number
}

interface AddKnowledgeEntryParams {
  type: "lesson" | "highlight" | "inspiration"
  content: string
  tags?: string[]
}

// Tool result type
interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
}

/**
 * Execute a memory tool
 */
export async function executeMemoryTool(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string,
  toolName: MemoryToolName,
  params: Record<string, unknown>
): Promise<string> {
  try {
    let result: ToolResult

    switch (toolName) {
      case "get_daily_summaries":
        result = await getDailySummaries(
          supabase,
          userId,
          workspaceId,
          params as GetDailySummariesParams
        )
        break

      case "get_full_chat_history":
        result = await getFullChatHistory(
          supabase,
          userId,
          workspaceId,
          params as unknown as GetFullChatHistoryParams
        )
        break

      case "search_knowledge":
        result = await searchKnowledge(
          supabase,
          userId,
          workspaceId,
          params as SearchKnowledgeParams
        )
        break

      case "add_knowledge_entry":
        result = await addKnowledgeEntry(
          supabase,
          userId,
          workspaceId,
          params as unknown as AddKnowledgeEntryParams
        )
        break

      default:
        result = { success: false, error: `Unknown tool: ${toolName}` }
    }

    if (!result.success) {
      return `Error: ${result.error}`
    }

    return formatToolResult(toolName, result.data)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return `Error executing ${toolName}: ${message}`
  }
}

/**
 * Get daily summaries
 */
async function getDailySummaries(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string,
  params: GetDailySummariesParams
): Promise<ToolResult> {
  const { startDate, endDate, limit = 7 } = params

  let query = supabase
    .from("daily_summaries")
    .select("*")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .order("date", { ascending: false })
    .limit(limit)

  if (startDate) {
    query = query.gte("date", startDate)
  }
  if (endDate) {
    query = query.lte("date", endDate)
  }

  const { data, error } = await query

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data: data || [] }
}

/**
 * Get full chat history for a date
 */
async function getFullChatHistory(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string,
  params: GetFullChatHistoryParams
): Promise<ToolResult> {
  const { date, chatId } = params

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { success: false, error: "Invalid date format. Use YYYY-MM-DD." }
  }

  const startOfDay = `${date}T00:00:00.000Z`
  const endOfDay = `${date}T23:59:59.999Z`

  // Get chats for the date
  let chatsQuery = supabase
    .from("chats")
    .select("id, name, created_at")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .gte("created_at", startOfDay)
    .lte("created_at", endOfDay)
    .order("created_at", { ascending: true })

  if (chatId) {
    chatsQuery = chatsQuery.eq("id", chatId)
  }

  const { data: chats, error: chatsError } = await chatsQuery

  if (chatsError) {
    return { success: false, error: chatsError.message }
  }

  if (!chats || chats.length === 0) {
    return { success: true, data: [] }
  }

  // Get messages for chats
  const chatIds = chats.map(c => c.id)
  const { data: messages, error: messagesError } = await supabase
    .from("messages")
    .select("id, chat_id, role, content, created_at, sequence_number")
    .in("chat_id", chatIds)
    .order("sequence_number", { ascending: true })

  if (messagesError) {
    return { success: false, error: messagesError.message }
  }

  // Group messages by chat
  const result = chats.map(chat => ({
    chat,
    messages: (messages || []).filter(m => m.chat_id === chat.id)
  }))

  return { success: true, data: result }
}

/**
 * Search knowledge entries
 */
async function searchKnowledge(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string,
  params: SearchKnowledgeParams
): Promise<ToolResult> {
  const { type = "all", query, tags, limit = 20 } = params

  let dbQuery = supabase
    .from("knowledge_entries")
    .select("*")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (type && type !== "all") {
    dbQuery = dbQuery.eq("type", type)
  }

  if (tags && tags.length > 0) {
    dbQuery = dbQuery.overlaps("tags", tags)
  }

  const { data, error } = await dbQuery

  if (error) {
    return { success: false, error: error.message }
  }

  let results = data || []

  // Client-side text search
  if (query && query.trim()) {
    const searchTerms = query.toLowerCase().split(/\s+/)
    results = results.filter(entry => {
      const content = entry.content.toLowerCase()
      const entryTags = (entry.tags || []).join(" ").toLowerCase()
      return searchTerms.some(
        term => content.includes(term) || entryTags.includes(term)
      )
    })
  }

  return { success: true, data: results }
}

/**
 * Add a knowledge entry
 */
async function addKnowledgeEntry(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string,
  params: AddKnowledgeEntryParams
): Promise<ToolResult> {
  const { type, content, tags = [] } = params

  // Validate
  if (!["lesson", "highlight", "inspiration"].includes(type)) {
    return { success: false, error: "Invalid type" }
  }

  if (!content || content.trim().length === 0) {
    return { success: false, error: "Content is required" }
  }

  if (content.length > 200) {
    return {
      success: false,
      error: `Content too long (${content.length}/200 characters)`
    }
  }

  // Check for duplicates
  const { data: existing } = await supabase
    .from("knowledge_entries")
    .select("id")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .eq("type", type)
    .ilike("content", content.trim())
    .limit(1)

  if (existing && existing.length > 0) {
    return { success: false, error: "Similar entry already exists" }
  }

  // Clean tags
  const cleanedTags = tags
    .map(t => t.trim().toLowerCase())
    .filter(t => t.length > 0)
    .filter((t, i, arr) => arr.indexOf(t) === i)

  // Insert
  const { data, error } = await supabase
    .from("knowledge_entries")
    .insert({
      user_id: userId,
      workspace_id: workspaceId,
      type,
      content: content.trim(),
      tags: cleanedTags.length > 0 ? cleanedTags : null
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

/**
 * Format tool result for display
 */
function formatToolResult(toolName: MemoryToolName, data: unknown): string {
  switch (toolName) {
    case "get_daily_summaries": {
      const summaries = data as Array<{
        date: string
        summary: string
        message_count: number | null
        key_topics: string[] | null
      }>

      if (summaries.length === 0) {
        return "No summaries found for the specified period."
      }

      return summaries
        .map(s => {
          const topics = s.key_topics?.length
            ? `Topics: ${s.key_topics.join(", ")}`
            : ""
          const count = s.message_count ? `(${s.message_count} messages)` : ""
          return `## ${s.date} ${count}\n${topics}\n\n${s.summary}`
        })
        .join("\n\n---\n\n")
    }

    case "get_full_chat_history": {
      const chats = data as Array<{
        chat: { name: string; created_at: string }
        messages: Array<{ role: string; content: string; created_at: string }>
      }>

      if (chats.length === 0) {
        return "No conversations found for the specified date."
      }

      return chats
        .map(({ chat, messages }) => {
          const formatted = messages
            .map(m => {
              const role = m.role === "user" ? "User" : "Assistant"
              const content =
                m.content.length > 1000
                  ? m.content.substring(0, 1000) + "... [truncated]"
                  : m.content
              return `**${role}**: ${content}`
            })
            .join("\n\n")

          return `# ${chat.name || "Untitled"}\n${formatted}`
        })
        .join("\n\n---\n\n")
    }

    case "search_knowledge": {
      const entries = data as Array<{
        type: string
        content: string
        tags: string[] | null
        created_at: string
      }>

      if (entries.length === 0) {
        return "No knowledge entries found."
      }

      const typeEmoji: Record<string, string> = {
        lesson: "📚",
        highlight: "⭐",
        inspiration: "💡"
      }

      return entries
        .map(e => {
          const emoji = typeEmoji[e.type] || "📝"
          const tags = e.tags?.length ? ` [${e.tags.join(", ")}]` : ""
          return `${emoji} ${e.content}${tags}`
        })
        .join("\n")
    }

    case "add_knowledge_entry": {
      const entry = data as {
        id: string
        type: string
        content: string
        tags: string[] | null
      }

      const typeEmoji: Record<string, string> = {
        lesson: "📚",
        highlight: "⭐",
        inspiration: "💡"
      }

      const emoji = typeEmoji[entry.type] || "📝"
      const tags = entry.tags?.length ? `\nTags: ${entry.tags.join(", ")}` : ""

      return `${emoji} Successfully added to ${entry.type}s!\n\n"${entry.content}"${tags}`
    }

    default:
      return JSON.stringify(data, null, 2)
  }
}
