import { supabase as typedSupabase } from "@/lib/supabase/browser-client"
import {
  CreateKnowledgeEntryInput,
  KnowledgeEntryFilters,
  KnowledgeSearchResult,
  KnowledgeStats,
  UpdateKnowledgeEntryInput
} from "@/types"

// Cast to any because the generated Supabase types don't include
// the knowledge_entries table or custom RPC functions yet
const supabase = typedSupabase as any

// ==================== GET OPERATIONS ====================

export const getKnowledgeEntryById = async (entryId: string) => {
  const { data: entry, error } = await supabase
    .from("knowledge_entries")
    .select("*")
    .eq("id", entryId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return entry
}

export const getKnowledgeEntriesByType = async (
  userId: string,
  workspaceId: string,
  type: "lesson" | "highlight" | "inspiration"
) => {
  const { data: entries, error } = await supabase
    .from("knowledge_entries")
    .select("*")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .eq("type", type)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return entries || []
}

export const getKnowledgeEntriesByWorkspace = async (
  userId: string,
  workspaceId: string,
  filters?: KnowledgeEntryFilters
) => {
  let query = supabase
    .from("knowledge_entries")
    .select("*")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)

  // Filter by type
  if (filters?.type && filters.type !== "all") {
    query = query.eq("type", filters.type)
  }

  // Filter by tags
  if (filters?.tags && filters.tags.length > 0) {
    query = query.overlaps("tags", filters.tags)
  }

  // Simple text search (if no advanced search needed)
  if (filters?.query && filters.query.trim() !== "") {
    query = query.ilike("content", `%${filters.query}%`)
  }

  // Sorting
  const sortBy = filters?.sortBy || "created_at"
  const sortOrder =
    filters?.sortOrder === "asc" ? { ascending: true } : { ascending: false }
  query = query.order(sortBy, sortOrder)

  // Pagination
  if (filters?.limit) {
    query = query.limit(filters.limit)
  }

  if (filters?.offset) {
    query = query.range(
      filters.offset,
      filters.offset + (filters.limit || 50) - 1
    )
  }

  const { data: entries, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return entries || []
}

export const getKnowledgeEntriesByTags = async (
  userId: string,
  workspaceId: string,
  tags: string[]
) => {
  const { data: entries, error } = await supabase
    .from("knowledge_entries")
    .select("*")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .overlaps("tags", tags)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return entries || []
}

export const getKnowledgeEntriesBySourceChat = async (
  userId: string,
  chatId: string
) => {
  const { data: entries, error } = await supabase
    .from("knowledge_entries")
    .select("*")
    .eq("user_id", userId)
    .eq("source_chat_id", chatId)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return entries || []
}

// ==================== SEARCH OPERATIONS ====================

export const searchKnowledgeEntries = async (
  userId: string,
  workspaceId: string,
  query: string,
  type?: "lesson" | "highlight" | "inspiration" | "all",
  tags?: string[],
  limit: number = 20
): Promise<KnowledgeSearchResult[]> => {
  const { data: results, error } = await supabase.rpc(
    "search_knowledge_entries",
    {
      p_user_id: userId,
      p_workspace_id: workspaceId,
      p_query: query,
      p_type: type === "all" ? null : type,
      p_tags: tags || null,
      p_limit: limit
    }
  )

  if (error) {
    throw new Error(error.message)
  }

  return results || []
}

// ==================== STATISTICS ====================

export const getKnowledgeStats = async (
  userId: string,
  workspaceId: string
): Promise<KnowledgeStats> => {
  const { data: stats, error } = await supabase
    .rpc("get_knowledge_stats", {
      p_user_id: userId,
      p_workspace_id: workspaceId
    })
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return stats
}

export const getAllKnowledgeTags = async (
  userId: string,
  workspaceId: string
) => {
  const { data: entries, error } = await supabase
    .from("knowledge_entries")
    .select("tags")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)

  if (error) {
    throw new Error(error.message)
  }

  // Flatten and deduplicate tags with counts
  const tagCounts: Record<string, number> = {}
  entries?.forEach((entry: any) => {
    entry.tags?.forEach((tag: string) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1
    })
  })

  // Sort by count descending
  const sortedTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => ({ tag, count }))

  return sortedTags
}

// ==================== CREATE OPERATIONS ====================

export const createKnowledgeEntry = async (
  entry: CreateKnowledgeEntryInput
) => {
  const { data: createdEntry, error } = await supabase
    .from("knowledge_entries")
    .insert([entry])
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return createdEntry
}

export const createKnowledgeEntries = async (
  entries: CreateKnowledgeEntryInput[]
) => {
  const { data: createdEntries, error } = await supabase
    .from("knowledge_entries")
    .insert(entries)
    .select("*")

  if (error) {
    throw new Error(error.message)
  }

  return createdEntries
}

// ==================== UPDATE OPERATIONS ====================

export const updateKnowledgeEntry = async (
  entryId: string,
  updates: UpdateKnowledgeEntryInput
) => {
  const { data: updatedEntry, error } = await supabase
    .from("knowledge_entries")
    .update(updates)
    .eq("id", entryId)
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return updatedEntry
}

