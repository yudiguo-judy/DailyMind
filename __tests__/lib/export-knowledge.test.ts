import { exportAsMarkdown, exportAsJSON } from "@/lib/export-knowledge"
import { KnowledgeEntry } from "@/types/knowledge-entry"

const makeEntry = (
  overrides: Partial<KnowledgeEntry> = {}
): KnowledgeEntry => ({
  id: "test-id",
  user_id: "user-1",
  workspace_id: "ws-1",
  source_chat_id: null,
  source_message_id: null,
  created_at: "2026-01-20T10:00:00Z",
  updated_at: null,
  type: "lesson",
  content: "Test content",
  tags: ["tag1"],
  ...overrides
})

describe("exportAsMarkdown", () => {
  it("should return empty message when no entries", () => {
    const result = exportAsMarkdown([])
    expect(result).toContain("No knowledge entries found")
  })

  it("should group entries by type", () => {
    const entries = [
      makeEntry({ type: "lesson", content: "A lesson learned" }),
      makeEntry({
        id: "2",
        type: "highlight",
        content: "A key highlight"
      }),
      makeEntry({
        id: "3",
        type: "inspiration",
        content: "An inspiration"
      })
    ]

    const result = exportAsMarkdown(entries)

    expect(result).toContain("# Knowledge Library")
    expect(result).toContain("## Lessons")
    expect(result).toContain("A lesson learned")
    expect(result).toContain("## Highlights")
    expect(result).toContain("A key highlight")
    expect(result).toContain("## Inspirations")
    expect(result).toContain("An inspiration")
  })

  it("should include tags", () => {
    const entries = [
      makeEntry({ tags: ["react", "typescript"] })
    ]
    const result = exportAsMarkdown(entries)
    expect(result).toContain("Tags: react, typescript")
  })

  it("should include dates", () => {
    const entries = [makeEntry()]
    const result = exportAsMarkdown(entries)
    expect(result).toContain("1/20/2026")
  })

  it("should omit sections with no entries", () => {
    const entries = [makeEntry({ type: "lesson" })]
    const result = exportAsMarkdown(entries)
    expect(result).toContain("## Lessons")
    expect(result).not.toContain("## Highlights")
    expect(result).not.toContain("## Inspirations")
  })
})

describe("exportAsJSON", () => {
  it("should return valid JSON", () => {
    const entries = [makeEntry()]
    const result = exportAsJSON(entries)
    const parsed = JSON.parse(result)
    expect(Array.isArray(parsed)).toBe(true)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].content).toBe("Test content")
  })

  it("should return empty array for no entries", () => {
    const result = exportAsJSON([])
    const parsed = JSON.parse(result)
    expect(parsed).toEqual([])
  })
})
