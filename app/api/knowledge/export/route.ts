import { getServerProfile } from "@/lib/server/server-chat-helpers"
import { exportAsMarkdown, exportAsJSON } from "@/lib/export-knowledge"
import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "edge"

/**
 * GET /api/knowledge/export - Export knowledge entries as JSON or Markdown
 */
export async function GET(request: NextRequest) {
  try {
    const profile = await getServerProfile()
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const workspace_id = searchParams.get("workspace_id")
    const format = searchParams.get("format") || "json"

    if (!workspace_id) {
      return NextResponse.json(
        { error: "Missing workspace_id" },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: entries, error } = await supabase
      .from("knowledge_entries")
      .select("*")
      .eq("user_id", profile.user_id)
      .eq("workspace_id", workspace_id)
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (format === "markdown") {
      const markdown = exportAsMarkdown(entries || [])
      return new Response(markdown, {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": 'attachment; filename="knowledge-library.md"'
        }
      })
    }

    const json = exportAsJSON(entries || [])
    return new Response(json, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="knowledge-library.json"'
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
