import { getSupabase, getUserContext } from "../utils/supabase-client.js";
import {
  DailySummary,
  GetDailySummariesParams,
  ToolResult,
} from "../utils/types.js";

/**
 * Get daily conversation summaries within a date range
 * Useful for recalling what happened on specific days
 */
export async function getDailySummaries(
  params: GetDailySummariesParams
): Promise<ToolResult<DailySummary[]>> {
  try {
    const supabase = getSupabase();
    const { userId, workspaceId } = getUserContext();

    const { startDate, endDate, limit = 7 } = params;

    let query = supabase
      .from("daily_summaries")
      .select("*")
      .eq("user_id", userId)
      .eq("workspace_id", workspaceId)
      .order("date", { ascending: false })
      .limit(limit);

    // Apply date filters if provided
    if (startDate) {
      query = query.gte("date", startDate);
    }
    if (endDate) {
      query = query.lte("date", endDate);
    }

    const { data, error } = await query;

    if (error) {
      return {
        success: false,
        error: `Failed to fetch summaries: ${error.message}`,
      };
    }

    if (!data || data.length === 0) {
      return {
        success: true,
        data: [],
      };
    }

    return {
      success: true,
      data: data as DailySummary[],
    };
  } catch (err) {
    return {
      success: false,
      error: `Unexpected error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Format summaries for display
 */
export function formatSummariesForDisplay(summaries: DailySummary[]): string {
  if (summaries.length === 0) {
    return "No summaries found for the specified period.";
  }

  return summaries
    .map((s) => {
      const topics = s.key_topics?.length
        ? `Topics: ${s.key_topics.join(", ")}`
        : "";
      const msgCount = s.message_count
        ? `(${s.message_count} messages)`
        : "";

      return `## ${s.date} ${msgCount}
${topics}

${s.summary}`;
    })
    .join("\n\n---\n\n");
}

// Tool definition for MCP
export const getDailySummariesTool = {
  name: "get_daily_summaries",
  description:
    "Get daily conversation summaries within a date range. Use this to recall what happened on specific days, understand past discussions, or find context from previous conversations.",
  inputSchema: {
    type: "object" as const,
    properties: {
      startDate: {
        type: "string",
        description: "Start date in YYYY-MM-DD format (e.g., 2026-01-15)",
      },
      endDate: {
        type: "string",
        description: "End date in YYYY-MM-DD format (e.g., 2026-01-19)",
      },
      limit: {
        type: "number",
        description: "Maximum number of summaries to return (default: 7)",
        default: 7,
      },
    },
  },
};
