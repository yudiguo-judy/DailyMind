import { getSupabase, getUserContext } from "../utils/supabase-client.js";
import {
  KnowledgeEntry,
  AddKnowledgeEntryParams,
  ToolResult,
} from "../utils/types.js";

// Content length limit
const MAX_CONTENT_LENGTH = 200;

/**
 * Add a new entry to the knowledge base
 * Lessons: mistakes made, things learned
 * Highlights: successes, good decisions
 * Inspirations: new ideas, creative thoughts
 */
export async function addKnowledgeEntry(
  params: AddKnowledgeEntryParams
): Promise<ToolResult<KnowledgeEntry>> {
  try {
    const supabase = getSupabase();
    const { userId, workspaceId } = getUserContext();

    const { type, content, tags = [] } = params;

    // Validate type
    if (!["lesson", "highlight", "inspiration"].includes(type)) {
      return {
        success: false,
        error: "Invalid type. Must be 'lesson', 'highlight', or 'inspiration'.",
      };
    }

    // Validate content
    if (!content || content.trim().length === 0) {
      return {
        success: false,
        error: "Content is required and cannot be empty.",
      };
    }

    // Check content length
    if (content.length > MAX_CONTENT_LENGTH) {
      return {
        success: false,
        error: `Content is too long. Maximum ${MAX_CONTENT_LENGTH} characters allowed. Current: ${content.length} characters.`,
      };
    }

    // Check for duplicates (simple exact match)
    const { data: existing } = await supabase
      .from("knowledge_entries")
      .select("id, content")
      .eq("user_id", userId)
      .eq("workspace_id", workspaceId)
      .eq("type", type)
      .ilike("content", content.trim())
      .limit(1);

    if (existing && existing.length > 0) {
      return {
        success: false,
        error: "A similar entry already exists in your knowledge base.",
      };
    }

    // Clean and normalize tags
    const cleanedTags = tags
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0)
      .filter((t, i, arr) => arr.indexOf(t) === i); // Remove duplicates

    // Insert the new entry
    const { data, error } = await supabase
      .from("knowledge_entries")
      .insert({
        user_id: userId,
        workspace_id: workspaceId,
        type,
        content: content.trim(),
        tags: cleanedTags.length > 0 ? cleanedTags : null,
      })
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: `Failed to add entry: ${error.message}`,
      };
    }

    return {
      success: true,
      data: data as KnowledgeEntry,
    };
  } catch (err) {
    return {
      success: false,
      error: `Unexpected error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Format the result of adding an entry
 */
export function formatAddEntryResult(
  result: ToolResult<KnowledgeEntry>
): string {
  if (!result.success) {
    return `Failed to add entry: ${result.error}`;
  }

  const entry = result.data!;
  const typeEmoji = {
    lesson: "📚",
    highlight: "⭐",
    inspiration: "💡",
  };

  const tags = entry.tags?.length ? `\nTags: ${entry.tags.join(", ")}` : "";

  return `${typeEmoji[entry.type]} Successfully added to ${entry.type}s!

"${entry.content}"${tags}

ID: ${entry.id}`;
}

// Tool definition for MCP
export const addKnowledgeEntryTool = {
  name: "add_knowledge_entry",
  description:
    "Add a new entry to the user's knowledge base. Use this to save important lessons learned, notable successes (highlights), or creative ideas (inspirations) from the conversation. Keep entries concise (max 200 characters).",
  inputSchema: {
    type: "object" as const,
    properties: {
      type: {
        type: "string",
        enum: ["lesson", "highlight", "inspiration"],
        description:
          "Type of knowledge: 'lesson' for mistakes/learnings, 'highlight' for successes, 'inspiration' for ideas",
      },
      content: {
        type: "string",
        description:
          "The knowledge content. Keep it concise and actionable (max 200 characters).",
      },
      tags: {
        type: "array",
        items: { type: "string" },
        description:
          "Optional tags to categorize the entry (e.g., ['programming', 'communication'])",
      },
    },
    required: ["type", "content"],
  },
};
