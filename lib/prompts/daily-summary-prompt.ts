/**
 * Prompt template for generating daily conversation summaries
 */

export const DAILY_SUMMARY_SYSTEM_PROMPT = `You are an expert at summarizing conversations. Your task is to create concise, meaningful daily summaries of user conversations with AI assistants.

Guidelines:
- Focus on the "what" and "why" rather than just listing topics
- Highlight key decisions, insights, and learnings
- Keep each section brief (2-4 bullet points maximum)
- Use clear, active language
- Extract 3-5 relevant topic tags
- Total summary should be 150-250 words

Return your response as a JSON object with this exact structure:
{
  "summary": "# Daily Summary\\n\\n## Main Activities\\n- Activity 1\\n- Activity 2\\n\\n## Key Insights\\n- Insight 1\\n- Insight 2\\n\\n## Decisions Made\\n- Decision 1\\n\\n## Follow-up Items\\n- Item 1",
  "key_topics": ["topic1", "topic2", "topic3"]
}

The summary field should be in Markdown format with the sections:
- Main Activities: What the user worked on or discussed
- Key Insights: Important learnings or realizations
- Decisions Made: Choices or commitments made (omit if none)
- Follow-up Items: Things to revisit or continue (omit if none)

Keep it concise and actionable.`

export interface DailySummaryPromptInput {
  date: string
  messages: Array<{
    role: string
    content: string
    created_at: string
  }>
  messageCount: number
}

export function buildDailySummaryPrompt(
  input: DailySummaryPromptInput
): string {
  const { date, messages, messageCount } = input

  // Format messages for the prompt
  const formattedMessages = messages
    .map((msg, index) => {
      const timestamp = new Date(msg.created_at).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit"
      })
      const role = msg.role === "user" ? "User" : "Assistant"
      // Truncate very long messages
      const content =
        msg.content.length > 500
          ? msg.content.substring(0, 500) + "..."
          : msg.content
      return `[${timestamp}] ${role}: ${content}`
    })
    .join("\n\n")

  return `Analyze the following conversation from ${date} and generate a daily summary.

Conversation Statistics:
- Total messages: ${messageCount}
- Conversation span: ${messages.length > 0 ? "Throughout the day" : "No messages"}

Conversation:
${formattedMessages}

${formattedMessages.length === 0 ? "Note: This day had no conversation messages. Generate a brief summary indicating no activity." : ""}

Generate a JSON response with the summary and key topics.`
}

export const FEW_SHOT_EXAMPLES = `
Example 1:
Input: User discussed implementing a new authentication system, compared OAuth vs JWT approaches, and decided to use JWT with refresh tokens. Also fixed some TypeScript errors.

Output:
{
  "summary": "# Daily Summary\\n\\n## Main Activities\\n- Designed authentication system architecture\\n- Compared OAuth 2.0 and JWT approaches\\n- Fixed TypeScript compilation errors in auth module\\n\\n## Key Insights\\n- JWT with refresh tokens provides better scalability for our use case\\n- Refresh token rotation enhances security\\n\\n## Decisions Made\\n- Chose JWT authentication with 15-minute access tokens\\n- Implemented Redis-based refresh token storage\\n\\n## Follow-up Items\\n- Add rate limiting to auth endpoints\\n- Write integration tests for token refresh flow",
  "key_topics": ["authentication", "JWT", "TypeScript", "security", "architecture"]
}

Example 2:
Input: User explored React performance optimization, learned about useMemo and useCallback, and refactored several components.

Output:
{
  "summary": "# Daily Summary\\n\\n## Main Activities\\n- Investigated React performance bottlenecks in dashboard\\n- Learned about React optimization hooks (useMemo, useCallback)\\n- Refactored 5 components to reduce unnecessary re-renders\\n\\n## Key Insights\\n- Excessive re-renders were caused by inline function definitions\\n- useMemo is useful for expensive calculations, not all values\\n- Component composition can be more effective than memoization\\n\\n## Follow-up Items\\n- Profile the app to measure performance improvements\\n- Consider using React DevTools Profiler for future optimization",
  "key_topics": ["React", "performance", "optimization", "hooks", "refactoring"]
}
`
