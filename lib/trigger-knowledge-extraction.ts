import { extractKnowledge } from "@/lib/extract-knowledge"
import { createClient } from "@supabase/supabase-js"

/**
 * Trigger background knowledge extraction from conversation messages.
 * Includes duplicate checking before inserting.
 */
export async function triggerKnowledgeExtraction(
  conversationMessages: Array<{ role: string; content: string }>,
  userId: string,
  workspaceId: string,
  chatId?: string,
  openaiApiKey?: string
) {
  try {
    // Only extract from substantive conversations
    const totalLength = conversationMessages.reduce(
      (sum, m) => sum + m.content.length,
      0
    )
    if (totalLength < 100) return

    const extracted = await extractKnowledge(conversationMessages, {
      apiKey: openaiApiKey || undefined,
      provider: "openai"
    })

    const candidates = [
      ...extracted.lessons.map(e => ({
        type: "lesson" as const,
        content: e.content,
        tags: e.tags
      })),
      ...extracted.highlights.map(e => ({
        type: "highlight" as const,
        content: e.content,
        tags: e.tags
      })),
      ...extracted.inspirations.map(e => ({
        type: "inspiration" as const,
        content: e.content,
        tags: e.tags
      }))
    ]

    if (candidates.length === 0) return

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Deduplicate: check each candidate against existing entries
    const entriesToInsert = []

    for (const candidate of candidates) {
      const { data: duplicates } = await supabase.rpc(
        "check_duplicate_knowledge",
        {
          p_user_id: userId,
          p_workspace_id: workspaceId,
          p_type: candidate.type,
          p_content: candidate.content,
          p_similarity_threshold: 0.85
        }
      )

      if (!duplicates || duplicates.length === 0) {
        entriesToInsert.push({
          user_id: userId,
          workspace_id: workspaceId,
          type: candidate.type,
          content: candidate.content,
          tags: candidate.tags,
          source_chat_id: chatId || null
        })
      }
    }

    if (entriesToInsert.length === 0) return

    await supabase.from("knowledge_entries").insert(entriesToInsert)
  } catch (error) {
    console.error("Background knowledge extraction failed:", error)
  }
}
