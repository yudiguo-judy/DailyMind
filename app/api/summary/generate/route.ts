import { getServerProfile } from "@/lib/server/server-chat-helpers"
import { generateDailySummary } from "@/lib/generate-daily-summary"
import { createDailySummary, getDailySummaryByDate } from "@/db/daily-summaries"
import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "edge"

/**
 * POST /api/summary/generate
 * Generate a daily summary for a specific date
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const profile = await getServerProfile()

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { date, workspace_id, force = false } = body

    // Validate inputs
    if (!date || !workspace_id) {
      return NextResponse.json(
        { error: "Missing required fields: date, workspace_id" },
        { status: 400 }
      )
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(date)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      )
    }

    // Check if summary already exists
    const existingSummary = await getDailySummaryByDate(
      profile.user_id,
      workspace_id,
      date
    )

    if (existingSummary && !force) {
      return NextResponse.json(
        {
          success: true,
          summary: existingSummary,
          message: "Summary already exists. Use force=true to regenerate."
        },
        { status: 200 }
      )
    }

    // Create Supabase client with service role for querying messages
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Query all messages for the specified date
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select(
        `
        *,
        chats!inner(workspace_id)
      `
      )
      .eq("user_id", profile.user_id)
      .eq("chats.workspace_id", workspace_id)
      .gte("created_at", startOfDay.toISOString())
      .lte("created_at", endOfDay.toISOString())
      .order("created_at", { ascending: true })

    if (messagesError) {
      console.error("Error fetching messages:", messagesError)
      return NextResponse.json(
        { error: "Failed to fetch messages" },
        { status: 500 }
      )
    }

    // Generate summary using AI
    let summaryResult
    try {
      summaryResult = await generateDailySummary(messages, date, {
        apiKey: profile.openai_api_key || undefined,
        provider: "openai"
      })
    } catch (aiError: any) {
      console.error("Error generating summary:", aiError)
      return NextResponse.json(
        {
          error: "Failed to generate summary",
          details: aiError.message
        },
        { status: 500 }
      )
    }

    // Save or update summary in database
    let savedSummary
    try {
      if (existingSummary && force) {
        // Update existing summary
        const { data: updated, error: updateError } = await supabase
          .from("daily_summaries")
          .update({
            summary: summaryResult.summary,
            key_topics: summaryResult.key_topics,
            message_count: messages.length,
            updated_at: new Date().toISOString()
          })
          .eq("id", existingSummary.id)
          .select()
          .single()

        if (updateError) throw updateError
        savedSummary = updated
      } else {
        // Create new summary
        savedSummary = await createDailySummary({
          user_id: profile.user_id,
          workspace_id: workspace_id,
          date: date,
          summary: summaryResult.summary,
          message_count: messages.length,
          key_topics: summaryResult.key_topics
        })
      }
    } catch (dbError: any) {
      console.error("Error saving summary:", dbError)
      return NextResponse.json(
        {
          error: "Failed to save summary",
          details: dbError.message
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        summary: savedSummary,
        message:
          existingSummary && force ? "Summary regenerated" : "Summary generated"
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("Unexpected error in generate summary API:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/summary/generate?date=YYYY-MM-DD&workspace_id=xxx
 * Check if summary exists for a date
 */
export async function GET(request: NextRequest) {
  try {
    const profile = await getServerProfile()

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date")
    const workspace_id = searchParams.get("workspace_id")

    if (!date || !workspace_id) {
      return NextResponse.json(
        { error: "Missing required parameters: date, workspace_id" },
        { status: 400 }
      )
    }

    const summary = await getDailySummaryByDate(
      profile.user_id,
      workspace_id,
      date
    )

    return NextResponse.json(
      {
        exists: !!summary,
        summary: summary || null
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("Error checking summary:", error)
    return NextResponse.json(
      {
        error: "Failed to check summary",
        details: error.message
      },
      { status: 500 }
    )
  }
}
