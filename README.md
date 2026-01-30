
# DailyMind

**有记忆的 AI 助手** — 基于 [Chatbot UI](https://github.com/mckaywrigley/chatbot-ui) 构建，新增三层记忆系统，让 AI 能总结你的每一天、积累你的知识、越用越懂你。

## 与原版 Chatbot UI 的区别

原版 Chatbot UI 是一个多模型聊天界面，支持 OpenAI、Anthropic、Google 等多家 AI，但每次对话是一次性的——AI 不记得你之前聊过什么。

DailyMind 在此基础上加入了**三层记忆系统**：

### 1. 每日总结（Daily Summaries）

AI 自动把你每天的对话压缩成结构化总结，包含主要活动、关键洞察、决策和待办。

- 手动生成：在 Memory 页面点击 "Generate Today"
- 自动触发：打开 Memory 页面时自动补生成昨天的总结
- 定时任务：Vercel Cron 每天凌晨 2 点批量生成（需配置 `CRON_SECRET`）

### 2. 知识库（Knowledge Library）

从对话中提取三种知识并持久化存储：

| 类型 | 说明 |
|------|------|
| **Lesson** | 学到的经验、最佳实践、问题解决方案 |
| **Highlight** | 关键事实、重要决策、值得记住的时刻 |
| **Inspiration** | 创意想法、未来可能性、启发性洞察 |

功能包括：

- **自动提取**：每次聊天结束后，后台用 AI 从对话中提取知识条目，带去重检查
- **手动管理**：添加/编辑/删除条目，标签自动补全
- **批量操作**：多选模式，批量删除
- **搜索过滤**：全文搜索 + 标签筛选 + 按类型 tab 切换 + 排序
- **导出**：导出为 Markdown 或 JSON
- **统计面板**：各类型数量、唯一标签数

### 3. 动态上下文注入（Context Injection）

- **自动注入**：开启新对话时，最近 2 天的总结自动注入 system prompt，AI 开口就知道你的上下文
- **AI 主动调用**：Claude 可通过 4 个内置工具主动查询记忆——查总结、查聊天记录、搜知识库、写入新知识

### 4. MCP Server

独立的 Model Context Protocol 服务器（`mcp-servers/memory-server/`），可接入 Claude Desktop 等 MCP 客户端，让记忆系统不限于 web 界面。

## 技术架构

```
三层记忆架构：

短期记忆 ── 自动注入最近 2 天总结到 system prompt
中期记忆 ── AI 通过 Memory Tools 按需查询历史总结和聊天记录
长期记忆 ── 结构化知识库（lessons / highlights / inspirations）
```

### 新增的文件结构

```
db/
  daily-summaries.ts          # 每日总结 CRUD
  knowledge-entries.ts        # 知识条目 CRUD + 搜索 + 去重

lib/
  generate-daily-summary.ts   # AI 总结生成（OpenAI / Anthropic）
  extract-knowledge.ts        # AI 知识提取
  trigger-knowledge-extraction.ts  # 后台提取 + 去重
  export-knowledge.ts         # 导出工具
  build-prompt.ts             # 上下文注入（已修改）
  prompts/
    daily-summary-prompt.ts   # 总结 prompt 模板
    knowledge-extraction-prompt.ts  # 提取 prompt 模板
  memory-tools/
    definitions.ts            # 4 个 Memory Tool 定义
    executor.ts               # Tool 执行器

app/api/
  summary/generate/route.ts   # 总结生成 API
  summary/cron/route.ts       # 定时任务 API
  knowledge/route.ts          # 知识条目 CRUD + 批量删除
  knowledge/[id]/route.ts     # 单条更新/删除
  knowledge/extract/route.ts  # 知识提取 API
  knowledge/export/route.ts   # 导出 API

components/memory/
  daily-summary-panel.tsx     # 总结面板
  summary-card.tsx            # 总结卡片
  knowledge-library.tsx       # 知识库主组件
  knowledge-entry-card.tsx    # 知识卡片（支持多选）
  knowledge-entry-form.tsx    # 添加/编辑表单
  knowledge-filters.tsx       # 搜索和过滤
  knowledge-stats.tsx         # 统计面板

app/[locale]/[workspaceid]/memory/page.tsx  # Memory 页面

supabase/migrations/
  20260119000000_add_memory_system.sql  # 数据库迁移
```

### 修改的关键原有文件

| 文件 | 改动 |
|------|------|
| `app/api/chat/anthropic/route.ts` | 接入 Memory Tools + 自动知识提取 |
| `app/api/chat/openai/route.ts` | 自动知识提取 |
| `lib/build-prompt.ts` | 新对话自动注入近期总结 |
| `lib/stream-utils.ts` | stream 完成回调 |
| `components/chat/chat-helpers/index.ts` | 传递 chatId |

## Demo

waiting...

## Local Quickstart

### 1. Clone the Repo

```bash
git clone <your-repo-url>
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Install Supabase & Run Locally

#### 1. Install Docker

You will need to install Docker to run Supabase locally. You can download it [here](https://docs.docker.com/get-docker) for free.

#### 2. Install Supabase CLI

**MacOS/Linux**

```bash
brew install supabase/tap/supabase
```

**Windows**

```bash
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

#### 3. Start Supabase

```bash
supabase start
```

### 4. Fill in Secrets

```bash
cp .env.local.example .env.local
```

Get the required values by running:

```bash
supabase status
```

Note: Use `API URL` from `supabase status` for `NEXT_PUBLIC_SUPABASE_URL`

Fill in the values in `.env.local`. Required:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

For memory features, also set:

- `OPENAI_API_KEY` (used for summary generation and knowledge extraction)
- `CRON_SECRET` (optional, for automated daily summary cron)

In the 1st migration file `supabase/migrations/20240108234540_setup.sql` you will need to replace 2 values:

- `project_url` (line 53): `http://supabase_kong_chatbotui:8000` (default)
- `service_role_key` (line 54): from `supabase status`

### 5. Run Database Migrations

```bash
npm run db-migrate
```

This will create the `daily_summaries` and `knowledge_entries` tables.

### 6. Install Ollama (optional for local models)

Follow the instructions [here](https://github.com/jmorganca/ollama#macos).

### 7. Run app locally

```bash
npm run chat
```

Your local instance should now be running at [http://localhost:3000](http://localhost:3000).

You can view your backend GUI at [http://localhost:54323/project/default/editor](http://localhost:54323/project/default/editor).

## Hosted Quickstart

Follow these steps to get your own instance running in the cloud.

### 1. Follow Local Quickstart

Repeat steps 1-5 above.

### 2. Setup Backend with Supabase

1. Go to [Supabase](https://supabase.com/) and create a new project
2. Get your Project URL, Anon key, and Service role key from Project Settings > API
3. Configure Auth: enable Email provider (recommend turning off "Confirm email")
4. Update the migration file with your project URL and service role key
5. Link and push:

```bash
supabase login
supabase link --project-ref <project-id>
supabase db push
```

### 3. Setup Frontend with Vercel

1. Go to [Vercel](https://vercel.com/) and create a new project
2. Import your GitHub repository, set Framework Preset to "Next.js"
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY` (for memory features)
   - `CRON_SECRET` (for automated daily summaries)
4. Deploy

The `vercel.json` in the repo already configures the daily summary cron job to run at 2:00 AM UTC.

## Updating

```bash
npm run update
```

If you run a hosted instance you'll also need to run:

```bash
npm run db-push
```

## Tests

```bash
npm test
```

## Contributing

We are working on a guide for contributing.

## Credits

Based on [Chatbot UI](https://github.com/mckaywrigley/chatbot-ui) by [Mckay Wrigley](https://twitter.com/mckaywrigley).
