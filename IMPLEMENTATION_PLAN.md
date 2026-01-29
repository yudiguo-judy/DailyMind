# DailyMind 渐进式记忆系统 - 实施计划

## 📊 项目概览

**目标**：构建一个三层记忆系统（短期/中期/长期），让 AI 助手具备持久记忆能力

**技术栈**：
- 前端：Next.js 14 + React + TypeScript
- 数据库：Supabase (PostgreSQL)
- AI 集成：MCP (Model Context Protocol)
- 部署：Vercel + Supabase Edge Functions

**预计工期**：4-6 周

---

## 🎯 核心架构

```
渐进式记忆系统
├── 短期记忆（自动注入）
│   └── 最近 2 天的对话总结
├── 中期记忆（按需调用）
│   └── MCP 工具：历史总结检索
└── 长期记忆（结构化存储）
    ├── 教训库 (lessons)
    ├── 亮点库 (highlights)
    └── 灵感库 (inspirations)
```

---

## 📋 Phase 1: 数据库基础架构（第 1 周）

### 1.1 数据库 Schema 设计

- [ ] 设计 `daily_summaries` 表结构
- [ ] 设计 `knowledge_entries` 表结构
- [ ] 设计索引优化策略
- [ ] 编写数据库迁移 SQL 文件
- [ ] 添加 RLS (Row Level Security) 策略

**关键文件**：
```
supabase/migrations/
└── 20260120000000_create_memory_system.sql
```

**详细任务**：

#### 1.1.1 创建迁移文件
- [ ] 创建 `supabase/migrations/20260120000000_create_memory_system.sql`
- [ ] 添加 `daily_summaries` 表定义
  - [ ] 字段：id, user_id, workspace_id, date, summary, message_count, key_topics
  - [ ] 添加 UNIQUE 约束（user_id + workspace_id + date）
  - [ ] 添加外键约束
- [ ] 添加 `knowledge_entries` 表定义
  - [ ] 字段：id, user_id, workspace_id, type, content, source_chat_id, source_message_id, tags
  - [ ] 添加 CHECK 约束（type 必须是 lesson/highlight/inspiration）
  - [ ] 添加外键约束
- [ ] 创建索引
  - [ ] `idx_daily_summaries_date`
  - [ ] `idx_knowledge_entries_type`
  - [ ] `idx_knowledge_entries_tags` (GIN 索引)
- [ ] 添加 RLS 策略
  - [ ] 用户只能访问自己的数据
  - [ ] 基于 workspace_id 的访问控制

#### 1.1.2 执行迁移
- [ ] 运行 `supabase db reset` 测试迁移
- [ ] 验证表结构正确性
- [ ] 测试 RLS 策略

---

### 1.2 TypeScript 类型定义

- [ ] 更新 Supabase 类型定义
- [ ] 创建前端类型文件
- [ ] 创建辅助类型（DailySummary, KnowledgeEntry 等）

**关键文件**：
```
types/
├── daily-summary.ts
└── knowledge-entry.ts
```

**详细任务**：

#### 1.2.1 生成数据库类型
- [ ] 运行 `supabase gen types typescript`
- [ ] 更新 `supabase/types.ts`
- [ ] 验证类型正确性

#### 1.2.2 创建业务类型
- [ ] 创建 `types/daily-summary.ts`
  ```typescript
  export interface DailySummary {
    id: string
    user_id: string
    workspace_id: string
    date: string
    summary: string
    message_count: number
    key_topics: string[]
    created_at: string
  }
  ```
- [ ] 创建 `types/knowledge-entry.ts`
  ```typescript
  export type KnowledgeType = 'lesson' | 'highlight' | 'inspiration'

  export interface KnowledgeEntry {
    id: string
    user_id: string
    workspace_id: string
    type: KnowledgeType
    content: string
    source_chat_id?: string
    source_message_id?: string
    tags: string[]
    created_at: string
    updated_at: string
  }
  ```
- [ ] 导出到 `types/index.ts`

---

### 1.3 数据库操作函数

- [ ] 创建 `db/daily-summaries.ts`
- [ ] 创建 `db/knowledge-entries.ts`
- [ ] 实现 CRUD 操作
- [ ] 添加错误处理

**关键文件**：
```
db/
├── daily-summaries.ts
└── knowledge-entries.ts
```

**详细任务**：

#### 1.3.1 每日总结操作
- [ ] 创建 `db/daily-summaries.ts`
- [ ] 实现 `getDailySummaryByDate(userId, workspaceId, date)`
- [ ] 实现 `getRecentSummaries(userId, workspaceId, days)`
- [ ] 实现 `getDailySummariesByDateRange(userId, workspaceId, startDate, endDate)`
- [ ] 实现 `createDailySummary(summary)`
- [ ] 实现 `updateDailySummary(id, updates)`
- [ ] 实现 `deleteDailySummary(id)`
- [ ] 添加错误处理和类型检查

#### 1.3.2 知识库操作
- [ ] 创建 `db/knowledge-entries.ts`
- [ ] 实现 `getKnowledgeEntriesByType(userId, workspaceId, type)`
- [ ] 实现 `getKnowledgeEntriesByTags(userId, workspaceId, tags)`
- [ ] 实现 `searchKnowledgeEntries(userId, workspaceId, query)`
- [ ] 实现 `createKnowledgeEntry(entry)`
- [ ] 实现 `updateKnowledgeEntry(id, updates)`
- [ ] 实现 `deleteKnowledgeEntry(id)`
- [ ] 实现 `getKnowledgeEntryById(id)`
- [ ] 添加全文搜索支持（使用 PostgreSQL tsvector）

