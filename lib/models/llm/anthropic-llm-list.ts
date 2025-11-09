import { LLM } from "@/types"

const ANTHROPIC_PLATFORM_LINK =
  "https://docs.anthropic.com/claude/reference/getting-started-with-the-api"

// Anthropic Models (UPDATED 01/09/25) -----------------------------

// Claude Haiku 4.5 (UPDATED 10/01/24)
const CLAUDE_HAIKU_4_5: LLM = {
  modelId: "claude-haiku-4-5-20251001",
  modelName: "Claude Haiku 4.5",
  provider: "anthropic",
  hostedId: "claude-haiku-4-5-20251001",
  platformLink: ANTHROPIC_PLATFORM_LINK,
  imageInput: true,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 1,
    outputCost: 5
  }
}

// Claude Sonnet 4.5 (UPDATED 09/29/24)
const CLAUDE_SONNET_4_5: LLM = {
  modelId: "claude-sonnet-4-5-20250929",
  modelName: "Claude Sonnet 4.5",
  provider: "anthropic",
  hostedId: "claude-sonnet-4-5-20250929",
  platformLink: ANTHROPIC_PLATFORM_LINK,
  imageInput: true,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 3,
    outputCost: 15
  }
}

// Claude Opus 4.1 (UPDATED 08/05/24)
const CLAUDE_OPUS_4_1: LLM = {
  modelId: "claude-opus-4-1-20250805",
  modelName: "Claude Opus 4.1",
  provider: "anthropic",
  hostedId: "claude-opus-4-1-20250805",
  platformLink: ANTHROPIC_PLATFORM_LINK,
  imageInput: true,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 15,
    outputCost: 75
  }
}

// Legacy: Claude 3 Haiku (UPDATED 03/13/24)
const CLAUDE_3_HAIKU: LLM = {
  modelId: "claude-3-haiku-20240307",
  modelName: "Claude 3 Haiku (Legacy)",
  provider: "anthropic",
  hostedId: "claude-3-haiku-20240307",
  platformLink: ANTHROPIC_PLATFORM_LINK,
  imageInput: true,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 0.25,
    outputCost: 1.25
  }
}

// Legacy: Claude 3 Opus (UPDATED 03/04/24)
const CLAUDE_3_OPUS: LLM = {
  modelId: "claude-3-opus-20240229",
  modelName: "Claude 3 Opus (Legacy)",
  provider: "anthropic",
  hostedId: "claude-3-opus-20240229",
  platformLink: ANTHROPIC_PLATFORM_LINK,
  imageInput: true,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 15,
    outputCost: 75
  }
}

export const ANTHROPIC_LLM_LIST: LLM[] = [
  CLAUDE_HAIKU_4_5,
  CLAUDE_SONNET_4_5,
  CLAUDE_OPUS_4_1,
  CLAUDE_3_HAIKU,
  CLAUDE_3_OPUS
]
