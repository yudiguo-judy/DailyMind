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
 * PUT /api/knowledge/[id] - Update a knowledge entry
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const profile = await getServerProfile()
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { type, content, tags } = body

    if (content !== undefined && (content.length < 5 || content.length > 500)) {
      return NextResponse.json(
        { error: "Content must be 5-500 characters" },
        { status: 400 }
      )
    }

    if (
      type !== undefined &&
      !["lesson", "highlight", "inspiration"].includes(type)
    ) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 })
    }

    if (tags !== undefined && tags.length > 10) {
      return NextResponse.json(
        { error: "Maximum 10 tags allowed" },
        { status: 400 }
      )
    }

    const supabase = getSupabase()

    const updates: Record<string, any> = {}
    if (type !== undefined) updates.type = type
    if (content !== undefined) updates.content = content
    if (tags !== undefined) updates.tags = tags
    updates.updated_at = new Date().toISOString()

    const { data: entry, error } = await supabase
      .from("knowledge_entries")
      .update(updates)
      .eq("id", params.id)
      .eq("user_id", profile.user_id)
      .select("*")
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ entry })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * DELETE /api/knowledge/[id] - Delete a knowledge entry
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const profile = await getServerProfile()
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = getSupabase()

    const { error } = await supabase
      .from("knowledge_entries")
      .delete()
      .eq("id", params.id)
      .eq("user_id", profile.user_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