---

### 1.4 测试数据库层

- [ ] 编写单元测试
- [ ] 测试所有 CRUD 操作
- [ ] 测试 RLS 策略
- [ ] 测试索引性能

**详细任务**：
- [ ] 创建测试文件 `__tests__/db/`
- [ ] 测试 daily-summaries CRUD
- [ ] 测试 knowledge-entries CRUD
- [ ] 测试日期范围查询
- [ ] 测试标签搜索
- [ ] 测试权限控制

---

## 📋 Phase 2: 每日总结系统（第 2 周）

### 2.1 AI 总结生成

- [ ] 设计总结生成 Prompt
- [ ] 实现 AI 调用逻辑
- [ ] 处理不同消息类型（文本/图片/文件）
- [ ] 提取关键主题和标签

**关键文件**：
```
lib/
└── generate-daily-summary.ts
```

**详细任务**：

#### 2.1.1 创建 Prompt 模板
- [ ] 创建 `lib/prompts/daily-summary-prompt.ts`
- [ ] 设计总结生成 Prompt
  ```typescript
  export const DAILY_SUMMARY_PROMPT = `
  你是一个专业的对话总结助手。请根据以下对话记录生成一份简洁的每日总结。

  要求：
  1. 总结应包含：主要活动、关键决策、待办事项、情绪状态
  2. 每部分不超过3个要点
  3. 总字数控制在200字以内
  4. 使用简洁明了的语言
  5. 提取3-5个关键主题标签

  返回 JSON 格式：
  {
    "summary": "markdown 格式的总结",
    "key_topics": ["标签1", "标签2", "标签3"]
  }

  对话记录：
  {messages}
  `
  ```
- [ ] 设计 few-shot 示例

#### 2.1.2 实现总结生成函数
- [ ] 创建 `lib/generate-daily-summary.ts`
- [ ] 实现 `generateDailySummary(messages: Message[])`
  - [ ] 格式化消息为可读文本
  - [ ] 调用 AI API（使用 OpenAI 或 Anthropic）
  - [ ] 解析 JSON 响应
  - [ ] 错误处理（API 失败、格式错误等）
- [ ] 实现 `extractKeyTopics(messages: Message[])`
- [ ] 添加消息过滤逻辑（排除系统消息、空消息等）
- [ ] 添加 token 限制处理（对于超长对话的截断策略）

#### 2.1.3 测试总结生成
- [ ] 准备测试数据集（不同类型的对话）
- [ ] 测试短对话总结
- [ ] 测试长对话总结
- [ ] 测试多主题对话总结
- [ ] 验证总结质量和格式

---

### 2.2 手动触发总结

- [ ] 创建 API 端点 `/api/summary/generate`
- [ ] 实现请求处理逻辑
- [ ] 添加权限验证
- [ ] 添加速率限制

**关键文件**：
```
app/api/summary/
└── generate/route.ts
```

**详细任务**：

#### 2.2.1 创建 API 路由
- [ ] 创建 `app/api/summary/generate/route.ts`
- [ ] 实现 POST 端点
  ```typescript
  export async function POST(request: Request) {
    // 1. 验证用户身份
    // 2. 解析请求参数（date, workspaceId）
    // 3. 获取指定日期的所有消息
    // 4. 调用 generateDailySummary
    // 5. 保存到数据库
    // 6. 返回结果
  }
  ```
- [ ] 添加参数验证（日期格式、workspace 存在性）
- [ ] 添加错误处理

#### 2.2.2 权限和安全
- [ ] 验证用户是否有权限访问指定 workspace
- [ ] 添加速率限制（每用户每天最多 10 次）
- [ ] 防止重复生成（检查是否已存在该日期的总结）
- [ ] 添加日志记录

#### 2.2.3 测试 API
- [ ] 测试正常流程
- [ ] 测试无效日期
- [ ] 测试无权限访问
- [ ] 测试空对话日期
- [ ] 测试重复生成

---

### 2.3 自动注入上下文

- [ ] 修改 `buildFinalMessages` 函数
- [ ] 实现自动加载最近 2 天总结
- [ ] 优化 token 使用
- [ ] 添加开关控制

**关键文件**：
```
lib/build-prompt.ts
components/chat/chat-helpers/index.ts
```

**详细任务**：

#### 2.3.1 修改消息构建逻辑
- [ ] 在 `lib/build-prompt.ts` 中添加自动注入逻辑
  ```typescript
  // 检测是否为新对话
  const isNewConversation = chatMessages.length === 0

  if (isNewConversation && enableMemoryInjection) {
    const recentSummaries = await getRecentSummaries(userId, workspaceId, 2)

    if (recentSummaries.length > 0) {
      const memoryContext = formatSummariesAsContext(recentSummaries)
      messages.unshift({
        role: "system",
        content: memoryContext
      })
    }
  }
  ```
- [ ] 实现 `formatSummariesAsContext(summaries)` 函数
- [ ] 添加 token 计数和限制

#### 2.3.2 添加配置选项
- [ ] 在 `types/chat.ts` 中添加 `enableMemoryInjection` 字段
- [ ] 在 chat settings 中添加开关
- [ ] 在 workspace settings 中添加默认配置
- [ ] 支持可配置的天数（默认 2 天）

