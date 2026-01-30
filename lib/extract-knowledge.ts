/**
 * AI-powered knowledge extraction from conversations
 */

import { ExtractedKnowledge } from "@/types/knowledge-entry"
import {
  KNOWLEDGE_EXTRACTION_SYSTEM_PROMPT,
  buildKnowledgeExtractionPrompt,
  KnowledgeExtractionInput
} from "./prompts/knowledge-extraction-prompt"

export interface ExtractKnowledgeOptions {
  model?: string
  apiKey?: string
  provider?: "openai" | "anthropic"
}

/**
 * Extract knowledge from conversation messages
 */
export async function extractKnowledge(
  messages: Array<{ role: string; content: string }>,
  options?: ExtractKnowledgeOptions
): Promise<ExtractedKnowledge> {
  const emptyResult: ExtractedKnowledge = {
    lessons: [],
    highlights: [],
    inspirations: []
  }

  if (!messages || messages.length === 0) {
    return emptyResult
  }

  // Filter to user and assistant messages only
  const relevantMessages = messages.filter(
    msg => msg.role === "user" || msg.role === "assistant"
  )

  if (relevantMessages.length === 0) {
    return emptyResult
  }

  const promptInput: KnowledgeExtractionInput = {
    messages: relevantMessages
  }

  const userPrompt = buildKnowledgeExtractionPrompt(promptInput)

  const provider = options?.provider || "openai"
  const model =
    options?.model ||
    (provider === "openai" ? "gpt-4o-mini" : "claude-3-haiku-20240307")

  try {
    let result: ExtractedKnowledge

    if (provider === "openai") {
      result = await extractWithOpenAI(userPrompt, model, options?.apiKey)
    } else {
      result = await extractWithAnthropic(userPrompt, model, options?.apiKey)
    }

    // Validate and sanitize
    result.lessons = (result.lessons || [])
      .filter(
        e => e.content && e.content.length >= 5 && e.content.length <= 500
      )
      .map(e => ({
        content: e.content,
        tags: (e.tags || []).slice(0, 10)
      }))

    result.highlights = (result.highlights || [])
      .filter(
        e => e.content && e.content.length >= 5 && e.content.length <= 500
      )
      .map(e => ({
        content: e.content,
        tags: (e.tags || []).slice(0, 10)
      }))

    result.inspirations = (result.inspirations || [])
      .filter(
        e => e.content && e.content.length >= 5 && e.content.length <= 500
      )
      .map(e => ({
        content: e.content,
        tags: (e.tags || []).slice(0, 10)
      }))

    return result
  } catch (error: any) {
    console.error("Error extracting knowledge:", error)
    return emptyResult
  }
}

async function extractWithOpenAI(
  userPrompt: string,
  model: string,
  apiKey?: string
): Promise<ExtractedKnowledge> {
  const OpenAI = (await import("openai")).default

  const openai = new OpenAI({
    apiKey: apiKey || process.env.OPENAI_API_KEY
  })

  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: KNOWLEDGE_EXTRACTION_SYSTEM_PROMPT },
      { role: "user", content: userPrompt }
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
    max_tokens: 2000
  })

  const content = completion.choices[0]?.message?.content
  if (!content) {
    throw new Error("No content returned from OpenAI")
  }

  return JSON.parse(content)
}

async function extractWithAnthropic(
  userPrompt: string,
  model: string,
  apiKey?: string
): Promise<ExtractedKnowledge> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default

  const anthropic = new Anthropic({
    apiKey: apiKey || process.env.ANTHROPIC_API_KEY
  })

  const message = await anthropic.messages.create({
    model,
    max_tokens: 2000,
    temperature: 0.3,
    system: KNOWLEDGE_EXTRACTION_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }]
  })

  const content = message.content[0]
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Anthropic")
  }

  const jsonMatch = content.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error("Could not extract JSON from Anthropic response")
  }

  return JSON.parse(jsonMatch[0])
}
