import { KnowledgeEntry } from "@/types/knowledge-entry"

/**
 * Export knowledge entries as Markdown, grouped by type
 */
export function exportAsMarkdown(entries: KnowledgeEntry[]): string {
  const lessons = entries.filter(e => e.type === "lesson")
  const highlights = entries.filter(e => e.type === "highlight")
  const inspirations = entries.filter(e => e.type === "inspiration")

  let md = "# Knowledge Library\n\n"
  md += `_Exported on ${new Date().toLocaleDateString()}_\n\n`

  if (lessons.length > 0) {
    md += "## Lessons\n\n"
    for (const entry of lessons) {
      md += `- ${entry.content}\n`
      if (entry.tags && entry.tags.length > 0) {
        md += `  Tags: ${entry.tags.join(", ")}\n`
      }
      md += `  _${new Date(entry.created_at).toLocaleDateString()}_\n\n`
    }
  }

  if (highlights.length > 0) {
    md += "## Highlights\n\n"
    for (const entry of highlights) {
      md += `- ${entry.content}\n`
      if (entry.tags && entry.tags.length > 0) {
        md += `  Tags: ${entry.tags.join(", ")}\n`
      }
      md += `  _${new Date(entry.created_at).toLocaleDateString()}_\n\n`
    }
  }

  if (inspirations.length > 0) {
    md += "## Inspirations\n\n"
    for (const entry of inspirations) {
      md += `- ${entry.content}\n`
      if (entry.tags && entry.tags.length > 0) {
        md += `  Tags: ${entry.tags.join(", ")}\n`
      }
      md += `  _${new Date(entry.created_at).toLocaleDateString()}_\n\n`
    }
  }

  if (entries.length === 0) {
    md += "_No knowledge entries found._\n"
  }

  return md
}

/**
 * Export knowledge entries as JSON
 */
export function exportAsJSON(entries: KnowledgeEntry[]): string {
  return JSON.stringify(entries, null, 2)
}
