"use client"

import { FC, useState, useEffect, useContext, useCallback } from "react"
import { ChatbotUIContext } from "@/context/context"
import {
  KnowledgeEntry,
  KnowledgeType,
  KnowledgeStats
} from "@/types/knowledge-entry"
import { KnowledgeEntryCard } from "./knowledge-entry-card"
import { KnowledgeEntryForm } from "./knowledge-entry-form"
import { KnowledgeFilters } from "./knowledge-filters"
import { KnowledgeStats as KnowledgeStatsBar } from "./knowledge-stats"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {
  Loader2,
  Plus,
  BookOpen,
  Lightbulb,
  Star,
  Sparkles,
  Download,
  Trash2,
  CheckSquare,
  X
} from "lucide-react"
import { toast } from "sonner"

const PAGE_SIZE = 20

export const KnowledgeLibrary: FC = () => {
  const { profile, selectedWorkspace } = useContext(ChatbotUIContext)
  const [entries, setEntries] = useState<KnowledgeEntry[]>([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState<KnowledgeStats | null>(null)
  const [allTags, setAllTags] = useState<Array<{ tag: string; count: number }>>(
    []
  )
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string>("all")
  const [query, setQuery] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [offset, setOffset] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null)

  // Batch selection state
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const fetchEntries = useCallback(
    async (reset = false) => {
      if (!profile || !selectedWorkspace) return

      try {
        setIsLoading(true)
        const currentOffset = reset ? 0 : offset

        const params = new URLSearchParams({
          workspace_id: selectedWorkspace.id,
          type: activeTab,
          limit: String(PAGE_SIZE),
          offset: String(currentOffset),
          sort: sortOrder
        })

        if (query.trim()) {
          params.set("query", query)
        }
        if (selectedTags.length > 0) {
          params.set("tags", selectedTags.join(","))
        }

        const response = await fetch(`/api/knowledge?${params}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error)
        }

        if (reset || currentOffset === 0) {
          setEntries(data.entries)
        } else {
          setEntries(prev => [...prev, ...data.entries])
        }
        setTotal(data.total)
        setAllTags(data.allTags || [])
        if (data.stats) {
          setStats(data.stats)
        }

        if (reset) {
          setOffset(0)
        }
      } catch (error: any) {
        console.error("Failed to fetch knowledge entries:", error)
        toast.error("Failed to load knowledge entries")
      } finally {
        setIsLoading(false)
      }
    },
    [
      profile,
      selectedWorkspace,
      activeTab,
      query,
      selectedTags,
      sortOrder,
      offset
    ]
  )

  useEffect(() => {
    setOffset(0)
    fetchEntries(true)
  }, [profile, selectedWorkspace, activeTab, query, selectedTags, sortOrder])

  useEffect(() => {
    if (offset > 0) {
      fetchEntries(false)
    }
  }, [offset])

  const handleLoadMore = () => {
    setOffset(prev => prev + PAGE_SIZE)
  }

  const handleSave = async (data: {
    type: KnowledgeType
    content: string
    tags: string[]
  }) => {
    if (!selectedWorkspace) return

    if (editingEntry) {
      const response = await fetch(`/api/knowledge/${editingEntry.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error)
      }

      toast.success("Entry updated")
    } else {
      const response = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: selectedWorkspace.id,
          ...data
        })
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error)
      }

      toast.success("Entry added")
    }

    setEditingEntry(null)
    fetchEntries(true)
  }

  const handleEdit = (entry: KnowledgeEntry) => {
    setEditingEntry(entry)
    setFormOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/knowledge/${id}`, {
        method: "DELETE"
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error)
      }

      toast.success("Entry deleted")
      fetchEntries(true)
    } catch (error: any) {
      toast.error("Failed to delete entry")
    }
  }

  // Batch operations
  const toggleSelectMode = () => {
    setSelectMode(!selectMode)
    setSelectedIds(new Set())
  }

  const handleSelectChange = (id: string, selected: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (selected) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }

  const selectAll = () => {
    setSelectedIds(new Set(entries.map(e => e.id)))
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Delete ${selectedIds.size} selected entries?`)) return

    try {
      const response = await fetch("/api/knowledge", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error)
      }

      toast.success(`Deleted ${selectedIds.size} entries`)
      setSelectedIds(new Set())
      setSelectMode(false)
      fetchEntries(true)
    } catch (error: any) {
      toast.error("Failed to delete entries")
    }
  }

  const handleExport = async (format: "json" | "markdown") => {
    if (!selectedWorkspace) return

    try {
      const response = await fetch(
        `/api/knowledge/export?workspace_id=${selectedWorkspace.id}&format=${format}`
      )

      if (!response.ok) {
        throw new Error("Export failed")
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download =
        format === "markdown"
          ? "knowledge-library.md"
          : "knowledge-library.json"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success(`Exported as ${format.toUpperCase()}`)
    } catch (error) {
      toast.error("Failed to export")
    }
  }

  const hasMore = entries.length < total

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="text-primary size-5" />
          <h2 className="text-lg font-semibold">Knowledge Library</h2>
        </div>
        <div className="flex gap-2">
          <Button
            variant={selectMode ? "default" : "outline"}
            size="sm"
            onClick={toggleSelectMode}
            title={selectMode ? "Exit select mode" : "Select entries"}
          >
            {selectMode ? (
              <>
                <X className="mr-1.5 size-3" />
                Cancel
              </>
            ) : (
              <CheckSquare className="size-3" />
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="mr-1.5 size-3" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExport("markdown")}>
                Export as Markdown
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("json")}>
                Export as JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size="sm"
            onClick={() => {
              setEditingEntry(null)
              setFormOpen(true)
            }}
          >
            <Plus className="mr-1.5 size-3" />
            Add Entry
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <KnowledgeStatsBar
          total={stats.total_count}
          lessonCount={stats.lesson_count}
          highlightCount={stats.highlight_count}
          inspirationCount={stats.inspiration_count}
          uniqueTagsCount={stats.unique_tags_count}
        />
      )}

      {/* Batch actions bar */}
      {selectMode && (
        <div className="bg-muted/50 flex items-center gap-2 rounded-lg border p-2">
          <span className="text-muted-foreground text-sm">
            {selectedIds.size} selected
          </span>
          <Button variant="outline" size="sm" onClick={selectAll}>
            Select All
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
            disabled={selectedIds.size === 0}
          >
            <Trash2 className="mr-1.5 size-3" />
            Delete Selected
          </Button>
        </div>
      )}

      {/* Filters */}
      <KnowledgeFilters
        query={query}
        onQueryChange={setQuery}
        selectedTags={selectedTags}
        onTagsChange={setSelectedTags}
        allTags={allTags}
        sortOrder={sortOrder}
        onSortChange={setSortOrder}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All ({total})</TabsTrigger>
          <TabsTrigger value="lesson">
            <Lightbulb className="mr-1 size-3" />
            Lessons
          </TabsTrigger>
          <TabsTrigger value="highlight">
            <Star className="mr-1 size-3" />
            Highlights
          </TabsTrigger>
          <TabsTrigger value="inspiration">
            <Sparkles className="mr-1 size-3" />
            Inspirations
          </TabsTrigger>
        </TabsList>

        {/* Content area */}
        <div className="mt-4">
          {isLoading && entries.length === 0 ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="text-muted-foreground size-6 animate-spin" />
            </div>
          ) : entries.length === 0 ? (
            <EmptyState type={activeTab} />
          ) : (
            <div className="space-y-3">
              {entries.map(entry => (
                <KnowledgeEntryCard
                  key={entry.id}
                  entry={entry}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  selectable={selectMode}
                  selected={selectedIds.has(entry.id)}
                  onSelectChange={handleSelectChange}
                />
              ))}

              {hasMore && (
                <div className="pt-2 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLoadMore}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="mr-2 size-3 animate-spin" />
                    ) : null}
                    Load More
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </Tabs>

      {/* Add/Edit Form */}
      <KnowledgeEntryForm
        open={formOpen}
        onOpenChange={open => {
          setFormOpen(open)
          if (!open) setEditingEntry(null)
        }}
        entry={editingEntry}
        existingTags={allTags.map(t => t.tag)}
        onSave={handleSave}
      />
    </div>
  )
}

function EmptyState({ type }: { type: string }) {
  const config: Record<
    string,
    { icon: typeof BookOpen; message: string; sub: string }
  > = {
    all: {
      icon: BookOpen,
      message: "No knowledge entries yet",
      sub: 'Start adding lessons, highlights, and inspirations using the "Add Entry" button.'
    },
    lesson: {
      icon: Lightbulb,
      message: "No lessons recorded",
      sub: "Lessons capture practical learnings and best practices from your conversations."
    },
    highlight: {
      icon: Star,
      message: "No highlights saved",
      sub: "Highlights mark key facts, decisions, and significant moments worth remembering."
    },
    inspiration: {
      icon: Sparkles,
      message: "No inspirations collected",
      sub: "Inspirations capture creative ideas and thought-provoking insights."
    }
  }

  const { icon: Icon, message, sub } = config[type] || config.all

  return (
    <div className="text-muted-foreground p-8 text-center">
      <Icon className="mx-auto mb-4 size-12 opacity-50" />
      <p className="text-sm font-medium">{message}</p>
      <p className="mt-2 text-xs">{sub}</p>
    </div>
  )
}
