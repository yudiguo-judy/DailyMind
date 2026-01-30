import {
  KNOWLEDGE_EXTRACTION_SYSTEM_PROMPT,
  buildKnowledgeExtractionPrompt
} from "@/lib/prompts/knowledge-extraction-prompt"

describe("KNOWLEDGE_EXTRACTION_SYSTEM_PROMPT", () => {
  it("should mention the three knowledge types", () => {
    expect(KNOWLEDGE_EXTRACTION_SYSTEM_PROMPT).toContain("Lessons")
    expect(KNOWLEDGE_EXTRACTION_SYSTEM_PROMPT).toContain("Highlights")
    expect(KNOWLEDGE_EXTRACTION_SYSTEM_PROMPT).toContain("Inspirations")
  })

  it("should specify JSON output format", () => {
    expect(KNOWLEDGE_EXTRACTION_SYSTEM_PROMPT).toContain('"lessons"')
    expect(KNOWLEDGE_EXTRACTION_SYSTEM_PROMPT).toContain('"highlights"')
    expect(KNOWLEDGE_EXTRACTION_SYSTEM_PROMPT).toContain('"inspirations"')
  })

  it("should mention content length constraints", () => {
    expect(KNOWLEDGE_EXTRACTION_SYSTEM_PROMPT).toContain("5-500")
  })
})

describe("buildKnowledgeExtractionPrompt", () => {
  it("should format messages with roles", () => {
    const prompt = buildKnowledgeExtractionPrompt({
      messages: [
        { role: "user", content: "How do I use React hooks?" },
        { role: "assistant", content: "React hooks are functions..." }
      ]
    })

    expect(prompt).toContain("User: How do I use React hooks?")
    expect(prompt).toContain("Assistant: React hooks are functions...")
  })

  it("should truncate long messages to 1000 chars", () => {
    const longContent = "A".repeat(1500)
    const prompt = buildKnowledgeExtractionPrompt({
      messages: [{ role: "user", content: longContent }]
    })

    expect(prompt).toContain("A".repeat(1000) + "...")
    expect(prompt).not.toContain("A".repeat(1001))
  })

  it("should include extraction instruction", () => {
    const prompt = buildKnowledgeExtractionPrompt({
      messages: [{ role: "user", content: "Hello" }]
    })

    expect(prompt).toContain("Extract knowledge as a JSON response")
  })
})
