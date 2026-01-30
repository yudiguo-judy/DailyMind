/**
 * Stream utilities for handling chat API streaming responses
 * These replace the deprecated OpenAIStream and StreamingTextResponse from the 'ai' package
 */

import { Stream } from "openai/streaming"
import { ChatCompletionChunk } from "openai/resources/chat/completions"
import Anthropic from "@anthropic-ai/sdk"

/**
 * Convert OpenAI streaming response to a ReadableStream
 */
export function openAIStreamToReadableStream(
  stream: Stream<ChatCompletionChunk>,
  onComplete?: (fullText: string) => void
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  let fullText = ""

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content
          if (content) {
            fullText += content
            controller.enqueue(encoder.encode(content))
          }
        }
        controller.close()
        onComplete?.(fullText)
      } catch (error) {
        controller.error(error)
      }
    }
  })
}

/**
 * Convert Anthropic streaming response to a ReadableStream
 */
export function anthropicStreamToReadableStream(
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

/**
 * Create a streaming response with proper headers
 */
export function createStreamingResponse(
  stream: ReadableStream<Uint8Array>
): Response {
  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked"
    }
  })
}
