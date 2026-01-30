import { getServerProfile } from "@/lib/server/server-chat-helpers"
import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "edge"

const getSupabase = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

/**
 * GET /api/knowledge - List/search knowledge entries
 */
export async function GET(request: NextRequest) {
  try {
    const profile = await getServerProfile()
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const workspace_id = searchParams.get("workspace_id")
    const type = searchParams.get("type") || "all"
    const query = searchParams.get("query") || ""
    const tags = searchParams.get("tags")
    const sortOrder = searchParams.get("sort") || "desc"
    const limit = parseInt(searchParams.get("limit") || "20")
    const offset = parseInt(searchParams.get("offset") || "0")

    if (!workspace_id) {
      return NextResponse.json(
        { error: "Missing workspace_id" },
        { status: 400 }
      )
    }

    const supabase = getSupabase()

    let dbQuery = supabase
      .from("knowledge_entries")
      .select("*", { count: "exact" })
      .eq("user_id", profile.user_id)
      .eq("workspace_id", workspace_id)

    if (type && type !== "all") {
      dbQuery = dbQuery.eq("type", type)
    }

    if (query.trim()) {
      dbQuery = dbQuery.ilike("content", `%${query}%`)
    }

    if (tags) {
      const tagArray = tags.split(",").filter(Boolean)
      if (tagArray.length > 0) {
        dbQuery = dbQuery.overlaps("tags", tagArray)
      }
    }

    dbQuery = dbQuery.order("created_at", {
      ascending: sortOrder === "asc"
    })

    dbQuery = dbQuery.range(offset, offset + limit - 1)

    const { data: entries, error, count } = await dbQuery

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fetch all entries (unfiltered) for tags + stats
    const { data: allEntries } = await supabase
      .from("knowledge_entries")
      .select("type, tags")
      .eq("user_id", profile.user_id)
      .eq("workspace_id", workspace_id)

    const tagCounts: Record<string, number> = {}
    let lessonCount = 0
    let highlightCount = 0
    let inspirationCount = 0
    allEntries?.forEach((entry: any) => {
      if (entry.type === "lesson") lessonCount++
      else if (entry.type === "highlight") highlightCount++
      else if (entry.type === "inspiration") inspirationCount++
      entry.tags?.forEach((tag: string) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1
      })
    })

    const allTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count }))

    return NextResponse.json({
      entries: entries || [],
      total: count || 0,
      allTags,
      stats: {
        total_count: allEntries?.length || 0,
        lesson_count: lessonCount,
        highlight_count: highlightCount,
        inspiration_count: inspirationCount,
        unique_tags_count: Object.keys(tagCounts).length
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/knowledge - Create a knowledge entry
 */
export async function POST(request: NextRequest) {
  try {
    const profile = await getServerProfile()
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { workspace_id, type, content, tags, source_chat_id } = body

    if (!workspace_id || !type || !content) {
      return NextResponse.json(
        { error: "Missing required fields: workspace_id, type, content" },
        { status: 400 }
      )
    }

    if (content.length < 5 || content.length > 500) {
      return NextResponse.json(
        { error: "Content must be 5-500 characters" },
        { status: 400 }
      )
    }

    if (!["lesson", "highlight", "inspiration"].includes(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 })
    }

    if (tags && tags.length > 10) {
      return NextResponse.json(
        { error: "Maximum 10 tags allowed" },
        { status: 400 }
      )
    }

    const supabase = getSupabase()

    const { data: entry, error } = await supabase
      .from("knowledge_entries")
      .insert([
        {
          user_id: profile.user_id,
          workspace_id,
          type,
          content,
          tags: tags || [],
          source_chat_id: source_chat_id || null
        }
      ])
      .select("*")
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ entry }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * DELETE /api/knowledge - Bulk delete knowledge entries
 */
export async function DELETE(request: NextRequest) {
  try {
    const profile = await getServerProfile()
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { ids } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Missing required field: ids (array)" },
        { status: 400 }
      )
    }

    const supabase = getSupabase()

    const { error } = await supabase
      .from("knowledge_entries")
      .delete()
      .in("id", ids)
      .eq("user_id", profile.user_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, deleted: ids.length })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
