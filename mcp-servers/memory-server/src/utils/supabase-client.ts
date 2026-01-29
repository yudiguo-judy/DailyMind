import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Validate required environment variables
function validateEnv(): { url: string; key: string } {
  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error("SUPABASE_URL environment variable is required");
  }
  if (!key) {
    throw new Error(
      "SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY environment variable is required"
    );
  }

  return { url, key };
}

// Create and export Supabase client
let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    const { url, key } = validateEnv();
    supabaseInstance = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return supabaseInstance;
}

// Get user context from environment
export function getUserContext(): { userId: string; workspaceId: string } {
  const userId = process.env.USER_ID;
  const workspaceId = process.env.WORKSPACE_ID;

  if (!userId || !workspaceId) {
    throw new Error(
      "USER_ID and WORKSPACE_ID environment variables are required"
    );
  }

  return { userId, workspaceId };
}

// Test connection
export async function testConnection(): Promise<boolean> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("daily_summaries")
      .select("id")
      .limit(1);

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows found, which is OK
      console.error("Supabase connection test failed:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Supabase connection error:", err);
    return false;
  }
}
