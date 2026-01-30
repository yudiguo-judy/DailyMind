import { extractKnowledge } from "@/lib/extract-knowledge"

// Mock OpenAI
jest.mock("openai", () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    lessons: [
                      {
                        content: "Always validate user input",
                        tags: ["validation", "security"]
                      }
                    ],
                    highlights: [
                      {
                        content: "Decided to use JWT for auth",
                        tags: ["auth", "jwt"]
                      }
                    ],
                    inspirations: [
                      {
                        content: "Could build a real-time dashboard",
                        tags: ["dashboard"]
                      }
                    ]
                  })
                }
              }
            ]
          })
        }
      }
    }))
  }
})

describe("extractKnowledge", () => {
  it("should return empty result for empty messages", async () => {
    const result = await extractKnowledge([])
    expect(result.lessons).toEqual([])
    expect(result.highlights).toEqual([])
    expect(result.inspirations).toEqual([])
  })

  it("should return empty result for non-user/assistant messages", async () => {
    const result = await extractKnowledge([
      { role: "system", content: "You are a helper" }
    ])
    expect(result.lessons).toEqual([])
    expect(result.highlights).toEqual([])
    expect(result.inspirations).toEqual([])
  })

  it("should extract knowledge from messages using OpenAI", async () => {
    const result = await extractKnowledge(
      [
        { role: "user", content: "How should I handle authentication?" },
        {
          role: "assistant",
          content: "You should use JWT with refresh tokens for better security."
        }
      ],
      { provider: "openai" }
    )

    expect(result.lessons).toHaveLength(1)
    expect(result.lessons[0].content).toBe("Always validate user input")
    expect(result.lessons[0].tags).toEqual(["validation", "security"])

    expect(result.highlights).toHaveLength(1)
    expect(result.highlights[0].content).toBe("Decided to use JWT for auth")

    expect(result.inspirations).toHaveLength(1)
    expect(result.inspirations[0].content).toBe(
      "Could build a real-time dashboard"
    )
  })

  it("should filter out entries with content < 5 chars", async () => {
    const OpenAI = (await import("openai")).default as unknown as jest.Mock
    OpenAI.mockImplementationOnce(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    lessons: [
                      { content: "Hi", tags: [] },
                      { content: "Valid lesson content", tags: ["test"] }
                    ],
                    highlights: [],
                    inspirations: []
                  })
                }
              }
            ]
          })
        }
      }
    }))

    const result = await extractKnowledge(
      [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi there" }
      ],
      { provider: "openai" }
    )

    expect(result.lessons).toHaveLength(1)
    expect(result.lessons[0].content).toBe("Valid lesson content")
  })

  it("should cap tags at 10 per entry", async () => {
    const OpenAI = (await import("openai")).default as unknown as jest.Mock
    OpenAI.mockImplementationOnce(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    lessons: [
                      {
                        content: "A lesson with many tags",
                        tags: Array.from({ length: 15 }, (_, i) => `tag${i}`)
                      }
                    ],
                    highlights: [],
                    inspirations: []
                  })
                }
              }
            ]
          })
        }
      }
    }))

    const result = await extractKnowledge(
      [
        { role: "user", content: "Tell me about testing" },
        { role: "assistant", content: "Testing is important" }
      ],
      { provider: "openai" }
    )

    expect(result.lessons[0].tags.length).toBeLessThanOrEqual(10)
  })
})
