/**
 * Memory tools definitions for Anthropic API
 * These tools allow the AI to access conversation history and knowledge base
 */

import Anthropic from "@anthropic-ai/sdk"

export const MEMORY_TOOLS: Anthropic.Tool[] = [
  {
    name: "get_daily_summaries",
    description:
      "Get daily conversation summaries within a date range. Use this to recall what happened on specific days, understand past discussions, or find context from previous conversations.",
    input_schema: {
      type: "object" as const,
      properties: {
        startDate: {
          type: "string",
          description: "Start date in YYYY-MM-DD format (e.g., 2026-01-15)"
        },
        endDate: {
          type: "string",
          description: "End date in YYYY-MM-DD format (e.g., 2026-01-19)"
        },
        limit: {
          type: "number",
          description: "Maximum number of summaries to return (default: 7)"
        }
      },
      required: []
    }
  },
  {
    name: "get_full_chat_history",
    description:
      "Read full conversation history for a specific date. Use this when you need detailed context about past discussions that summaries don't provide.",
    input_schema: {
      type: "object" as const,
      properties: {
        date: {
          type: "string",
          description:
            "The date to query in YYYY-MM-DD format (e.g., 2026-01-19)"
        },
        chatId: {
          type: "string",
          description:
            "Optional: Specific chat ID. If not provided, returns all conversations from that date."
        }
      },
      required: ["date"]
    }
  },
  {
    name: "search_knowledge",
    description:
      "Search the user's knowledge base containing lessons learned, highlights (successes), and inspirations (ideas). Use this to find relevant past experiences or insights.",
    input_schema: {
      type: "object" as const,
      properties: {
        type: {
          type: "string",
          enum: ["lesson", "highlight", "inspiration", "all"],
          description:
            "Type of knowledge to search: 'lesson' for mistakes/learnings, 'highlight' for successes, 'inspiration' for ideas, or 'all'"
        },
        query: {
          type: "string",
          description: "Search keywords to filter results"
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Filter by specific tags"
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default: 20)"
        }
      },
      required: []
    }
  },
  {
    name: "add_knowledge_entry",
    description:
      "Add a new entry to the user's knowledge base. Use this to save important lessons learned, notable successes (highlights), or creative ideas (inspirations) from the conversation. Keep entries concise (max 200 characters).",
    input_schema: {
      type: "object" as const,
      properties: {
        type: {
          type: "string",
          enum: ["lesson", "highlight", "inspiration"],
          description:
            "Type of knowledge: 'lesson' for mistakes/learnings, 'highlight' for successes, 'inspiration' for ideas"
        },
        content: {
          type: "string",
          description:
            "The knowledge content. Keep it concise and actionable (max 200 characters)."
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description:
            "Optional tags to categorize the entry (e.g., ['programming', 'communication'])"
        }
      },
      required: ["type", "content"]
    }
  }
]

// Tool names for easy reference
export const MEMORY_TOOL_NAMES = [
  "get_daily_summaries",
  "get_full_chat_history",
  "search_knowledge",
  "add_knowledge_entry"
] as const

export type MemoryToolName = (typeof MEMORY_TOOL_NAMES)[number]

export function isMemoryTool(name: string): name is MemoryToolName {
  return MEMORY_TOOL_NAMES.includes(name as MemoryToolName)
}