#### 2.3.3 优化注入策略
- [ ] 实现智能摘要压缩（如果总结太长）
- [ ] 只在必要时注入（例如：非纯闲聊对话）
- [ ] 添加注入标记（在 UI 中显示"已加载 X 天历史"）

#### 2.3.4 测试上下文注入
- [ ] 测试新对话自动注入
- [ ] 测试继续对话不注入
- [ ] 测试开关控制
- [ ] 测试 token 限制
- [ ] 验证 AI 能否理解注入的上下文

---

### 2.4 UI 组件 - 总结展示

- [ ] 创建 `DailySummaryPanel` 组件
- [ ] 创建 `SummaryCard` 组件
- [ ] 实现日历视图
- [ ] 添加手动生成按钮

**关键文件**：
```
components/memory/
├── daily-summary-panel.tsx
├── summary-card.tsx
└── summary-calendar.tsx
```

**详细任务**：

#### 2.4.1 创建基础组件
- [ ] 创建 `components/memory/daily-summary-panel.tsx`
  - [ ] 显示最近 7 天的总结列表
  - [ ] 加载更多功能（分页）
  - [ ] 加载状态和错误处理
- [ ] 创建 `components/memory/summary-card.tsx`
  - [ ] 显示单个总结的卡片
  - [ ] 展开/折叠功能
  - [ ] 显示关键主题标签
  - [ ] 点击查看该日所有对话
- [ ] 样式设计（使用 Tailwind CSS）

#### 2.4.2 日历视图
- [ ] 创建 `components/memory/summary-calendar.tsx`
- [ ] 集成日历库（如 react-day-picker）
- [ ] 标记有总结的日期
- [ ] 点击日期显示该日总结
- [ ] 显示统计信息（本月总结数、总消息数等）

#### 2.4.3 手动生成功能
- [ ] 添加"生成今日总结"按钮
- [ ] 实现生成进度提示
- [ ] 成功/失败提示
- [ ] 防止重复点击

#### 2.4.4 侧边栏集成
- [ ] 在 `components/sidebar/sidebar.tsx` 添加"记忆"入口
- [ ] 创建图标和导航
- [ ] 实现路由跳转
- [ ] 添加徽章显示（如"3 天未总结"）

---

## 📋 Phase 3: MCP 服务集成（第 3 周）

### 3.1 MCP Server 开发

- [ ] 初始化 MCP Server 项目
- [ ] 实现 4 个核心工具
- [ ] 添加 Supabase 客户端
- [ ] 实现错误处理和日志

**关键文件**：
```
mcp-servers/memory-server/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── tools/
│   │   ├── get-daily-summaries.ts
│   │   ├── get-full-chat-history.ts
│   │   ├── search-knowledge.ts
│   │   └── add-knowledge-entry.ts
│   └── utils/
│       └── supabase-client.ts
└── build/
```

**详细任务**：

#### 3.1.1 项目初始化
- [ ] 创建 `mcp-servers/memory-server/` 目录
- [ ] 初始化 `package.json`
  - [ ] 添加依赖：`@modelcontextprotocol/sdk`, `@supabase/supabase-js`
  - [ ] 配置 TypeScript
  - [ ] 配置构建脚本
- [ ] 创建 `tsconfig.json`
- [ ] 创建 `.env.example`（SUPABASE_URL, SUPABASE_KEY）

#### 3.1.2 Supabase 客户端配置
- [ ] 创建 `src/utils/supabase-client.ts`
  ```typescript
  import { createClient } from '@supabase/supabase-js'

  export const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!
  )
  ```
- [ ] 添加环境变量验证
- [ ] 添加连接测试

#### 3.1.3 工具 1: 获取历史总结
- [ ] 创建 `src/tools/get-daily-summaries.ts`
- [ ] 定义工具 schema
  ```typescript
  {
    name: "get_daily_summaries",
    description: "获取指定日期范围的每日对话总结，帮助回忆过去发生的事情",
    parameters: {
      type: "object",
      properties: {
        startDate: {
          type: "string",
          format: "date",
          description: "开始日期 (YYYY-MM-DD)"
        },
        endDate: {
          type: "string",
          format: "date",
          description: "结束日期 (YYYY-MM-DD)"
        },
        limit: {
          type: "number",
          default: 7,
          description: "最多返回的总结数量"
        }
      }
    }
  }
  ```
- [ ] 实现 handler 函数
  - [ ] 参数验证（日期格式、范围合理性）
  - [ ] 调用 Supabase 查询
  - [ ] 格式化返回结果
  - [ ] 错误处理

#### 3.1.4 工具 2: 获取完整对话
- [ ] 创建 `src/tools/get-full-chat-history.ts`
- [ ] 定义工具 schema
  ```typescript
  {
    name: "get_full_chat_history",
    description: "读取某一天的完整对话记录，用于深入了解具体细节",
    parameters: {
      type: "object",
      properties: {
        date: {
          type: "string",
          format: "date",
          description: "要查询的日期 (YYYY-MM-DD)"
        },
        chatId: {
          type: "string",
          description: "可选：指定聊天 ID，如果不指定则返回该日所有对话"
        }
      },
      required: ["date"]
    }
  }
  ```
- [ ] 实现 handler 函数
  - [ ] 根据日期查询所有消息
  - [ ] 可选按 chatId 过滤
  - [ ] 格式化消息（包含时间戳、角色、内容）
  - [ ] 处理图片和文件（返回路径或描述）

