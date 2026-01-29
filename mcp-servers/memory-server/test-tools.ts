/**
 * Test script for MCP Server tools
 * Run with: npx tsx test-tools.ts
 */

import "dotenv/config";
import { getDailySummaries, formatSummariesForDisplay } from "./src/tools/get-daily-summaries.js";
import { getFullChatHistory, formatChatHistoryForDisplay } from "./src/tools/get-full-chat-history.js";
import { searchKnowledge, formatKnowledgeForDisplay } from "./src/tools/search-knowledge.js";
import { addKnowledgeEntry, formatAddEntryResult } from "./src/tools/add-knowledge-entry.js";
import { testConnection } from "./src/utils/supabase-client.js";

async function runTests() {
  console.log("🧪 Testing MCP Server Tools\n");
  console.log("=".repeat(50));

  // Test 1: Connection
  console.log("\n📡 Test 1: Supabase Connection");
  const connected = await testConnection();
  console.log(`   Result: ${connected ? "✅ Connected" : "❌ Failed"}`);

  // Test 2: Get Daily Summaries
  console.log("\n📅 Test 2: Get Daily Summaries (last 7 days)");
  const summariesResult = await getDailySummaries({ limit: 7 });
  if (summariesResult.success) {
    console.log(`   Result: ✅ Found ${summariesResult.data?.length || 0} summaries`);
    if (summariesResult.data && summariesResult.data.length > 0) {
      console.log(`   Latest: ${summariesResult.data[0].date}`);
    }
  } else {
    console.log(`   Result: ❌ ${summariesResult.error}`);
  }

  // Test 3: Get Full Chat History (today)
  console.log("\n💬 Test 3: Get Full Chat History (today)");
  const today = new Date().toISOString().split("T")[0];
  const historyResult = await getFullChatHistory({ date: today });
  if (historyResult.success) {
    console.log(`   Result: ✅ Found ${historyResult.data?.length || 0} chats for ${today}`);
    if (historyResult.data && historyResult.data.length > 0) {
      const totalMessages = historyResult.data.reduce((sum, c) => sum + c.messages.length, 0);
      console.log(`   Total messages: ${totalMessages}`);
    }
  } else {
    console.log(`   Result: ❌ ${historyResult.error}`);
  }

  // Test 4: Search Knowledge
  console.log("\n🔍 Test 4: Search Knowledge (all types)");
  const searchResult = await searchKnowledge({ type: "all", limit: 10 });
  if (searchResult.success) {
    console.log(`   Result: ✅ Found ${searchResult.data?.length || 0} entries`);
    const byType = {
      lesson: searchResult.data?.filter(e => e.type === "lesson").length || 0,
      highlight: searchResult.data?.filter(e => e.type === "highlight").length || 0,
      inspiration: searchResult.data?.filter(e => e.type === "inspiration").length || 0,
    };
    console.log(`   Breakdown: ${byType.lesson} lessons, ${byType.highlight} highlights, ${byType.inspiration} inspirations`);
  } else {
    console.log(`   Result: ❌ ${searchResult.error}`);
  }

  // Test 5: Add Knowledge Entry (then delete)
  console.log("\n➕ Test 5: Add Knowledge Entry");
  const testEntry = {
    type: "lesson" as const,
    content: "Test entry from MCP Server test script - will be deleted",
    tags: ["test", "mcp"],
  };
  const addResult = await addKnowledgeEntry(testEntry);
  if (addResult.success) {
    console.log(`   Result: ✅ Added entry with ID: ${addResult.data?.id}`);

    // Clean up - delete test entry
    // Note: We don't have a delete function in MCP tools, so just note it
    console.log(`   Note: Test entry created. You may want to delete it manually.`);
  } else {
    console.log(`   Result: ❌ ${addResult.error}`);
  }

  console.log("\n" + "=".repeat(50));
  console.log("🎉 Tests completed!\n");
}

runTests().catch(console.error);