export const bulkUpdateTags = async (
  userId: string,
  workspaceId: string,
  entryIds: string[],
  tagsToAdd?: string[],
  tagsToRemove?: string[]
) => {
  // This requires custom logic, fetching entries and updating tags
  const { data: entries, error: fetchError } = await supabase
    .from("knowledge_entries")
    .select("*")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .in("id", entryIds)

  if (fetchError) {
    throw new Error(fetchError.message)
  }

  const updates = entries?.map((entry: any) => {
    let newTags = [...(entry.tags || [])]

    if (tagsToAdd) {
      newTags = [...newTags, ...tagsToAdd.filter(t => !newTags.includes(t))]
    }

    if (tagsToRemove) {
      newTags = newTags.filter(t => !tagsToRemove.includes(t))
    }

    return {
      id: entry.id,
      tags: newTags
    }
  })

  if (!updates || updates.length === 0) {
    return []
  }

  const { data: updatedEntries, error: updateError } = await supabase
    .from("knowledge_entries")
    .upsert(updates)
    .select("*")

  if (updateError) {
    throw new Error(updateError.message)
  }

  return updatedEntries
}

// ==================== DELETE OPERATIONS ====================

export const deleteKnowledgeEntry = async (entryId: string) => {
  const { error } = await supabase
    .from("knowledge_entries")
    .delete()
    .eq("id", entryId)

  if (error) {
    throw new Error(error.message)
  }

  return true
}

export const deleteKnowledgeEntries = async (entryIds: string[]) => {
  const { error } = await supabase
    .from("knowledge_entries")
    .delete()
    .in("id", entryIds)

  if (error) {
    throw new Error(error.message)
  }

  return true
}

export const deleteKnowledgeEntriesByWorkspace = async (
  userId: string,
  workspaceId: string
) => {
  const { error } = await supabase
    .from("knowledge_entries")
    .delete()
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)

  if (error) {
    throw new Error(error.message)
  }

  return true
}

// ==================== DUPLICATE CHECK ====================

export const checkDuplicateKnowledge = async (
  userId: string,
  workspaceId: string,
  type: "lesson" | "highlight" | "inspiration",
  content: string,
  similarityThreshold: number = 0.85
) => {
  const { data: duplicates, error } = await supabase.rpc(
    "check_duplicate_knowledge",
    {
      p_user_id: userId,
      p_workspace_id: workspaceId,
      p_type: type,
      p_content: content,
      p_similarity_threshold: similarityThreshold
    }
  )

  if (error) {
    throw new Error(error.message)
  }

  return duplicates || []
}

// ==================== UTILITY FUNCTIONS ====================

export const getKnowledgeEntryCount = async (
  userId: string,
  workspaceId: string,
  type?: "lesson" | "highlight" | "inspiration"
): Promise<number> => {
  let query = supabase
    .from("knowledge_entries")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)

  if (type) {
    query = query.eq("type", type)
  }

  const { count, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return count || 0
}

export const renameTag = async (
  userId: string,
  workspaceId: string,
  oldTag: string,
  newTag: string
) => {
  // Fetch all entries with the old tag
  const { data: entries, error: fetchError } = await supabase
    .from("knowledge_entries")
    .select("*")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .contains("tags", [oldTag])

  if (fetchError) {
    throw new Error(fetchError.message)
  }

  if (!entries || entries.length === 0) {
    return []
  }

  // Update tags
  const updates = entries.map((entry: any) => ({
    id: entry.id,
    tags: entry.tags?.map((t: string) => (t === oldTag ? newTag : t))
  }))

  const { data: updatedEntries, error: updateError } = await supabase
    .from("knowledge_entries")
    .upsert(updates)
    .select("*")

  if (updateError) {
    throw new Error(updateError.message)
  }

  return updatedEntries
}

export const mergeKnowledgeEntries = async (
  userId: string,
  targetEntryId: string,
  sourceEntryIds: string[]
) => {
  // Fetch target and source entries
  const { data: target, error: targetError } = await supabase
    .from("knowledge_entries")
    .select("*")
    .eq("id", targetEntryId)
    .single()

  if (targetError) {
    throw new Error(targetError.message)
  }

  const { data: sources, error: sourcesError } = await supabase
    .from("knowledge_entries")
    .select("*")
    .in("id", sourceEntryIds)

  if (sourcesError) {
    throw new Error(sourcesError.message)
  }

  // Merge tags
  const allTags = new Set([
    ...(target.tags || []),
    ...sources.flatMap((s: any) => s.tags || [])
  ])

  // Update target with merged tags
  const { data: updatedTarget, error: updateError } = await supabase
    .from("knowledge_entries")
    .update({ tags: Array.from(allTags) })
    .eq("id", targetEntryId)
    .select("*")
    .single()

  if (updateError) {
    throw new Error(updateError.message)
  }

  // Delete source entries
  await deleteKnowledgeEntries(sourceEntryIds)

  return updatedTarget
}
