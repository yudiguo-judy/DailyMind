import { getSupabase, getUserContext } from "../utils/supabase-client.js";
import {
  Message,
  Chat,
  GetFullChatHistoryParams,
  ToolResult,
} from "../utils/types.js";

interface ChatWithMessages {
  chat: Chat;
  messages: Message[];
}

/**
 * Get full chat history for a specific date
 * Useful for diving deep into specific conversations
 */
export async function getFullChatHistory(
  params: GetFullChatHistoryParams
): Promise<ToolResult<ChatWithMessages[]>> {
  try {
    const supabase = getSupabase();
    const { userId, workspaceId } = getUserContext();

    const { date, chatId } = params;

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return {
        success: false,
        error: "Invalid date format. Please use YYYY-MM-DD format.",
      };
    }

    // Calculate date range for the given day
    const startOfDay = `${date}T00:00:00.000Z`;
    const endOfDay = `${date}T23:59:59.999Z`;

    // First, get chats for the specified date
    let chatsQuery = supabase
      .from("chats")
      .select("*")
      .eq("user_id", userId)
      .eq("workspace_id", workspaceId)
      .gte("created_at", startOfDay)
      .lte("created_at", endOfDay)
      .order("created_at", { ascending: true });

    if (chatId) {
      chatsQuery = chatsQuery.eq("id", chatId);
    }

    const { data: chats, error: chatsError } = await chatsQuery;

    if (chatsError) {
      return {
        success: false,
        error: `Failed to fetch chats: ${chatsError.message}`,
      };
    }

    if (!chats || chats.length === 0) {
      return {
        success: true,
        data: [],
      };
    }

    // Get messages for each chat
    const chatIds = chats.map((c) => c.id);
    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("*")
      .in("chat_id", chatIds)
      .order("sequence_number", { ascending: true });

    if (messagesError) {
      return {
        success: false,
        error: `Failed to fetch messages: ${messagesError.message}`,
      };
    }

    // Group messages by chat
    const result: ChatWithMessages[] = chats.map((chat) => ({
      chat: chat as Chat,
      messages: (messages || []).filter(
        (m) => m.chat_id === chat.id
      ) as Message[],
    }));

    return {
      success: true,
      data: result,
    };
  } catch (err) {
    return {
      success: false,
      error: `Unexpected error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Format chat history for display
 */
export function formatChatHistoryForDisplay(
  chatHistory: ChatWithMessages[]
): string {
  if (chatHistory.length === 0) {
    return "No conversations found for the specified date.";
  }

  return chatHistory
    .map(({ chat, messages }) => {
      const formattedMessages = messages
        .map((m) => {
          const role = m.role === "user" ? "User" : "Assistant";
          const time = new Date(m.created_at).toLocaleTimeString();
          // Truncate very long messages
          const content =
            m.content.length > 2000
              ? m.content.substring(0, 2000) + "... [truncated]"
              : m.content;
          return `**${role}** (${time}):\n${content}`;
        })
        .join("\n\n");

      return `# Chat: ${chat.name || "Untitled"}
Started: ${new Date(chat.created_at).toLocaleString()}
Messages: ${messages.length}

${formattedMessages}`;
    })
    .join("\n\n---\n\n");
}

// Tool definition for MCP
export const getFullChatHistoryTool = {
  name: "get_full_chat_history",
  description:
    "Read full conversation history for a specific date. Use this to dive deep into specific conversations when summaries don't provide enough detail, or to understand the exact context of past discussions.",
  inputSchema: {
    type: "object" as const,
    properties: {
      date: {
        type: "string",
        description: "The date to query in YYYY-MM-DD format (e.g., 2026-01-19)",
      },
      chatId: {
        type: "string",
        description:
          "Optional: Specific chat ID. If not provided, returns all conversations from that date.",
      },
    },
    required: ["date"],
  },
};
