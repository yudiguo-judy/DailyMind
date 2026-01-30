import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers"
import {
  openAIStreamToReadableStream,
  createStreamingResponse
} from "@/lib/stream-utils"
import { triggerKnowledgeExtraction } from "@/lib/trigger-knowledge-extraction"
import { ChatSettings } from "@/types"
import { ServerRuntime } from "next"
import OpenAI from "openai"
import { ChatCompletionCreateParamsBase } from "openai/resources/chat/completions.mjs"

export async function POST(request: Request) {
  const json = await request.json()
  const { chatSettings, messages, workspaceId, chatId } = json as {
    chatSettings: ChatSettings
    messages: any[]
    workspaceId?: string
    chatId?: string
  }

  try {
    const profile = await getServerProfile()

    checkApiKey(profile.openai_api_key, "OpenAI")

    // Build conversation for extraction
    const conversationForExtraction = messages
      .filter(
        (m: any) =>
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string"
      )
      .map((m: any) => ({ role: m.role, content: m.content }))

    const onStreamComplete = workspaceId
      ? (assistantText: string) => {
          const fullConversation = [
            ...conversationForExtraction,
            { role: "assistant", content: assistantText }
          ]
          triggerKnowledgeExtraction(
            fullConversation,
            profile.user_id,
            workspaceId,
            chatId,
            profile.openai_api_key || undefined
          )
        }
      : undefined

    const openai = new OpenAI({
      apiKey: profile.openai_api_key || "",
      organization: profile.openai_organization_id
    })

    const response = await openai.chat.completions.create({
      model: chatSettings.model as ChatCompletionCreateParamsBase["model"],
      messages: messages as ChatCompletionCreateParamsBase["messages"],
      temperature: chatSettings.temperature,
      max_tokens:
        chatSettings.model === "gpt-4-vision-preview" ||
        chatSettings.model === "gpt-4o"
          ? 4096
          : null, // TODO: Fix
      stream: true
    })

    const stream = openAIStreamToReadableStream(response, onStreamComplete)

    return createStreamingResponse(stream)
  } catch (error: any) {
    let errorMessage = error.message || "An unexpected error occurred"
    const errorCode = error.status || 500

    if (errorMessage.toLowerCase().includes("api key not found")) {
      errorMessage =
        "OpenAI API Key not found. Please set it in your profile settings."
    } else if (errorMessage.toLowerCase().includes("incorrect api key")) {
      errorMessage =
        "OpenAI API Key is incorrect. Please fix it in your profile settings."
    }

    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
