项目的最终要求：
1. 每日结束时，自动形成一份当日的总结，然后把每日的简短总结放到一个单独的本地数据库里面
2. 在开始新对话之前，自动加入最近两天的总结进入上下文
3. 提供mcp接口，可以让大模型决定是否需要调用更多的每日总结，或者全量读取某一日的所有对话
4. 提供skill（暂时没想好，最后再弄）
5. 自动总结3份markdown文档，在和用户的对话中向里面自动加入用户学到的教训（也使用mcp）以及有过的做得好的注意；第三个markdown文档记录用户产生的灵感
   1. 同样地，大模型需要能够按需加载这些markdown文档里的东西
   2. 【讨论】这种最好直接存到数据库里面还是弄个文档像memory一样记下来就好？我希望这些总结的东西是很多条简短的总结性语句而不是超级无敌冗长的复杂说明；

---

## Claude 的需求分析与建议

### 📋 需求总结

这是一个**AI记忆增强系统**，核心目标是让聊天应用具备"长期记忆"能力，通过以下机制实现：

#### 1. 每日总结系统
- **自动化**：每天结束时自动生成当日对话总结
- **存储**：简短总结存入本地数据库（建议使用 Supabase 的现有架构）
- **目的**：压缩信息，提供高层次的历史上下文

#### 2. 上下文自动加载
- **触发时机**：每次新对话开始时
- **加载内容**：最近2天的总结
- **实现方式**：在 `buildFinalMessages()` 中自动注入系统消息

#### 3. MCP 服务接口
- **按需检索**：让 AI 决定是否需要调用更多历史总结
- **精细控制**：支持读取特定日期的完整对话
- **工具化**：通过 MCP tools 实现，类似现有的文件检索功能

#### 4. 知识库文档系统（3个 Markdown 文档）
- **教训库** (lessons.md)：用户犯过的错误和学到的教训
- **亮点库** (highlights.md)：用户做得好的行为和决策
- **灵感库** (inspirations.md)：用户产生的创意和想法
- **特点**：简短、结构化的条目，而非冗长说明

---

### 💡 技术实现建议

#### 方案一：数据库存储（推荐）

**优势**：
1. **结构化查询**：可以按日期、标签、类型快速检索
2. **版本控制**：自动记录创建/更新时间
3. **灵活性**：支持搜索、过滤、排序、分页
4. **一致性**：与现有的 Supabase 架构统一
5. **可扩展**：未来可以添加向量化搜索（RAG）

**建议表结构**：

```sql
-- 每日总结表
CREATE TABLE daily_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(user_id),
  workspace_id UUID REFERENCES workspaces(id),
  date DATE NOT NULL,
  summary TEXT NOT NULL,
  message_count INT,
  key_topics TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, workspace_id, date)
);

-- 知识库条目表
CREATE TABLE knowledge_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(user_id),
  workspace_id UUID REFERENCES workspaces(id),
  type TEXT CHECK (type IN ('lesson', 'highlight', 'inspiration')),
  content TEXT NOT NULL,
  source_chat_id UUID REFERENCES chats(id),
  source_message_id UUID REFERENCES messages(id),
  tags TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 索引优化
CREATE INDEX idx_daily_summaries_date ON daily_summaries(user_id, date DESC);
CREATE INDEX idx_knowledge_entries_type ON knowledge_entries(user_id, type, created_at DESC);
CREATE INDEX idx_knowledge_entries_tags ON knowledge_entries USING gin(tags);
```

#### 方案二：Markdown + 元数据混合（轻量级）

如果你希望保持文档的可读性和版本控制：

```
/memory/
  ├── {user_id}/
  │   ├── summaries/
  │   │   ├── 2026-01-19.md
  │   │   ├── 2026-01-18.md
  │   │   └── index.json  # 元数据索引
  │   └── knowledge/
  │       ├── lessons.md
  │       ├── highlights.md
  │       ├── inspirations.md
  │       └── metadata.json  # 标签、时间戳等
```

