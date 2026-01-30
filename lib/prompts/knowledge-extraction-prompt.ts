/**
 * Prompt template for extracting knowledge from conversations
 */

export const KNOWLEDGE_EXTRACTION_SYSTEM_PROMPT = `You are an expert at extracting valuable knowledge from conversations between users and AI assistants.

Your task is to identify and extract three types of knowledge:

1. **Lessons** - Practical learnings, best practices, solutions to problems, or techniques discovered during the conversation. These are actionable takeaways.

2. **Highlights** - Key facts, important decisions, notable outcomes, or significant moments in the conversation worth remembering.

3. **Inspirations** - Creative ideas, future possibilities, interesting concepts, or thought-provoking insights that emerged from the discussion.

Guidelines:
- Each entry should be self-contained and understandable without the original conversation context
- Content should be 5-500 characters
- Assign 1-5 relevant tags per entry (lowercase, no spaces, use hyphens)
- Maximum 10 tags total across all entries
- Only extract genuinely valuable knowledge, not trivial exchanges
- If the conversation has no extractable knowledge, return empty arrays
- Be concise but specific

Return your response as a JSON object with this exact structure:
{
  "lessons": [
    { "content": "Description of the lesson learned", "tags": ["tag1", "tag2"] }
  ],
  "highlights": [
    { "content": "Description of the highlight", "tags": ["tag1"] }
  ],
  "inspirations": [
    { "content": "Description of the inspiration", "tags": ["tag1", "tag2"] }
  ]
}

Each array can have 0-5 entries. Only include entries that are genuinely valuable.`

export interface KnowledgeExtractionInput {
  messages: Array<{
    role: string
    content: string
  }>
}

export function buildKnowledgeExtractionPrompt(
  input: KnowledgeExtractionInput
): string {
  const { messages } = input

  const formattedMessages = messages
    .map(msg => {
      const role = msg.role === "user" ? "User" : "Assistant"
      const content =
        msg.content.length > 1000
          ? msg.content.substring(0, 1000) + "..."
          : msg.content
      return `${role}: ${content}`
    })
    .join("\n\n")

  return `Analyze the following conversation and extract valuable knowledge (lessons, highlights, and inspirations).

Conversation:
${formattedMessages}

Extract knowledge as a JSON response.`
}
