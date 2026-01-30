import { getServerProfile } from "@/lib/server/server-chat-helpers"
import { extractKnowledge } from "@/lib/extract-knowledge"
import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "edge"

/**
 * POST /api/knowledge/extract - Extract knowledge from a conversation
 */
export async function POST(request: NextRequest) {
  try {
    const profile = await getServerProfile()
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { workspace_id, chat_id, messages, save = false } = body

    if (!workspace_id || !messages || messages.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: workspace_id, messages" },
        { status: 400 }
      )
    }

    const extracted = await extractKnowledge(messages, {
      apiKey: profile.openai_api_key || undefined,
      provider: "openai"
    })

    const totalExtracted =
      extracted.lessons.length +
      extracted.highlights.length +
      extracted.inspirations.length

    if (totalExtracted === 0) {
      return NextResponse.json({
        extracted,
        saved: false,
        message: "No knowledge extracted from conversation"
      })
    }

    if (save) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      const entries = [
        ...extracted.lessons.map(e => ({
          user_id: profile.user_id,
          workspace_id,
          type: "lesson" as const,
          content: e.content,
          tags: e.tags,
          source_chat_id: chat_id || null
        })),
        ...extracted.highlights.map(e => ({
          user_id: profile.user_id,
          workspace_id,
          type: "highlight" as const,
          content: e.content,
          tags: e.tags,
          source_chat_id: chat_id || null
        })),
        ...extracted.inspirations.map(e => ({
          user_id: profile.user_id,
          workspace_id,
          type: "inspiration" as const,
          content: e.content,
          tags: e.tags,
          source_chat_id: chat_id || null
        }))
      ]

      const { error } = await supabase.from("knowledge_entries").insert(entries)

      if (error) {
        console.error("Error saving knowledge entries:", error)
        return NextResponse.json(
          { error: "Failed to save entries", details: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        extracted,
        saved: true,
        count: entries.length,
        message: `Extracted and saved ${entries.length} knowledge entries`
      })
    }

    return NextResponse.json({
      extracted,
      saved: false,
      message: `Extracted ${totalExtracted} knowledge entries (not saved)`
    })
  } catch (error: any) {
    console.error("Error in knowledge extraction API:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