#### 3.1.5 工具 3: 搜索知识库
- [ ] 创建 `src/tools/search-knowledge.ts`
- [ ] 定义工具 schema
  ```typescript
  {
    name: "search_knowledge",
    description: "搜索用户的教训、亮点或灵感库，查找相关经验和想法",
    parameters: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["lesson", "highlight", "inspiration", "all"],
          description: "知识类型：lesson(教训)、highlight(亮点)、inspiration(灵感)"
        },
        query: {
          type: "string",
          description: "搜索关键词"
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "按标签过滤"
        }
      }
    }
  }
  ```
- [ ] 实现 handler 函数
  - [ ] 实现全文搜索（使用 PostgreSQL tsvector）
  - [ ] 实现标签过滤
  - [ ] 实现类型过滤
  - [ ] 按相关性排序

#### 3.1.6 工具 4: 添加知识条目
- [ ] 创建 `src/tools/add-knowledge-entry.ts`
- [ ] 定义工具 schema
  ```typescript
  {
    name: "add_knowledge_entry",
    description: "向知识库添加新的教训、亮点或灵感",
    parameters: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["lesson", "highlight", "inspiration"],
          description: "知识类型"
        },
        content: {
          type: "string",
          description: "内容（建议不超过100字）"
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "相关标签"
        }
      },
      required: ["type", "content"]
    }
  }
  ```
- [ ] 实现 handler 函数
  - [ ] 内容长度验证（限制 100 字）
  - [ ] 去重检测（防止添加重复内容）
  - [ ] 插入数据库
  - [ ] 返回成功确认

#### 3.1.7 主入口文件
- [ ] 创建 `src/index.ts`
  ```typescript
  import { MCPServer } from '@modelcontextprotocol/sdk'
  import { getDailySummariesTool } from './tools/get-daily-summaries'
  import { getFullChatHistoryTool } from './tools/get-full-chat-history'
  import { searchKnowledgeTool } from './tools/search-knowledge'
  import { addKnowledgeEntryTool } from './tools/add-knowledge-entry'

  const server = new MCPServer({
    name: "DailyMind Memory",
    version: "1.0.0",
    description: "DailyMind 记忆系统 - 访问历史对话、总结和知识库"
  })

  // 注册所有工具
  server.addTool(getDailySummariesTool)
  server.addTool(getFullChatHistoryTool)
  server.addTool(searchKnowledgeTool)
  server.addTool(addKnowledgeEntryTool)

  // 启动服务器
  server.start()
  ```
- [ ] 添加启动日志
- [ ] 添加健康检查端点

#### 3.1.8 构建和测试
- [ ] 配置构建脚本
  ```json
  {
    "scripts": {
      "build": "tsc",
      "dev": "tsc --watch",
      "start": "node build/index.js"
    }
  }
  ```
- [ ] 运行构建测试
- [ ] 测试每个工具的功能
- [ ] 编写测试用例

---

### 3.2 MCP Server 配置

- [ ] 更新 Claude 配置文件
- [ ] 配置环境变量
- [ ] 测试 MCP 连接
- [ ] 编写使用文档

**详细任务**：

#### 3.2.1 Claude Desktop 配置
- [ ] 定位配置文件位置
  - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
  - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- [ ] 添加 MCP Server 配置
  ```json
  {
    "mcpServers": {
      "dailymind-memory": {
        "command": "node",
        "args": [
          "/path/to/mcp-servers/memory-server/build/index.js"
        ],
        "env": {
          "SUPABASE_URL": "your-supabase-url",
          "SUPABASE_ANON_KEY": "your-anon-key"
        }
      }
    }
  }
  ```
- [ ] 使用绝对路径（避免路径问题）
- [ ] 配置正确的环境变量

#### 3.2.2 测试 MCP 集成
- [ ] 重启 Claude Desktop
- [ ] 验证 MCP Server 已加载
- [ ] 测试工具调用：
  - [ ] "帮我查看过去 7 天的对话总结"
  - [ ] "2026年1月15日我们聊了什么？"
  - [ ] "搜索我学到的关于编程的教训"
  - [ ] "添加一条亮点：今天成功完成了项目规划"
- [ ] 检查错误日志

#### 3.2.3 编写使用文档
- [ ] 创建 `mcp-servers/memory-server/README.md`
- [ ] 包含：
  - [ ] 功能介绍
  - [ ] 安装步骤
  - [ ] 配置说明
  - [ ] 工具使用示例
  - [ ] 故障排查

---

### 3.3 前端工具调用集成

- [ ] 检查现有工具调用系统
- [ ] 确保 MCP 工具可用
- [ ] 添加工具调用 UI 反馈
- [ ] 测试端到端流程

**详细任务**：

#### 3.3.1 验证工具调用基础设施
- [ ] 检查 `app/api/chat/tools/route.ts` 是否支持 MCP
- [ ] 验证工具调用流程
- [ ] 确保用户上下文正确传递（userId, workspaceId）

#### 3.3.2 UI 反馈优化
- [ ] 在聊天界面显示工具调用状态
  - [ ] "正在查询历史总结..."
  - [ ] "正在搜索知识库..."
- [ ] 显示工具调用结果（可选：折叠/展开）
- [ ] 添加工具调用图标/徽章

#### 3.3.3 端到端测试
- [ ] 测试完整对话流程
  - [ ] 用户：请总结我上周学到的东西
  - [ ] AI：调用 `get_daily_summaries` 和 `search_knowledge`
  - [ ] AI：生成综合总结
