/**
 * AI-powered daily summary generation
 */

import { Tables } from "@/supabase/types"
import {
  DAILY_SUMMARY_SYSTEM_PROMPT,
  buildDailySummaryPrompt,
  DailySummaryPromptInput
} from "./prompts/daily-summary-prompt"

export interface GenerateSummaryResult {
  summary: string
  key_topics: string[]
}

export interface GenerateSummaryOptions {
  model?: string
  apiKey?: string
  provider?: "openai" | "anthropic"
}

/**
 * Generate a daily summary from conversation messages
 */
export async function generateDailySummary(
  messages: Tables<"messages">[],
  date: string,
  options?: GenerateSummaryOptions
): Promise<GenerateSummaryResult> {
  // Validate inputs
  if (!messages || messages.length === 0) {
    return {
      summary: `# ${date} - No Activity\n\nNo conversations recorded for this day.`,
      key_topics: []
    }
  }

  // Filter out system messages and format for prompt
  const relevantMessages = messages
    .filter(msg => msg.role === "user" || msg.role === "assistant")
    .sort((a, b) => a.sequence_number - b.sequence_number)
    .map(msg => ({
      role: msg.role,
      content: msg.content,
      created_at: msg.created_at
    }))

  // Build the prompt
  const promptInput: DailySummaryPromptInput = {
    date,
    messages: relevantMessages,
    messageCount: relevantMessages.length
  }

  const userPrompt = buildDailySummaryPrompt(promptInput)

  // Choose provider and model
  const provider = options?.provider || "openai"
  const model =
    options?.model ||
    (provider === "openai" ? "gpt-4o-mini" : "claude-3-haiku-20240307")

  try {
    let result: GenerateSummaryResult

    if (provider === "openai") {
      result = await generateWithOpenAI(userPrompt, model, options?.apiKey)
    } else {
      result = await generateWithAnthropic(userPrompt, model, options?.apiKey)
    }

    // Validate result
    if (!result.summary || !Array.isArray(result.key_topics)) {
      throw new Error("Invalid summary format returned from AI")
    }

    // Ensure key_topics has reasonable length
    result.key_topics = result.key_topics.slice(0, 10)

    return result
  } catch (error: any) {
    console.error("Error generating daily summary:", error)
    throw new Error(`Failed to generate summary: ${error.message}`)
  }
}

/**
 * Generate summary using OpenAI API
 */
async function generateWithOpenAI(
  userPrompt: string,
  model: string,
  apiKey?: string
): Promise<GenerateSummaryResult> {
  const OpenAI = (await import("openai")).default

  const openai = new OpenAI({
    apiKey: apiKey || process.env.OPENAI_API_KEY
  })

  const completion = await openai.chat.completions.create({
    model: model,
    messages: [
      {
        role: "system",
        content: DAILY_SUMMARY_SYSTEM_PROMPT
      },
      {
        role: "user",
        content: userPrompt
      }
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
    max_tokens: 1000
  })

  const content = completion.choices[0]?.message?.content

  if (!content) {
    throw new Error("No content returned from OpenAI")
  }

  const parsed = JSON.parse(content)
  return {
    summary: parsed.summary,
    key_topics: parsed.key_topics || []
  }
}

/**
 * Generate summary using Anthropic API
 */
async function generateWithAnthropic(
  userPrompt: string,
  model: string,
  apiKey?: string
): Promise<GenerateSummaryResult> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default

  const anthropic = new Anthropic({
    apiKey: apiKey || process.env.ANTHROPIC_API_KEY
  })

  const message = await anthropic.messages.create({
    model: model,
    max_tokens: 1000,
    temperature: 0.3,
    system: DAILY_SUMMARY_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: userPrompt
      }
    ]
  })

  const content = message.content[0]
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Anthropic")
  }

  // Anthropic doesn't have JSON mode, so we need to extract JSON from text
  const text = content.text
  const jsonMatch = text.match(/\{[\s\S]*\}/)

  if (!jsonMatch) {
    throw new Error("Could not extract JSON from Anthropic response")
  }

  const parsed = JSON.parse(jsonMatch[0])
  return {
    summary: parsed.summary,
    key_topics: parsed.key_topics || []
  }
}

/**
 * Extract key topics from messages (fallback if AI fails)
 */
export function extractKeyTopicsFromMessages(
  messages: Tables<"messages">[]
): string[] {
  // Simple keyword extraction as fallback
  const text = messages
    .map(m => m.content)
    .join(" ")
    .toLowerCase()

  const commonWords = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "from",
    "as",
    "is",
    "was",
    "are",
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should",
    "can",
    "may",
    "might",
    "i",
    "you",
    "he",
    "she",
    "it",
    "we",
    "they",
    "this",
    "that",
    "these",
    "those",
    "what",
    "which",
    "who",
    "when",
    "where",
    "why",
    "how"
  ])

  const words = text
    .split(/\W+/)
    .filter(w => w.length > 3 && !commonWords.has(w))

  const wordCounts: Record<string, number> = {}
  words.forEach(word => {
    wordCounts[word] = (wordCounts[word] || 0) + 1
  })

  return Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word)
}
