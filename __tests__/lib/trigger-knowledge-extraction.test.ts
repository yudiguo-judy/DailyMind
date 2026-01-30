const mockInsert = jest.fn().mockResolvedValue({ error: null })
const mockRpc = jest.fn().mockResolvedValue({ data: [] })

jest.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => ({ insert: mockInsert }),
    rpc: mockRpc
  })
}))

const mockExtractKnowledge = jest.fn()
jest.mock("../../lib/extract-knowledge", () => ({
  extractKnowledge: (...args: any[]) => mockExtractKnowledge(...args)
}))

import { triggerKnowledgeExtraction } from "../../lib/trigger-knowledge-extraction"

describe("triggerKnowledgeExtraction", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRpc.mockResolvedValue({ data: [] })
  })

  it("should skip extraction when total content length < 100", async () => {
    await triggerKnowledgeExtraction(
      [{ role: "user", content: "Hi" }],
      "user-1",
      "ws-1"
    )

    expect(mockExtractKnowledge).not.toHaveBeenCalled()
  })

  it("should call extractKnowledge for substantive conversations", async () => {
    mockExtractKnowledge.mockResolvedValue({
      lessons: [{ content: "A useful lesson", tags: ["test"] }],
      highlights: [],
      inspirations: []
    })

    const messages = [
      { role: "user", content: "A".repeat(60) },
      { role: "assistant", content: "B".repeat(60) }
    ]

    await triggerKnowledgeExtraction(messages, "user-1", "ws-1")

    expect(mockExtractKnowledge).toHaveBeenCalledWith(messages, {
      apiKey: undefined,
      provider: "openai"
    })
  })

  it("should not insert when no knowledge is extracted", async () => {
    mockExtractKnowledge.mockResolvedValue({
      lessons: [],
      highlights: [],
      inspirations: []
    })

    await triggerKnowledgeExtraction(
      [
        { role: "user", content: "A".repeat(60) },
        { role: "assistant", content: "B".repeat(60) }
      ],
      "user-1",
      "ws-1"
    )

    expect(mockInsert).not.toHaveBeenCalled()
  })

  it("should not throw on errors (silent fail)", async () => {
    mockExtractKnowledge.mockRejectedValue(new Error("API error"))

    await expect(
      triggerKnowledgeExtraction(
        [
          { role: "user", content: "A".repeat(60) },
          { role: "assistant", content: "B".repeat(60) }
        ],
        "user-1",
        "ws-1"
      )
    ).resolves.toBeUndefined()
  })
})
