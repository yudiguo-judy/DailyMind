# DailyMind Memory MCP Server

A Model Context Protocol (MCP) server that provides AI assistants with access to conversation history, daily summaries, and a structured knowledge base.

## Features

### 4 Core Tools

| Tool | Description |
|------|-------------|
| `get_daily_summaries` | Retrieve daily conversation summaries within a date range |
| `get_full_chat_history` | Read complete chat history for a specific date |
| `search_knowledge` | Search lessons, highlights, and inspirations |
| `add_knowledge_entry` | Add new entries to the knowledge base |

## Installation

```bash
cd mcp-servers/memory-server
npm install
npm run build
```

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Required: User context
USER_ID=your-user-uuid
WORKSPACE_ID=your-workspace-uuid
```

### Claude Desktop Configuration

Add to your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "dailymind-memory": {
      "command": "node",
      "args": [
        "/absolute/path/to/mcp-servers/memory-server/build/index.js"
      ],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_ANON_KEY": "your-anon-key",
        "USER_ID": "your-user-uuid",
        "WORKSPACE_ID": "your-workspace-uuid"
      }
    }
  }
}
```

**Important**: Use absolute paths for the `args` value.

## Usage Examples

### Get Daily Summaries

```
"What did we discuss last week?"
→ AI calls get_daily_summaries with startDate/endDate
```

### Get Full Chat History

```
"Show me our conversation from January 15th"
→ AI calls get_full_chat_history with date="2026-01-15"
```

### Search Knowledge

```
"What lessons have I learned about programming?"
→ AI calls search_knowledge with type="lesson", query="programming"
```

### Add Knowledge Entry

```
"Save this as a lesson: Always validate user input before processing"
→ AI calls add_knowledge_entry with type="lesson", content="..."
```

## Development

```bash
# Watch mode (rebuild on changes)
npm run dev

# Test with MCP Inspector
npm run inspect
```

## Tool Schemas

### get_daily_summaries

```json
{
  "startDate": "2026-01-15",  // optional
  "endDate": "2026-01-19",    // optional
  "limit": 7                   // optional, default: 7
}
```

### get_full_chat_history

```json
{
  "date": "2026-01-19",       // required, YYYY-MM-DD format
  "chatId": "uuid"            // optional, specific chat
}
```

### search_knowledge

```json
{
  "type": "lesson",           // optional: lesson|highlight|inspiration|all
  "query": "programming",     // optional: search keywords
  "tags": ["coding"],         // optional: filter by tags
  "limit": 20                 // optional, default: 20
}
```

### add_knowledge_entry

```json
{
  "type": "lesson",           // required: lesson|highlight|inspiration
  "content": "...",           // required: max 200 characters
  "tags": ["coding"]          // optional: categorization tags
}
```

## Database Requirements

This MCP server requires the following Supabase tables:

- `daily_summaries` - Stores daily conversation summaries
- `knowledge_entries` - Stores lessons, highlights, and inspirations
- `chats` - Chat metadata
- `messages` - Chat messages

See the main project's migration files for table schemas.

## Troubleshooting

### Server not starting

1. Check that all environment variables are set
2. Verify the path to `build/index.js` is correct
3. Check Claude Desktop logs for errors

### Tools not appearing

1. Restart Claude Desktop after config changes
2. Verify JSON syntax in config file
3. Check that the server builds without errors

### Database errors

1. Verify Supabase credentials
2. Check that tables exist and have correct schema
3. Verify RLS policies allow access

## License

MIT
