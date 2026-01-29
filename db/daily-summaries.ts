import { supabase as typedSupabase } from "@/lib/supabase/browser-client"
import {
  CreateDailySummaryInput,
  DailySummaryFilters,
  UpdateDailySummaryInput
} from "@/types"

// Cast to any because the generated Supabase types don't include
// the daily_summaries table or custom RPC functions yet
const supabase = typedSupabase as any

// ==================== GET OPERATIONS ====================

export const getDailySummaryById = async (summaryId: string) => {
  const { data: summary, error } = await supabase
    .from("daily_summaries")
    .select("*")
    .eq("id", summaryId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return summary
}

export const getDailySummaryByDate = async (
  userId: string,
  workspaceId: string,
  date: string
) => {
  const { data: summary, error } = await supabase
    .from("daily_summaries")
    .select("*")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .eq("date", date)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return summary
}

export const getRecentSummaries = async (
  userId: string,
  workspaceId: string,
  days: number = 7
) => {
  const { data: summaries, error } = await supabase.rpc(
    "get_recent_summaries",
    {
      p_user_id: userId,
      p_workspace_id: workspaceId,
      p_days: days
    }
  )

  if (error) {
    throw new Error(error.message)
  }

  return summaries || []
}

export const getDailySummariesByDateRange = async (
  userId: string,
  workspaceId: string,
  startDate: string,
  endDate: string
) => {
  const { data: summaries, error } = await supabase
    .from("daily_summaries")
    .select("*")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return summaries || []
}

export const getDailySummariesByWorkspace = async (
  userId: string,
  workspaceId: string,
  filters?: DailySummaryFilters
) => {
  let query = supabase
    .from("daily_summaries")
    .select("*")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)

  if (filters?.startDate) {
    query = query.gte("date", filters.startDate)
  }

  if (filters?.endDate) {
    query = query.lte("date", filters.endDate)
  }

  if (filters?.keyTopics && filters.keyTopics.length > 0) {
    query = query.overlaps("key_topics", filters.keyTopics)
  }

  if (filters?.minMessageCount) {
    query = query.gte("message_count", filters.minMessageCount)
  }

  query = query.order("date", { ascending: false })

  if (filters?.limit) {
    query = query.limit(filters.limit)
  }

  if (filters?.offset) {
    query = query.range(
      filters.offset,
      filters.offset + (filters.limit || 50) - 1
    )
  }

  const { data: summaries, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return summaries || []
}

export const getAllKeyTopics = async (userId: string, workspaceId: string) => {
  const { data: summaries, error } = await supabase
    .from("daily_summaries")
    .select("key_topics")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)

  if (error) {
    throw new Error(error.message)
  }

  // Flatten and deduplicate topics
  const allTopics = summaries
    ?.flatMap((s: any) => s.key_topics || [])
    .filter(
      (topic: string, index: number, self: string[]) =>
        self.indexOf(topic) === index
    )
    .sort()

  return allTopics || []
}

// ==================== CREATE OPERATIONS ====================

export const createDailySummary = async (summary: CreateDailySummaryInput) => {
  const { data: createdSummary, error } = await supabase
    .from("daily_summaries")
    .insert([summary])
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return createdSummary
}

export const createDailySummaries = async (
  summaries: CreateDailySummaryInput[]
) => {
  const { data: createdSummaries, error } = await supabase
    .from("daily_summaries")
    .insert(summaries)
    .select("*")

  if (error) {
    throw new Error(error.message)
  }

  return createdSummaries
}

// ==================== UPDATE OPERATIONS ====================

export const updateDailySummary = async (
  summaryId: string,
  updates: UpdateDailySummaryInput
) => {
  const { data: updatedSummary, error } = await supabase
    .from("daily_summaries")
    .update(updates)
    .eq("id", summaryId)
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return updatedSummary
}

export const updateDailySummaryByDate = async (
  userId: string,
  workspaceId: string,
  date: string,
  updates: UpdateDailySummaryInput
) => {
  const { data: updatedSummary, error } = await supabase
    .from("daily_summaries")
    .update(updates)
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .eq("date", date)
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return updatedSummary
}

// ==================== DELETE OPERATIONS ====================

export const deleteDailySummary = async (summaryId: string) => {
  const { error } = await supabase
    .from("daily_summaries")
    .delete()
    .eq("id", summaryId)

  if (error) {
    throw new Error(error.message)
  }

  return true
}

export const deleteDailySummaryByDate = async (
  userId: string,
  workspaceId: string,
  date: string
) => {
  const { error } = await supabase
    .from("daily_summaries")
    .delete()
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .eq("date", date)

  if (error) {
    throw new Error(error.message)
  }

  return true
}

export const deleteDailySummariesByWorkspace = async (
  userId: string,
  workspaceId: string
) => {
  const { error } = await supabase
    .from("daily_summaries")
    .delete()
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)

  if (error) {
    throw new Error(error.message)
  }

  return true
}

// ==================== UTILITY FUNCTIONS ====================

export const checkDailySummaryExists = async (
  userId: string,
  workspaceId: string,
  date: string
): Promise<boolean> => {
  const { data, error } = await supabase
    .from("daily_summaries")
    .select("id")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .eq("date", date)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data !== null
}

export const getDailySummaryCount = async (
  userId: string,
  workspaceId: string
): Promise<number> => {
  const { count, error } = await supabase
    .from("daily_summaries")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)

  if (error) {
    throw new Error(error.message)
  }

  return count || 0
}