- [ ] 测试错误处理（工具调用失败的情况）
- [ ] 测试性能（工具调用延迟）

---

## 📋 Phase 4: 知识库系统（第 4 周）

### 4.1 自动提取功能

- [ ] 设计知识提取 Prompt
- [ ] 实现对话分析逻辑
- [ ] 实现自动添加到知识库
- [ ] 添加去重逻辑

**关键文件**：
```
lib/
└── extract-knowledge.ts
components/chat/chat-helpers/
└── analyze-conversation.ts
```

**详细任务**：

#### 4.1.1 设计提取 Prompt
- [ ] 创建 `lib/prompts/knowledge-extraction-prompt.ts`
  ```typescript
  export const KNOWLEDGE_EXTRACTION_PROMPT = `
  分析以下对话，提取可能的知识条目：

  1. **教训** (lessons)：用户犯的错误、学到的经验、需要改进的地方
  2. **亮点** (highlights)：用户做得好的决策、值得表扬的行为、成功经验
  3. **灵感** (inspirations)：新的想法、创意、未来可能尝试的方向

  要求：
  - 每条内容简短精炼（不超过50字）
  - 只提取明确且有价值的内容
  - 如果没有发现，返回空数组
  - 为每条内容生成2-3个相关标签

  返回 JSON 格式：
  {
    "lessons": [
      { "content": "教训内容", "tags": ["标签1", "标签2"] }
    ],
    "highlights": [...],
    "inspirations": [...]
  }

  对话：
  用户: {userMessage}
  助手: {assistantMessage}
  `
  ```
- [ ] 设计 few-shot 示例

#### 4.1.2 实现提取逻辑
- [ ] 创建 `lib/extract-knowledge.ts`
- [ ] 实现 `extractKnowledge(userMessage, assistantMessage, context)`
  - [ ] 调用 AI API
  - [ ] 解析 JSON 响应
  - [ ] 验证内容长度（不超过 100 字）
  - [ ] 错误处理
- [ ] 实现智能触发逻辑
  - [ ] 不是每条消息都提取（性能考虑）
  - [ ] 只在有价值的对话后触发
  - [ ] 例如：对话长度 > 50 字 && 包含关键词

#### 4.1.3 去重逻辑
- [ ] 实现 `checkDuplicate(content, type, userId)`
  - [ ] 使用简单的文本相似度算法（Levenshtein 距离）
  - [ ] 或使用 embeddings 相似度（更精确但更贵）
  - [ ] 相似度阈值：0.85
- [ ] 在添加前自动去重
- [ ] 提供"合并相似条目"的 UI

#### 4.1.4 集成到聊天流程
- [ ] 在 `components/chat/chat-helpers/index.ts` 中的 `handleCreateMessages` 添加调用
  ```typescript
  // 生成完助手消息后
  if (shouldExtractKnowledge(userMessage, assistantMessage)) {
    const extracted = await extractKnowledge(
      userMessage.content,
      assistantMessage.content,
      chatHistory
    )

    await saveExtractedKnowledge(extracted, userId, workspaceId, {
      chatId,
      messageId: assistantMessage.id
    })
  }
  ```
- [ ] 添加后台异步处理（不阻塞消息返回）
- [ ] 添加开关控制（用户可以禁用自动提取）

#### 4.1.5 测试自动提取
- [ ] 准备测试对话集
  - [ ] 包含明显教训的对话
  - [ ] 包含亮点的对话
  - [ ] 包含灵感的对话
  - [ ] 普通闲聊对话（不应提取）
- [ ] 验证提取准确性
- [ ] 验证去重功能
- [ ] 性能测试（不影响消息响应速度）

---

### 4.2 知识库 UI

- [ ] 创建知识库主界面
- [ ] 实现三个标签页（教训/亮点/灵感）
- [ ] 实现搜索和过滤
- [ ] 实现 CRUD 操作

**关键文件**：
```
components/memory/
├── knowledge-library.tsx
├── knowledge-entry-card.tsx
├── knowledge-entry-form.tsx
└── knowledge-filters.tsx
app/[locale]/[workspaceid]/knowledge/
└── page.tsx
```

**详细任务**：

#### 4.2.1 知识库主页面
- [ ] 创建 `app/[locale]/[workspaceid]/knowledge/page.tsx`
- [ ] 创建路由和导航
- [ ] 添加到侧边栏菜单

#### 4.2.2 主组件
- [ ] 创建 `components/memory/knowledge-library.tsx`
- [ ] 实现标签页切换（Lessons / Highlights / Inspirations）
- [ ] 加载对应类型的知识条目
- [ ] 分页或无限滚动
- [ ] 加载状态和空状态

#### 4.2.3 知识条目卡片
- [ ] 创建 `components/memory/knowledge-entry-card.tsx`
- [ ] 显示内容、标签、创建时间
- [ ] 显示来源（哪个对话、哪条消息）
- [ ] 操作按钮：编辑、删除、复制
- [ ] 点击标签过滤

#### 4.2.4 添加/编辑表单
- [ ] 创建 `components/memory/knowledge-entry-form.tsx`
- [ ] 表单字段：
  - [ ] 类型选择（教训/亮点/灵感）
  - [ ] 内容输入（带字数限制提示）
  - [ ] 标签输入（支持自动补全）
- [ ] 表单验证
- [ ] 提交逻辑
- [ ] 成功/错误提示