**元数据示例**：
```json
{
  "lessons": [
    {
      "id": "lesson-001",
      "content": "在处理大量数据时，记得先进行数据验证避免后续错误",
      "sourceChat": "chat-uuid",
      "tags": ["编程", "数据处理"],
      "createdAt": "2026-01-19T10:30:00Z"
    }
  ]
}
```

---

### 🎯 具体实现建议

#### 1. 每日总结生成

**触发方式**：
- **定时任务**（推荐）：使用 Supabase Edge Functions + Cron
  ```typescript
  // supabase/functions/daily-summary/index.ts
  Deno.serve(async (req) => {
    // 1. 查询当天所有消息
    const messages = await getMessagesByDate(userId, today)

    // 2. 调用 AI 生成总结
    const summary = await generateDailySummary(messages)

    // 3. 提取关键主题
    const keyTopics = await extractKeyTopics(messages)

    // 4. 存入数据库
    await createDailySummary({ date: today, summary, keyTopics })
  })
  ```

- **手动触发**：提供 UI 按钮或 slash 命令 `/summarize-today`

**总结内容格式**：
```markdown
# 2026-01-19 总结

## 主要活动
- 讨论了项目的聊天流程实现
- 设计了记忆系统的架构

## 关键决策
- 决定使用数据库存储每日总结

## 待办事项
- 实现 MCP 接口
- 设计知识库表结构

## 情绪/状态
- 专注、高效
```

#### 2. 自动注入上下文

**位置**：`lib/build-prompt.ts` 或 `components/chat/chat-helpers/index.ts`

```typescript
export const buildFinalMessages = async (
  payload: ChatPayload,
  profile: Tables<"profiles">,
  chatImages: MessageImage[]
) => {
  let messages = [...payload.messages]

  // 【新增】自动加载最近2天的总结
  if (payload.isNewChat) {
    const recentSummaries = await getRecentSummaries(
      profile.user_id,
      payload.workspaceId,
      2 // 天数
    )

    if (recentSummaries.length > 0) {
      const contextMessage = {
        role: "system",
        content: `# 最近2天的对话总结\n\n${recentSummaries.map(s =>
          `## ${s.date}\n${s.summary}`
        ).join('\n\n')}`
      }
      messages.unshift(contextMessage)
    }
  }

  // 原有逻辑...
  return messages
}
```

#### 3. MCP 服务实现

**创建 MCP Server**：`mcp-servers/memory-server/`

```typescript
// mcp-servers/memory-server/index.ts
import { MCPServer } from '@modelcontextprotocol/sdk'

const server = new MCPServer({
  name: "DailyMind Memory",
  version: "1.0.0"
})

// 工具1: 获取历史总结
server.addTool({
  name: "get_daily_summaries",
  description: "获取指定日期范围的每日总结",
  parameters: {
    type: "object",
    properties: {
      startDate: { type: "string", format: "date" },
      endDate: { type: "string", format: "date" },
      limit: { type: "number", default: 7 }
    }
  },
  handler: async ({ startDate, endDate, limit }) => {
    return await getDailySummaries(userId, startDate, endDate, limit)
  }
})

// 工具2: 获取某日完整对话
server.addTool({
  name: "get_full_chat_history",
  description: "读取某一天的所有对话消息",
  parameters: {
    type: "object",
    properties: {
      date: { type: "string", format: "date" },
      chatId: { type: "string", optional: true }
    },
    required: ["date"]
  },
  handler: async ({ date, chatId }) => {
    return await getMessagesByDate(userId, date, chatId)
  }
})

// 工具3: 搜索知识库
server.addTool({
  name: "search_knowledge",
  description: "搜索教训/亮点/灵感库",
  parameters: {
    type: "object",
    properties: {
      type: {
        type: "string",
        enum: ["lesson", "highlight", "inspiration", "all"]
      },
      query: { type: "string" },
      tags: { type: "array", items: { type: "string" } }
    }
  },
  handler: async ({ type, query, tags }) => {
    return await searchKnowledge(userId, type, query, tags)
  }
})

// 工具4: 添加知识条目
server.addTool({
  name: "add_knowledge_entry",
  description: "向知识库添加新的教训/亮点/灵感",
  parameters: {
    type: "object",
    properties: {
      type: { type: "string", enum: ["lesson", "highlight", "inspiration"] },
      content: { type: "string" },
      tags: { type: "array", items: { type: "string" } }
    },
    required: ["type", "content"]
  },
  handler: async ({ type, content, tags }) => {
    return await addKnowledgeEntry(userId, type, content, tags)
  }
})
```

