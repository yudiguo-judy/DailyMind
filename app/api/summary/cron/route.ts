import { generateDailySummary } from "@/lib/generate-daily-summary"
import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "edge"

/**
 * GET /api/summary/cron
 *
 * Cron endpoint to generate daily summaries for all users.
 * Generates yesterday's summary for every user+workspace that has messages
 * but no summary yet.
 *
 * Protected by CRON_SECRET env var.
 *
 * Vercel Cron config (add to vercel.json):
 * { "crons": [{ "path": "/api/summary/cron", "schedule": "0 2 * * *" }] }
 */
export async function GET(request: NextRequest) {
  try {
    // Auth: check for Vercel cron header or CRON_SECRET query param
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret) {
      const { searchParams } = new URL(request.url)
      const providedSecret =
        searchParams.get("secret") || authHeader?.replace("Bearer ", "")

      if (providedSecret !== cronSecret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Calculate yesterday's date
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const dateStr = yesterday.toISOString().split("T")[0]

    const startOfDay = new Date(dateStr)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(dateStr)
    endOfDay.setHours(23, 59, 59, 999)

    // Find all user+workspace combos that had messages yesterday
    const { data: messageSets, error: msgError } = await supabase
      .from("messages")
      .select(
        `
        user_id,
        chats!inner(workspace_id)
      `
      )
      .gte("created_at", startOfDay.toISOString())
      .lte("created_at", endOfDay.toISOString())

    if (msgError) {
      console.error("Error fetching messages:", msgError)
      return NextResponse.json(
        { error: "Failed to fetch messages" },
        { status: 500 }
      )
    }

    if (!messageSets || messageSets.length === 0) {
      return NextResponse.json({
        success: true,
        generated: 0,
        message: "No messages found for yesterday"
      })
    }

    // Deduplicate user+workspace combos
    const combos = new Map<string, { user_id: string; workspace_id: string }>()
    for (const msg of messageSets) {
      const ws = (msg as any).chats?.workspace_id
      if (ws) {
        const key = `${msg.user_id}:${ws}`
        if (!combos.has(key)) {
          combos.set(key, { user_id: msg.user_id, workspace_id: ws })
        }
      }
    }

    let generated = 0
    let skipped = 0
    const errors: string[] = []

    for (const { user_id, workspace_id } of combos.values()) {
      try {
        // Check if summary already exists
        const { data: existing } = await supabase
          .from("daily_summaries")
          .select("id")
          .eq("user_id", user_id)
          .eq("workspace_id", workspace_id)
          .eq("date", dateStr)
          .maybeSingle()

        if (existing) {
          skipped++
          continue
        }

        // Fetch messages for this user+workspace+date
        const { data: messages } = await supabase
          .from("messages")
          .select(
            `
            *,
            chats!inner(workspace_id)
          `
          )
          .eq("user_id", user_id)
          .eq("chats.workspace_id", workspace_id)
          .gte("created_at", startOfDay.toISOString())
          .lte("created_at", endOfDay.toISOString())
          .order("created_at", { ascending: true })

        if (!messages || messages.length === 0) continue

        // Get user's API key for generation
        const { data: profile } = await supabase
          .from("profiles")
          .select("openai_api_key")
          .eq("user_id", user_id)
          .single()

        const summaryResult = await generateDailySummary(messages, dateStr, {
          apiKey: profile?.openai_api_key || undefined,
          provider: "openai"
        })

        await supabase.from("daily_summaries").insert({
          user_id,
          workspace_id,
          date: dateStr,
          summary: summaryResult.summary,
          message_count: messages.length,
          key_topics: summaryResult.key_topics
        })

        generated++
      } catch (err: any) {
        errors.push(`${user_id}: ${err.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      date: dateStr,
      generated,
      skipped,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error: any) {
    console.error("Cron summary error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
