import { CHAT_SETTING_LIMITS } from "@/lib/chat-setting-limits"
import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers"
import { getBase64FromDataURL, getMediaTypeFromDataURL } from "@/lib/utils"
import {
  MEMORY_TOOLS,
  isMemoryTool,
  executeMemoryTool
} from "@/lib/memory-tools"
import { ChatSettings } from "@/types"
import { Database } from "@/supabase/types"
import Anthropic from "@anthropic-ai/sdk"
import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

/**
 * Convert Anthropic streaming response to a ReadableStream for the browser
 */
function anthropicStreamToReadableStream(
  stream: AsyncIterable<Anthropic.MessageStreamEvent>
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta") {
            const delta = event.delta
            if ("text" in delta) {
              controller.enqueue(encoder.encode(delta.text))
            }
          }
        }
        controller.close()
      } catch (error) {
        controller.error(error)
      }
    }
  })
}

export const runtime = "edge"

// Maximum number of tool call iterations to prevent infinite loops
const MAX_TOOL_ITERATIONS = 5

export async function POST(request: NextRequest) {
  const json = await request.json()
  const {
    chatSettings,
    messages,
    workspaceId,
    enableMemoryTools = true
  } = json as {
    chatSettings: ChatSettings
    messages: any[]
    workspaceId?: string
    enableMemoryTools?: boolean
  }

  try {
    const profile = await getServerProfile()

    checkApiKey(profile.anthropic_api_key, "Anthropic")

    let ANTHROPIC_FORMATTED_MESSAGES: any = messages.slice(1)

    ANTHROPIC_FORMATTED_MESSAGES = ANTHROPIC_FORMATTED_MESSAGES?.map(
      (message: any) => {
        const messageContent =
          typeof message?.content === "string"
            ? [message.content]
            : message?.content

        return {
          ...message,
          content: messageContent.map((content: any) => {
            if (typeof content === "string") {
              // Handle the case where content is a string
              return { type: "text", text: content }
            } else if (
              content?.type === "image_url" &&
              content?.image_url?.url?.length
            ) {
              return {
                type: "image",
                source: {
                  type: "base64",
                  media_type: getMediaTypeFromDataURL(content.image_url.url),
                  data: getBase64FromDataURL(content.image_url.url)
                }
              }
            } else {
              return content
            }
          })
        }
      }
    )

    const anthropic = new Anthropic({
      apiKey: profile.anthropic_api_key || ""
    })

    // Determine if we should use memory tools
    const useMemoryTools = enableMemoryTools && workspaceId

    try {
      // If memory tools are enabled, we need to handle tool calls
      if (useMemoryTools) {
        // Create Supabase client for tool execution
        const cookieStore = cookies()
        const supabase = createServerClient<Database>(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            cookies: {
              get(name: string) {
                return cookieStore.get(name)?.value
              }
            }
          }
        )

        // Get user ID
        const {
          data: { user }
        } = await supabase.auth.getUser()
        if (!user) {
          throw new Error("User not found")
        }

        let currentMessages = [...ANTHROPIC_FORMATTED_MESSAGES]
        let iterations = 0

        // Tool call loop
        while (iterations < MAX_TOOL_ITERATIONS) {
          iterations++

          // Make API call with tools
          const response = await anthropic.messages.create({
            model: chatSettings.model,
            messages: currentMessages,
            temperature: chatSettings.temperature,
            system: messages[0].content,
            max_tokens:
              CHAT_SETTING_LIMITS[chatSettings.model].MAX_TOKEN_OUTPUT_LENGTH,
            tools: MEMORY_TOOLS,
            stream: false // Non-streaming for tool calls
          })

          // Check if there are tool uses
          const toolUseBlocks = response.content.filter(
            (block): block is Anthropic.ToolUseBlock =>
              block.type === "tool_use"
          )

          // If no tool uses or stop reason is end_turn, we're done with tools
          if (
            toolUseBlocks.length === 0 ||
            response.stop_reason === "end_turn"
          ) {
            // Final streaming response
            const finalResponse = await anthropic.messages.create({
              model: chatSettings.model,
              messages: currentMessages,
              temperature: chatSettings.temperature,
              system: messages[0].content,
              max_tokens:
                CHAT_SETTING_LIMITS[chatSettings.model].MAX_TOKEN_OUTPUT_LENGTH,
              stream: true
            })

            const stream = anthropicStreamToReadableStream(finalResponse)
            return new Response(stream, {
              headers: { "Content-Type": "text/plain; charset=utf-8" }
            })
          }

          // Process tool calls
          const assistantMessage: Anthropic.MessageParam = {
            role: "assistant",
            content: response.content
          }
          currentMessages.push(assistantMessage)

          // Execute each tool and collect results
          const toolResults: Anthropic.ToolResultBlockParam[] = []

          for (const toolUse of toolUseBlocks) {
            if (isMemoryTool(toolUse.name)) {
              const result = await executeMemoryTool(
                supabase,
                user.id,
                workspaceId,
                toolUse.name,
                toolUse.input as Record<string, unknown>
              )

              toolResults.push({
                type: "tool_result",
                tool_use_id: toolUse.id,
                content: result
              })
            } else {
              toolResults.push({
                type: "tool_result",
                tool_use_id: toolUse.id,
                content: `Unknown tool: ${toolUse.name}`,
                is_error: true
              })
            }
          }

          // Add tool results to messages
          const userToolResultMessage: Anthropic.MessageParam = {
            role: "user",
            content: toolResults
          }
          currentMessages.push(userToolResultMessage)
        }

        // If we hit max iterations, return final streaming response
        const finalResponse = await anthropic.messages.create({
          model: chatSettings.model,
          messages: currentMessages,
          temperature: chatSettings.temperature,
          system: messages[0].content,
          max_tokens:
            CHAT_SETTING_LIMITS[chatSettings.model].MAX_TOKEN_OUTPUT_LENGTH,
          stream: true
        })

        const stream = anthropicStreamToReadableStream(finalResponse)
        return new Response(stream, {
          headers: { "Content-Type": "text/plain; charset=utf-8" }
        })
      }

      // Original non-tool flow
      const response = await anthropic.messages.create({
        model: chatSettings.model,
        messages: ANTHROPIC_FORMATTED_MESSAGES,
        temperature: chatSettings.temperature,
        system: messages[0].content,
        max_tokens:
          CHAT_SETTING_LIMITS[chatSettings.model].MAX_TOKEN_OUTPUT_LENGTH,
        stream: true
      })

      try {
        const stream = anthropicStreamToReadableStream(response)
        return new Response(stream, {
          headers: { "Content-Type": "text/plain; charset=utf-8" }
        })
      } catch (error: any) {
        console.error("Error parsing Anthropic API response:", error)
        return new NextResponse(
          JSON.stringify({
            message:
              "An error occurred while parsing the Anthropic API response"
          }),
          { status: 500 }
        )
      }
    } catch (error: any) {
      console.error("Error calling Anthropic API:", error)
      return new NextResponse(
        JSON.stringify({
          message: "An error occurred while calling the Anthropic API"
        }),
        { status: 500 }
      )
    }
  } catch (error: any) {
    let errorMessage = error.message || "An unexpected error occurred"
    const errorCode = error.status || 500

    if (errorMessage.toLowerCase().includes("api key not found")) {
      errorMessage =
        "Anthropic API Key not found. Please set it in your profile settings."
    } else if (errorCode === 401) {
      errorMessage =
        "Anthropic API Key is incorrect. Please fix it in your profile settings."
    }

    return new NextResponse(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