**配置 MCP Server**：在 `claude_desktop_config.json` 添加

```json
{
  "mcpServers": {
    "dailymind-memory": {
      "command": "node",
      "args": ["/path/to/mcp-servers/memory-server/build/index.js"],
      "env": {
        "SUPABASE_URL": "your-url",
        "SUPABASE_KEY": "your-key"
      }
    }
  }
}
```

#### 4. 知识库自动提取

**实现方式**：在消息生成后进行分析

```typescript
// components/chat/chat-helpers/analyze-conversation.ts
export const analyzeForKnowledgeExtraction = async (
  userMessage: string,
  assistantMessage: string,
  chatHistory: ChatMessage[]
) => {
  const analysisPrompt = `
  分析以下对话，提取可能的：
  1. 教训（用户犯的错误或学到的经验）
  2. 亮点（用户做得好的决策或行为）
  3. 灵感（新的想法或创意）

  返回 JSON 格式：
  {
    "lessons": ["教训1", "教训2"],
    "highlights": ["亮点1"],
    "inspirations": ["灵感1"]
  }

  如果没有发现，返回空数组。要求每条内容简短（不超过50字）。

  对话：
  用户: ${userMessage}
  助手: ${assistantMessage}
  `

  const result = await callLLM(analysisPrompt)
  const extracted = JSON.parse(result)

  // 自动添加到知识库
  for (const lesson of extracted.lessons) {
    await addKnowledgeEntry(userId, 'lesson', lesson, ['自动提取'])
  }
  // ... 类似处理 highlights 和 inspirations
}
```

**在 `handleCreateMessages` 中调用**：
```typescript
// 生成完助手消息后
await analyzeForKnowledgeExtraction(
  finalUserMessage.content,
  finalAssistantMessage.content,
  chatMessages
)
```

#### 5. UI 展示

**新增组件**：

- **DailySummaryPanel** (`components/memory/daily-summary-panel.tsx`)
  - 显示最近7天的总结
  - 点击查看某天的完整对话

- **KnowledgeLibrary** (`components/memory/knowledge-library.tsx`)
  - 三个标签页：教训/亮点/灵感
  - 支持搜索、标签过滤
  - 支持手动添加/编辑/删除

**侧边栏集成**：在 `components/sidebar/sidebar.tsx` 添加入口

---

### 🔧 数据库 vs 文档的最终建议

**推荐：数据库 + 可选导出为 Markdown**

| 功能需求 | 数据库方案 | 文档方案 |
|---------|----------|---------|
| 快速查询 | ✅ 优秀 | ❌ 需要遍历文件 |
| 结构化存储 | ✅ 优秀 | ⚠️ 需要手动解析 |
| 版本控制 | ✅ 内置时间戳 | ✅ Git 控制 |
| 可读性 | ⚠️ 需要查询 | ✅ 直接阅读 |
| 扩展性 | ✅ 易于添加字段 | ⚠️ 需要修改格式 |
| 备份/迁移 | ✅ SQL 导出 | ✅ 文件复制 |
| 简短条目存储 | ✅ 完美契合 | ✅ 也可以 |