#### 4.2.5 搜索和过滤
- [ ] 创建 `components/memory/knowledge-filters.tsx`
- [ ] 全文搜索输入框
- [ ] 标签过滤器（多选）
- [ ] 日期范围过滤器
- [ ] 排序选项（最新、最早、最相关）
- [ ] 清除所有过滤器按钮

#### 4.2.6 批量操作
- [ ] 多选功能
- [ ] 批量删除
- [ ] 批量修改标签
- [ ] 批量导出

---

### 4.3 标签系统

- [ ] 实现标签自动建议
- [ ] 创建标签管理界面
- [ ] 实现标签云展示
- [ ] 标签重命名和合并

**详细任务**：

#### 4.3.1 标签自动建议
- [ ] 分析现有标签
- [ ] 实现输入时的自动补全
- [ ] 显示热门标签（使用频率）
- [ ] 智能推荐相关标签

#### 4.3.2 标签管理
- [ ] 创建标签管理页面 `app/[locale]/[workspaceid]/knowledge/tags/page.tsx`
- [ ] 显示所有标签及其使用次数
- [ ] 标签重命名功能
- [ ] 标签合并功能（将 tag1 合并到 tag2）
- [ ] 删除未使用的标签

#### 4.3.3 标签可视化
- [ ] 实现标签云（按使用频率大小显示）
- [ ] 点击标签进行过滤
- [ ] 标签颜色编码（按类型）

---

### 4.4 导出和备份

- [ ] 实现导出为 Markdown
- [ ] 实现导出为 JSON
- [ ] 实现导出为 PDF（可选）
- [ ] 自动备份功能

**详细任务**：

#### 4.4.1 Markdown 导出
- [ ] 创建 `lib/export-knowledge.ts`
- [ ] 实现 `exportAsMarkdown(entries, options)`
  ```markdown
  # 我的知识库

  ## 教训 (Lessons)

  ### 编程
  - 在处理大量数据时，记得先进行数据验证避免后续错误
    - 标签: #编程 #数据处理
    - 来源: 2026-01-15 的对话

  ## 亮点 (Highlights)
  ...

  ## 灵感 (Inspirations)
  ...
  ```
- [ ] 按类型分组
- [ ] 按标签分组（可选）
- [ ] 包含元数据（来源、日期）

#### 4.4.2 JSON 导出
- [ ] 实现 `exportAsJSON(entries)`
- [ ] 标准 JSON 格式
- [ ] 包含所有字段
- [ ] 支持导入（备份恢复）

#### 4.4.3 导出 UI
- [ ] 添加导出按钮（在知识库页面）
- [ ] 选择导出格式
- [ ] 选择导出范围（全部/按类型/按标签）
- [ ] 下载文件

#### 4.4.4 自动备份
- [ ] 每周自动导出到 Supabase Storage
- [ ] 保留最近 4 周的备份
- [ ] 提供恢复功能

---

## 📋 Phase 5: 优化与扩展（第 5-6 周）

### 5.1 定时任务 - 自动总结

- [ ] 配置 Supabase Cron Job
- [ ] 实现定时触发逻辑
- [ ] 添加失败重试机制
- [ ] 发送通知（可选）

**关键文件**：
```
supabase/functions/
├── daily-summary-cron/
│   └── index.ts
└── _shared/
    └── generate-summary.ts
```

**详细任务**：

#### 5.1.1 创建 Edge Function
- [ ] 创建 `supabase/functions/daily-summary-cron/index.ts`
  ```typescript
  Deno.serve(async (req) => {
    // 1. 获取所有需要生成总结的用户（昨天有对话但没有总结）
    const usersNeedSummary = await getUsersNeedingSummary()

    // 2. 对每个用户生成总结
    for (const user of usersNeedSummary) {
      try {
        await generateAndSaveDailySummary(user.id, user.workspace_id, yesterday)
      } catch (error) {
        console.error(`Failed for user ${user.id}:`, error)
        // 记录到错误日志表
      }
    }

    return new Response(JSON.stringify({
      success: true,
      processed: usersNeedSummary.length
    }))
  })
  ```
- [ ] 实现 `getUsersNeedingSummary()` 逻辑
- [ ] 实现错误日志记录

#### 5.1.2 配置 Cron Job
- [ ] 在 Supabase Dashboard 配置 Cron
  - [ ] 时间：每天凌晨 2:00
  - [ ] URL：Edge Function URL
  - [ ] 认证：Service Role Key
- [ ] 或使用 `pg_cron` 扩展
  ```sql
  SELECT cron.schedule(
    'daily-summary-job',
    '0 2 * * *',  -- 每天凌晨 2:00
    $$SELECT net.http_post(
      url:='https://your-project.supabase.co/functions/v1/daily-summary-cron',
      headers:='{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
    ) AS request_id;$$
  );
  ```

#### 5.1.3 失败重试机制
- [ ] 创建 `summary_generation_queue` 表
  ```sql
  CREATE TABLE summary_generation_queue (
    id UUID PRIMARY KEY,
    user_id UUID,
    workspace_id UUID,
    date DATE,
    status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    retry_count INT DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  );
  ```
- [ ] 失败后加入队列
- [ ] 最多重试 3 次
- [ ] 指数退避策略

#### 5.1.4 通知功能（可选）
- [ ] 总结完成后发送通知
- [ ] 支持 Email、Webhook 或应用内通知
- [ ] 用户可配置通知偏好

---

### 5.2 向量搜索 - RAG 增强

