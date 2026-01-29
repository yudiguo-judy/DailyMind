import { getSupabase, getUserContext } from "../utils/supabase-client.js";
import {
  KnowledgeEntry,
  SearchKnowledgeParams,
  ToolResult,
} from "../utils/types.js";

/**
 * Search the knowledge base (lessons, highlights, inspirations)
 * Useful for finding relevant past experiences and insights
 */
export async function searchKnowledge(
  params: SearchKnowledgeParams
): Promise<ToolResult<KnowledgeEntry[]>> {
  try {
    const supabase = getSupabase();
    const { userId, workspaceId } = getUserContext();

    const { type = "all", query, tags, limit = 20 } = params;

    let dbQuery = supabase
      .from("knowledge_entries")
      .select("*")
      .eq("user_id", userId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(limit);

    // Filter by type
    if (type && type !== "all") {
      dbQuery = dbQuery.eq("type", type);
    }

    // Filter by tags (if any tag matches)
    if (tags && tags.length > 0) {
      dbQuery = dbQuery.overlaps("tags", tags);
    }

    const { data, error } = await dbQuery;

    if (error) {
      return {
        success: false,
        error: `Failed to search knowledge: ${error.message}`,
      };
    }

    let results = (data || []) as KnowledgeEntry[];

    // Apply text search filter (client-side for now)
    // In production, you'd use PostgreSQL full-text search
    if (query && query.trim()) {
      const searchTerms = query.toLowerCase().split(/\s+/);
      results = results.filter((entry) => {
        const content = entry.content.toLowerCase();
        const entryTags = (entry.tags || []).join(" ").toLowerCase();
        return searchTerms.some(
          (term) => content.includes(term) || entryTags.includes(term)
        );
      });
    }

    return {
      success: true,
      data: results,
    };
  } catch (err) {
    return {
      success: false,
      error: `Unexpected error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Format knowledge entries for display
 */
export function formatKnowledgeForDisplay(entries: KnowledgeEntry[]): string {
  if (entries.length === 0) {
    return "No knowledge entries found matching your criteria.";
  }

  const typeEmoji = {
    lesson: "📚",
    highlight: "⭐",
    inspiration: "💡",
  };

  const grouped: Record<string, KnowledgeEntry[]> = {
    lesson: [],
    highlight: [],
    inspiration: [],
  };

  entries.forEach((entry) => {
    if (grouped[entry.type]) {
      grouped[entry.type].push(entry);
    }
  });

  const sections: string[] = [];

  if (grouped.lesson.length > 0) {
    sections.push(`## ${typeEmoji.lesson} Lessons (${grouped.lesson.length})
${grouped.lesson.map((e) => formatEntry(e)).join("\n")}`);
  }

  if (grouped.highlight.length > 0) {
    sections.push(`## ${typeEmoji.highlight} Highlights (${grouped.highlight.length})
${grouped.highlight.map((e) => formatEntry(e)).join("\n")}`);
  }

  if (grouped.inspiration.length > 0) {
    sections.push(`## ${typeEmoji.inspiration} Inspirations (${grouped.inspiration.length})
${grouped.inspiration.map((e) => formatEntry(e)).join("\n")}`);
  }

  return sections.join("\n\n");
}

function formatEntry(entry: KnowledgeEntry): string {
  const tags = entry.tags?.length ? ` [${entry.tags.join(", ")}]` : "";
  const date = new Date(entry.created_at).toLocaleDateString();
  return `- ${entry.content}${tags} _(${date})_`;
}

// Tool definition for MCP
export const searchKnowledgeTool = {
  name: "search_knowledge",
  description:
    "Search the user's knowledge base containing lessons learned, highlights (successes), and inspirations (ideas). Use this to find relevant past experiences, mistakes to avoid, successful strategies, or creative ideas that might be relevant to the current discussion.",
  inputSchema: {
    type: "object" as const,
    properties: {
      type: {
        type: "string",
        enum: ["lesson", "highlight", "inspiration", "all"],
        description:
          "Type of knowledge to search: 'lesson' for mistakes/learnings, 'highlight' for successes, 'inspiration' for ideas, or 'all'",
        default: "all",
      },
      query: {
        type: "string",
        description: "Search keywords to filter results",
      },
      tags: {
        type: "array",
        items: { type: "string" },
        description: "Filter by specific tags",
      },
      limit: {
        type: "number",
        description: "Maximum number of results to return (default: 20)",
        default: 20,
      },
    },
  },
};
