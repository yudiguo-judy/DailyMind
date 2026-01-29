#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import {
  getDailySummaries,
  getDailySummariesTool,
  formatSummariesForDisplay,
} from "./tools/get-daily-summaries.js";
import {
  getFullChatHistory,
  getFullChatHistoryTool,
  formatChatHistoryForDisplay,
} from "./tools/get-full-chat-history.js";
import {
  searchKnowledge,
  searchKnowledgeTool,
  formatKnowledgeForDisplay,
} from "./tools/search-knowledge.js";
import {
  addKnowledgeEntry,
  addKnowledgeEntryTool,
  formatAddEntryResult,
} from "./tools/add-knowledge-entry.js";

// Server instance
const server = new Server(
  {
    name: "dailymind-memory",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      getDailySummariesTool,
      getFullChatHistoryTool,
      searchKnowledgeTool,
      addKnowledgeEntryTool,
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "get_daily_summaries": {
        const params = args as {
          startDate?: string;
          endDate?: string;
          limit?: number;
        };
        const result = await getDailySummaries(params);

        if (!result.success) {
          return {
            content: [{ type: "text", text: `Error: ${result.error}` }],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text",
              text: formatSummariesForDisplay(result.data || []),
            },
          ],
        };
      }

      case "get_full_chat_history": {
        const params = args as {
          date: string;
          chatId?: string;
        };
        const result = await getFullChatHistory(params);

        if (!result.success) {
          return {
            content: [{ type: "text", text: `Error: ${result.error}` }],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text",
              text: formatChatHistoryForDisplay(result.data || []),
            },
          ],
        };
      }

      case "search_knowledge": {
        const params = args as {
          type?: "lesson" | "highlight" | "inspiration" | "all";
          query?: string;
          tags?: string[];
          limit?: number;
        };
        const result = await searchKnowledge(params);

        if (!result.success) {
          return {
            content: [{ type: "text", text: `Error: ${result.error}` }],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text",
              text: formatKnowledgeForDisplay(result.data || []),
            },
          ],
        };
      }

      case "add_knowledge_entry": {
        const params = args as {
          type: "lesson" | "highlight" | "inspiration";
          content: string;
          tags?: string[];
        };
        const result = await addKnowledgeEntry(params);

        return {
          content: [
            {
              type: "text",
              text: formatAddEntryResult(result),
            },
          ],
          isError: !result.success,
        };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error executing tool: ${errorMessage}` }],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr so it doesn't interfere with MCP protocol
  console.error("DailyMind Memory MCP Server started");
  console.error("Available tools:");
  console.error("  - get_daily_summaries: Get daily conversation summaries");
  console.error("  - get_full_chat_history: Read full chat history for a date");
  console.error("  - search_knowledge: Search lessons, highlights, inspirations");
  console.error("  - add_knowledge_entry: Add new knowledge entry");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