- [ ] 为总结和知识库生成 embeddings
- [ ] 实现语义搜索
- [ ] 集成到 MCP 工具
- [ ] 优化搜索结果排序

**详细任务**：

#### 5.2.1 数据库支持
- [ ] 为表添加 embeddings 字段
  ```sql
  ALTER TABLE daily_summaries
  ADD COLUMN embedding VECTOR(1536);

  ALTER TABLE knowledge_entries
  ADD COLUMN embedding VECTOR(1536);

  -- 创建向量索引
  CREATE INDEX ON daily_summaries
  USING ivfflat (embedding vector_cosine_ops);
  ```
- [ ] 安装 pgvector 扩展

#### 5.2.2 生成 Embeddings
- [ ] 创建 `lib/generate-embeddings.ts`
- [ ] 使用 OpenAI Embeddings API
  ```typescript
  import { OpenAI } from 'openai'

  export async function generateEmbedding(text: string): Promise<number[]> {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text
    })
    return response.data[0].embedding
  }
  ```
- [ ] 在创建总结/知识条目时自动生成 embedding
- [ ] 批量生成现有数据的 embeddings

#### 5.2.3 语义搜索实现
- [ ] 更新 `search_knowledge` MCP 工具
- [ ] 实现混合搜索（关键词 + 语义）
- [ ] 调整相关性权重
- [ ] 返回相似度分数

#### 5.2.4 智能推荐
- [ ] 基于当前对话内容推荐相关知识
- [ ] 在聊天界面显示"相关记忆"侧边栏
- [ ] 点击插入到对话上下文

---

### 5.3 数据可视化

- [ ] 实现统计仪表板
- [ ] 对话活跃度图表
- [ ] 知识库增长曲线
- [ ] 标签分布图

**关键文件**：
```
components/memory/
├── memory-dashboard.tsx
├── activity-chart.tsx
└── knowledge-stats.tsx
```

**详细任务**：

#### 5.3.1 仪表板主页
- [ ] 创建 `components/memory/memory-dashboard.tsx`
- [ ] 显示关键指标：
  - [ ] 总对话天数
  - [ ] 总消息数
  - [ ] 总结生成率（已总结天数 / 总天数）
  - [ ] 知识库条目总数（分类统计）

#### 5.3.2 活跃度图表
- [ ] 使用图表库（如 recharts）
- [ ] 创建 `components/memory/activity-chart.tsx`
- [ ] 显示最近 30 天的消息数量
- [ ] 热力图：哪些日期对话最多

#### 5.3.3 知识库统计
- [ ] 创建 `components/memory/knowledge-stats.tsx`
- [ ] 知识库增长曲线（按月/周）
- [ ] 类型分布饼图
- [ ] 最常用标签 Top 10

#### 5.3.4 时间线视图
- [ ] 创建互动时间线
- [ ] 显示重要事件（第一次对话、里程碑等）
- [ ] 点击跳转到对应日期

---

### 5.4 性能优化

- [ ] 实现 Redis 缓存
- [ ] 优化数据库查询
- [ ] 实现懒加载和虚拟滚动
- [ ] 代码分割和打包优化

**详细任务**：

#### 5.4.1 缓存策略
- [ ] 配置 Redis（或使用 Upstash）
- [ ] 缓存最近总结（TTL: 1 小时）
- [ ] 缓存热门知识条目（TTL: 30 分钟）
- [ ] 缓存用户配置（TTL: 5 分钟）
- [ ] 实现缓存失效机制

#### 5.4.2 数据库优化
- [ ] 分析慢查询
- [ ] 添加复合索引
- [ ] 优化 JOIN 查询
- [ ] 使用 materialized views（对于复杂统计）

#### 5.4.3 前端优化
- [ ] 实现虚拟滚动（react-window）
- [ ] 图片懒加载
- [ ] 代码分割（动态 import）
- [ ] 使用 React.memo 减少重渲染
- [ ] 防抖/节流搜索输入

#### 5.4.4 性能监控
- [ ] 添加性能追踪（Vercel Analytics）
- [ ] 监控 API 响应时间
- [ ] 监控数据库查询时间
- [ ] 设置性能预算

---

### 5.5 用户配置和设置

- [ ] 创建记忆系统设置页面
- [ ] 配置自动注入天数
- [ ] 配置自动提取开关
- [ ] 配置通知偏好

**详细任务**：

#### 5.5.1 扩展用户配置表
- [ ] 添加 `memory_settings` 表
  ```sql
  CREATE TABLE memory_settings (
    user_id UUID PRIMARY KEY REFERENCES profiles(user_id),
    workspace_id UUID REFERENCES workspaces(id),
    enable_auto_inject BOOLEAN DEFAULT true,
    inject_days INT DEFAULT 2,
    enable_auto_extract BOOLEAN DEFAULT true,
    enable_notifications BOOLEAN DEFAULT false,
    notification_channels TEXT[] DEFAULT '{}',
    updated_at TIMESTAMP DEFAULT NOW()
  );
  ```
- [ ] 设置默认值

#### 5.5.2 设置界面
- [ ] 创建 `app/[locale]/[workspaceid]/settings/memory/page.tsx`
- [ ] 表单字段：
  - [ ] 自动注入总结（开关）
  - [ ] 注入天数（滑块：1-7 天）
  - [ ] 自动提取知识（开关）
  - [ ] 通知设置（开关 + 渠道选择）
- [ ] 保存逻辑
- [ ] 实时预览效果

