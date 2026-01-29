/**
 * Seed demo data for Phase 2 verification
 * This script creates realistic conversation data and generates summaries
 */

import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = "http://127.0.0.1:54321"
const SUPABASE_SERVICE_KEY = "sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz"

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function seedDemoData() {
  console.log("🌱 Seeding demo data for Phase 2 verification...\n")

  try {
    // Step 1: Get or create a test user
    console.log("1️⃣  Setting up test user...")

    // Create a test user via auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: "demo@dailymind.test",
      password: "demo123456",
      email_confirm: true
    })

    if (authError && !authError.message.includes("already exists")) {
      console.error("   ❌ Failed to create user:", authError.message)
      return false
    }

    // Get existing user if already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const testUser = existingUsers?.users.find(u => u.email === "demo@dailymind.test")

    if (!testUser) {
      console.error("   ❌ Could not find test user")
      return false
    }

    const userId = testUser.id
    console.log(`   ✅ Test user ready: ${testUser.email} (${userId})`)

    // Step 2: Get or create profile
    console.log("\n2️⃣  Setting up profile...")
    let profile = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single()

    if (!profile.data) {
      const { data: newProfile, error: profileError } = await supabase
        .from("profiles")
        .insert({
          user_id: userId,
          display_name: "Demo User",
          bio: "Testing DailyMind memory system"
        })
        .select()
        .single()

      if (profileError) {
        console.error("   ❌ Failed to create profile:", profileError.message)
        return false
      }
      profile.data = newProfile
    }
    console.log("   ✅ Profile ready")

    // Step 3: Get or create workspace
    console.log("\n3️⃣  Setting up workspace...")
    const { data: workspaces } = await supabase
      .from("workspaces")
      .select("*")
      .eq("user_id", userId)
      .limit(1)

    let workspace = workspaces?.[0]

    if (!workspace) {
      const { data: newWorkspace, error: workspaceError } = await supabase
        .from("workspaces")
        .insert({
          user_id: userId,
          name: "Demo Workspace",
          default_context_length: 4096,
          default_model: "gpt-4o-mini",
          default_prompt: "You are a helpful AI assistant.",
          default_temperature: 0.7,
          embeddings_provider: "openai"
        })
        .select()
        .single()

      if (workspaceError) {
        console.error("   ❌ Failed to create workspace:", workspaceError.message)
        return false
      }
      workspace = newWorkspace
    }
    console.log(`   ✅ Workspace ready: ${workspace.name} (${workspace.id})`)

    // Step 4: Create demo chats with messages for the past 3 days
    console.log("\n4️⃣  Creating demo conversations...")

    const today = new Date()
    const dates = []
    for (let i = 2; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      dates.push(date)
    }

    const demoConversations = [
      // Day 1 (2 days ago)
      {
        date: dates[0],
        chatName: "Project Planning Session",
        messages: [
          { role: "user", content: "I need to plan the implementation of a memory system for my chatbot. What's the best approach?" },
          { role: "assistant", content: "Great question! A memory system typically has three layers: short-term (recent context), mid-term (retrievable summaries), and long-term (structured knowledge base). For a chatbot, I'd recommend:\n\n1. Daily summaries for context continuity\n2. RAG for retrieving relevant past conversations\n3. A knowledge graph for facts and lessons learned" },
          { role: "user", content: "That makes sense. I'm thinking of using daily summaries that automatically inject into new conversations. What do you think?" },
          { role: "assistant", content: "Excellent idea! Auto-injection of recent summaries provides seamless context. Key considerations:\n\n1. Inject only for new conversations (≤2 messages)\n2. Keep summaries concise (150-250 words)\n3. Include key topics as tags\n4. Use last 2-3 days for optimal balance\n\nThis prevents token bloat while maintaining continuity." },
          { role: "user", content: "Perfect! I'll start with database design for daily_summaries and knowledge_entries tables." },
          { role: "assistant", content: "Smart approach! For the schema, consider:\n\n**daily_summaries**:\n- date (unique per user/workspace)\n- summary (markdown text)\n- message_count\n- key_topics (array)\n\n**knowledge_entries**:\n- type (lesson/highlight/inspiration)\n- content (5-500 chars)\n- tags\n- source_chat_id\n\nDon't forget indexes on frequently queried columns and RLS policies!" }
        ]
      },
      // Day 2 (yesterday)
      {
        date: dates[1],
        chatName: "Implementation Discussion",
        messages: [
          { role: "user", content: "I've set up the database tables. Now working on the AI summary generation. Should I use GPT-4 or a smaller model?" },
          { role: "assistant", content: "For summary generation, I'd recommend **GPT-4o-mini** or **Claude 3 Haiku**. Here's why:\n\n1. **Cost-effective**: Summaries don't need the most powerful model\n2. **Fast**: Lower latency for better UX\n3. **Sufficient quality**: Mini models excel at summarization\n4. **Consistent output**: Use JSON mode for structured responses\n\nSave GPT-4/Claude Opus for actual conversations where reasoning matters." },
          { role: "user", content: "Good point. I'll use gpt-4o-mini. What should my prompt template look like?" },
          { role: "assistant", content: "Here's a solid template:\n\n```\nYou are an expert at summarizing conversations. Generate a concise daily summary.\n\nStructure:\n## Main Activities\n- What user worked on\n\n## Key Insights  \n- Important learnings\n\n## Decisions Made\n- Commitments (if any)\n\n## Follow-up Items\n- Next steps (if any)\n\nKeep it 150-250 words. Extract 3-5 topic tags.\nReturn JSON: {summary: string, key_topics: string[]}\n```\n\nInclude few-shot examples for consistency!" },
          { role: "user", content: "Excellent! I'll also add a UI component to display summaries. Should I use a card layout?" },
          { role: "assistant", content: "Yes! Card layout is perfect for summaries. Consider:\n\n**Features**:\n- Collapsible cards (expand/collapse)\n- Date + day of week\n- Topic badges\n- Message count indicator\n- Markdown rendering for summary\n\n**UX Tips**:\n- Default to collapsed for overview\n- Highlight today's summary\n- Add \"Generate Today\" button\n- Show loading states\n- Empty state with guidance" }
        ]
      },
      // Day 3 (today)
      {
        date: dates[2],
        chatName: "Testing & Refinement",
        messages: [
          { role: "user", content: "The summary generation is working! But I want to make sure the auto-injection doesn't use too many tokens. Any suggestions?" },
          { role: "assistant", content: "Great progress! For token optimization:\n\n1. **Limit injection scope**:\n   - Only inject for messages 1-2 (new convos)\n   - Skip if summary is empty\n\n2. **Compress summaries**:\n   - Remove markdown headers if needed\n   - Focus on key points only\n   - Limit to last 2 days max\n\n3. **Smart formatting**:\n   ```\n   <RECENT CONTEXT>\n   [Date]: [Topics]\n   [Condensed summary]\n   </RECENT CONTEXT>\n   ```\n\n4. **Token budget**: Reserve ~300-500 tokens for context" },
          { role: "user", content: "That's helpful. One more thing - should I allow users to manually edit summaries?" },
          { role: "assistant", content: "Good question! I'd say **yes, but later**. For Phase 2:\n- Focus on auto-generation\n- Make it work reliably\n- Get user feedback\n\nFor future phases:\n- Add edit capability\n- Allow regeneration\n- Support custom templates\n- Enable summary sharing\n\nMVP first, polish later! 🚀" }
        ]
      }
    ]

    for (let dayIndex = 0; dayIndex < demoConversations.length; dayIndex++) {
      const convData = demoConversations[dayIndex]
      const dateStr = convData.date.toISOString().split("T")[0]

      console.log(`\n   📅 Creating conversation for ${dateStr}...`)

      // Create chat
      const { data: chat, error: chatError } = await supabase
        .from("chats")
        .insert({
          user_id: userId,
          workspace_id: workspace.id,
          name: convData.chatName,
          context_length: 4096,
          embeddings_provider: "openai",
          include_profile_context: false,
          include_workspace_instructions: false,
          model: "gpt-4o-mini",
          prompt: "You are a helpful AI assistant.",
          temperature: 0.7
        })
        .select()
        .single()

      if (chatError) {
        console.error(`      ❌ Failed to create chat: ${chatError.message}`)
        continue
      }

      // Create messages with proper timestamps for that day
      const baseTime = new Date(convData.date)
      baseTime.setHours(10, 0, 0, 0) // Start at 10 AM

      for (let i = 0; i < convData.messages.length; i++) {
        const msg = convData.messages[i]
        const msgTime = new Date(baseTime)
        msgTime.setMinutes(msgTime.getMinutes() + i * 5) // 5 min intervals

        const { error: msgError } = await supabase
          .from("messages")
          .insert({
            user_id: userId,
            chat_id: chat.id,
            content: msg.content,
            role: msg.role,
            model: "gpt-4o-mini",
            sequence_number: i,
            image_paths: [],
            created_at: msgTime.toISOString()
          })

        if (msgError) {
          console.error(`      ❌ Failed to create message ${i}: ${msgError.message}`)
        }
      }

      console.log(`      ✅ Created chat with ${convData.messages.length} messages`)
    }

    // Step 5: Generate summaries for the past 3 days
    console.log("\n5️⃣  Generating summaries...")
    console.log("   ℹ️  Note: This would normally call the API, but we'll create manual summaries for demo")

    const summaries = [
      {
        date: dates[0].toISOString().split("T")[0],
        summary: `# Daily Summary

## Main Activities
- Planned implementation of chatbot memory system
- Designed three-layer memory architecture (short/mid/long term)
- Started database schema design for daily_summaries and knowledge_entries

## Key Insights
- Auto-injection of summaries provides context continuity without manual effort
- Keeping summaries concise (150-250 words) prevents token bloat
- Using last 2-3 days strikes optimal balance between context and efficiency

## Decisions Made
- Chose to implement daily summaries with auto-injection for new conversations
- Decided on database structure with proper indexing and RLS policies

## Follow-up Items
- Complete database table creation
- Implement AI summary generation logic`,
        message_count: 10,
        key_topics: ["memory-system", "architecture", "database-design", "planning", "chatbot"]
      },
      {
        date: dates[1].toISOString().split("T")[0],
        summary: `# Daily Summary

## Main Activities
- Implemented AI summary generation using GPT-4o-mini
- Designed prompt template for consistent summary output
- Created UI components for displaying summaries (card layout)

## Key Insights
- GPT-4o-mini is cost-effective and fast enough for summarization tasks
- JSON mode ensures structured, parseable output
- Few-shot examples improve output consistency
- Collapsible card layout provides good UX for summary browsing

## Decisions Made
- Selected GPT-4o-mini over GPT-4 for summary generation (cost/speed balance)
- Chose card-based UI with expand/collapse functionality
- Included topic badges and message count indicators

## Follow-up Items
- Implement token optimization for auto-injection
- Add loading and empty states to UI
- Test summary quality with real conversations`,
        message_count: 10,
        key_topics: ["ai-generation", "gpt-4o-mini", "prompt-engineering", "ui-design", "implementation"]
      },
      {
        date: dates[2].toISOString().split("T")[0],
        summary: `# Daily Summary

## Main Activities
- Optimized token usage for summary auto-injection
- Refined summary compression and formatting
- Discussed feature roadmap (edit capability, regeneration, templates)

## Key Insights
- Limiting injection to first 1-2 messages prevents excessive token usage
- Reserving 300-500 tokens for context is a good budget
- MVP approach: get auto-generation working before adding advanced features
- Smart formatting with <RECENT CONTEXT> tags improves clarity

## Decisions Made
- Implemented token budget of 300-500 for context injection
- Decided to defer manual editing to future phases
- Prioritized reliable auto-generation over feature completeness`,
        message_count: 8,
        key_topics: ["optimization", "token-management", "refinement", "mvp", "future-planning"]
      }
    ]

    for (const summaryData of summaries) {
      const { error: summaryError } = await supabase
        .from("daily_summaries")
        .insert({
          user_id: userId,
          workspace_id: workspace.id,
          date: summaryData.date,
          summary: summaryData.summary,
          message_count: summaryData.message_count,
          key_topics: summaryData.key_topics
        })

      if (summaryError) {
        if (summaryError.message.includes("duplicate")) {
          console.log(`   ℹ️  Summary for ${summaryData.date} already exists`)
        } else {
          console.error(`   ❌ Failed to create summary: ${summaryError.message}`)
        }
      } else {
        console.log(`   ✅ Created summary for ${summaryData.date}`)
      }
    }

    // Final summary
    console.log("\n" + "=".repeat(60))
    console.log("🎉 Demo data seeded successfully!\n")
    console.log("📊 Summary:")
    console.log(`   User: demo@dailymind.test`)
    console.log(`   User ID: ${userId}`)
    console.log(`   Workspace ID: ${workspace.id}`)
    console.log(`   Conversations: ${demoConversations.length} (past 3 days)`)
    console.log(`   Messages: ${demoConversations.reduce((sum, c) => sum + c.messages.length, 0)}`)
    console.log(`   Summaries: ${summaries.length}`)
    console.log("\n🔗 Next steps:")
    console.log("   1. Start the dev server: npm run dev")
    console.log("   2. Login with: demo@dailymind.test / demo123456")
    console.log(`   3. View summaries at: /en/${workspace.id}/memory`)
    console.log("   4. Start a new chat to see auto-injection!")
    console.log("=".repeat(60) + "\n")

    return true
  } catch (error: any) {
    console.error("\n❌ Seeding failed:", error.message)
    return false
  }
}

// Run seeding
seedDemoData()
  .then(success => {
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error("Fatal error:", error)
    process.exit(1)
  })