**最佳实践**：
1. **主存储**：使用数据库（Supabase）
2. **可选导出**：提供"导出为 Markdown"功能
3. **条目格式**：每条限制 100 字符以内，强制简洁
4. **标签系统**：使用 PostgreSQL 数组类型存储标签
5. **全文搜索**：利用 Supabase 的全文搜索能力

---

### 📊 实现优先级建议

#### Phase 1: 基础功能（1-2周）
1. ✅ 创建数据库表（daily_summaries, knowledge_entries）
2. ✅ 实现每日总结生成（手动触发 + API）
3. ✅ 实现新对话时自动加载最近2天总结
4. ✅ 基础 UI：显示历史总结列表

#### Phase 2: MCP 集成（1周）
1. ✅ 创建 MCP Server（4个核心工具）
2. ✅ 集成到现有的工具调用系统
3. ✅ 测试 AI 按需调用历史数据

#### Phase 3: 知识库系统（1-2周）
1. ✅ 实现知识库 CRUD 操作
2. ✅ 自动提取功能（可选：使用单独的小模型分析）
3. ✅ 知识库 UI（三个标签页）
4. ✅ 搜索和标签过滤

#### Phase 4: 优化与扩展（持续）
1. ⚡ 定时任务自动生成每日总结（Cron）
2. ⚡ 向量化搜索（对总结和知识库进行 embedding）
3. ⚡ 导出功能（Markdown/PDF）
4. ⚡ 可视化：时间线、标签云、统计图表
5. ⚡ Skill 开发（/remember, /recall, /learn 等）

---

### ⚠️ 潜在问题与解决方案

#### 问题1: 总结质量不稳定
**解决**：
- 使用 prompt engineering 确保格式一致
- 提供示例（few-shot）
- 使用 JSON mode 强制结构化输出

#### 问题2: 上下文过长
**解决**：
- 只注入最重要的总结（智能排序）
- 压缩总结内容（使用更小的模型生成超短摘要）
- 使用 token 计数动态调整加载数量

#### 问题3: 知识条目重复
**解决**：
- 在添加前进行相似度检测（使用 embeddings）
- 提供去重 UI
- 允许合并相似条目

#### 问题4: 性能问题
**解决**：
- 为常用查询添加数据库索引
- 使用 Redis 缓存最近的总结
- 分页加载历史数据

---

### 🎨 参考示例

**每日总结示例**：
```
【2026-01-19】
探讨了 DailyMind 的聊天流程实现，分析了前后端架构和数据流。讨论了记忆系统的设计方案，决定使用数据库存储每日总结和知识库条目。主要学到了 RAG 检索和流式响应的实现细节。
```

**知识库条目示例**：
```json
{
  "type": "lesson",
  "content": "在实现流式响应时，记得处理用户取消请求的情况（AbortController）",
  "tags": ["编程", "错误处理", "最佳实践"]
}

{
  "type": "highlight",
  "content": "今天成功将复杂的需求拆解成4个阶段，清晰可执行",
  "tags": ["项目管理", "沟通"]
}

{
  "type": "inspiration",
  "content": "可以用向量搜索来实现智能日记检索，找到过去类似的经历",
  "tags": ["产品想法", "AI应用"]
}
```

---

### ✅ 总结

这个需求设计得很好，核心思路是构建一个**渐进式记忆系统**：
- **短期记忆**：最近2天的总结（自动注入）
- **中期记忆**：按需调用的历史总结（MCP工具）
- **长期记忆**：结构化的知识库（教训/亮点/灵感）

建议采用**数据库为主、文档为辅**的混合方案，既保证了查询性能，又可以导出为可读的 Markdown。整个系统与现有的 Supabase 架构无缝集成，实现成本可控。

如果需要，我可以帮你：
1. 设计详细的数据库 Schema 和迁移脚本
2. 实现 MCP Server 的完整代码
3. 编写自动总结的 Prompt 模板
4. 创建知识库的 UI 组件

有任何疑问或需要调整的地方请告诉我！