#### 5.5.3 应用配置
- [ ] 在消息构建时读取配置
- [ ] 在知识提取时读取配置
- [ ] 在定时任务中读取配置

---

## 📋 Phase 6: 测试与文档（贯穿整个开发）

### 6.1 单元测试

- [ ] 数据库操作测试
- [ ] AI 生成逻辑测试
- [ ] 工具函数测试
- [ ] 组件测试

**详细任务**：
- [ ] 配置测试框架（Jest + React Testing Library）
- [ ] 编写数据库操作测试
- [ ] 编写 API 端点测试
- [ ] 编写组件快照测试
- [ ] 达到 80% 代码覆盖率

---

### 6.2 集成测试

- [ ] 端到端对话流程测试
- [ ] MCP 工具调用测试
- [ ] 自动总结流程测试
- [ ] 知识提取流程测试

**详细任务**：
- [ ] 配置 E2E 测试框架（Playwright）
- [ ] 编写关键路径测试
- [ ] 测试错误场景
- [ ] 测试性能（负载测试）

---

### 6.3 用户文档

- [ ] 编写用户使用指南
- [ ] 编写 MCP 工具使用示例
- [ ] 编写 FAQ
- [ ] 录制演示视频

**详细任务**：
- [ ] 创建 `docs/user-guide.md`
- [ ] 创建 `docs/mcp-tools-guide.md`
- [ ] 创建 `docs/faq.md`
- [ ] 添加 UI 内置帮助提示

---

### 6.4 开发文档

- [ ] API 文档
- [ ] 数据库 Schema 文档
- [ ] 架构设计文档
- [ ] 贡献指南

**详细任务**：
- [ ] 创建 `docs/api-reference.md`
- [ ] 创建 `docs/database-schema.md`
- [ ] 创建 `docs/architecture.md`
- [ ] 更新 `README.md`

---

## 🎯 里程碑和验收标准

### Milestone 1: 数据基础 (Week 1)
**验收标准**：
- [ ] 所有数据库表创建成功
- [ ] 所有 CRUD 操作测试通过
- [ ] RLS 策略正确工作
- [ ] TypeScript 类型无错误

### Milestone 2: 基础功能 (Week 2)
**验收标准**：
- [ ] 可以手动生成每日总结
- [ ] 新对话自动注入最近 2 天总结
- [ ] 总结 UI 可以正常显示
- [ ] 总结质量达到预期

### Milestone 3: MCP 集成 (Week 3)
**验收标准**：
- [ ] MCP Server 正常启动
- [ ] 4 个工具全部可用
- [ ] Claude 可以成功调用工具
- [ ] 端到端测试通过

### Milestone 4: 知识库 (Week 4)
**验收标准**：
- [ ] 可以自动提取知识条目
- [ ] 知识库 UI 完整可用
- [ ] 搜索和过滤功能正常
- [ ] 标签系统工作正常

### Milestone 5: 优化完成 (Week 5-6)
**验收标准**：
- [ ] 定时任务稳定运行
- [ ] 向量搜索提供更好的结果
- [ ] 仪表板数据准确
- [ ] 性能达标（P95 响应时间 < 2s）
- [ ] 所有文档完成

---

## 📊 进度追踪

| 阶段 | 开始日期 | 结束日期 | 状态 | 完成度 |
|-----|---------|---------|------|--------|
| Phase 1: 数据库 | 2026-01-19 | 2026-01-19 | ✅ 已完成 | 100% |
| Phase 2: 每日总结 | 2026-01-19 | 2026-01-19 | ✅ 已完成 | 100% |
| Phase 3: MCP 集成 | 2026-01-21 | 2026-01-21 | ✅ 已完成 | 100% |
| Phase 4: 知识库 | | | ⏳ 待开始 | 0% |
| Phase 5: 优化 | | | ⏳ 待开始 | 0% |
| Phase 6: 测试文档 | | | ⏳ 待开始 | 0% |

---

## 🚨 风险和注意事项

### 技术风险
- [ ] AI 生成质量不稳定 → 多次测试和 prompt 优化
- [ ] MCP 协议变更 → 关注官方更新
- [ ] 数据库性能问题 → 提前进行负载测试
- [ ] Supabase 限制 → 了解配额和限制

### 业务风险
- [ ] 用户隐私问题 → 确保数据加密和权限控制
- [ ] API 成本过高 → 实现缓存和优化调用次数
- [ ] 功能复杂度 → 保持 MVP 思维，逐步迭代

### 缓解措施
- [ ] 定期代码审查
- [ ] 持续监控和日志
- [ ] 保持文档更新
- [ ] 定期备份数据

---

## 🎉 项目启动检查清单

在开始实施前，确保以下准备工作完成：

- [ ] Supabase 项目已创建并配置
- [ ] 开发环境配置完成
- [ ] 必要的 API 密钥已获取（OpenAI/Anthropic）
- [ ] Git 仓库和分支策略确定
- [ ] 团队成员角色分配（如果有）
- [ ] 项目管理工具设置（如 GitHub Projects）
- [ ] 沟通渠道建立

---

## 📝 下一步行动

**立即开始**：
1. 创建 Phase 1 的工作分支 `git checkout -b feature/memory-system-db`
2. 创建数据库迁移文件
3. 定义 TypeScript 类型
4. 实现第一个 CRUD 操作并测试

**本周目标**：完成 Phase 1 所有任务

---

**最后更新**: 2026-01-19
**版本**: 1.0.0
**负责人**: [填写]
**预计完成**: [填写]
