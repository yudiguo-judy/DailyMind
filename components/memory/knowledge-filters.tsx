"use client"

import { FC, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, SortAsc, SortDesc, X, Filter } from "lucide-react"

interface KnowledgeFiltersProps {
  query: string
  onQueryChange: (query: string) => void
  selectedTags: string[]
  onTagsChange: (tags: string[]) => void
  allTags: Array<{ tag: string; count: number }>
  sortOrder: "asc" | "desc"
  onSortChange: (order: "asc" | "desc") => void
}

export const KnowledgeFilters: FC<KnowledgeFiltersProps> = ({
  query,
  onQueryChange,
  selectedTags,
  onTagsChange,
  allTags,
  sortOrder,
  onSortChange
}) => {
  const [showTagFilter, setShowTagFilter] = useState(false)

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter(t => t !== tag))
    } else {
      onTagsChange([...selectedTags, tag])
    }
  }

  const clearFilters = () => {
    onQueryChange("")
    onTagsChange([])
  }

  const hasFilters = query.trim() !== "" || selectedTags.length > 0

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute left-2.5 top-2.5 size-4" />
          <Input
            value={query}
            onChange={e => onQueryChange(e.target.value)}
            placeholder="Search knowledge..."
            className="pl-9"
          />
        </div>

        <Button
          variant={showTagFilter ? "default" : "outline"}
          size="icon"
          onClick={() => setShowTagFilter(!showTagFilter)}
          className="shrink-0"
        >
          <Filter className="size-4" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={() => onSortChange(sortOrder === "desc" ? "asc" : "desc")}
          className="shrink-0"
          title={sortOrder === "desc" ? "Newest first" : "Oldest first"}
        >
          {sortOrder === "desc" ? (
            <SortDesc className="size-4" />
          ) : (
            <SortAsc className="size-4" />
          )}
        </Button>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="shrink-0"
          >
            <X className="mr-1 size-3" />
            Clear
          </Button>
        )}
      </div>

      {showTagFilter && allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 rounded-md border p-3">
          {allTags.map(({ tag, count }) => (
            <Badge
              key={tag}
              variant={selectedTags.includes(tag) ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => toggleTag(tag)}
            >
              {tag} ({count})
            </Badge>
          ))}
        </div>
      )}

      {selectedTags.length > 0 && !showTagFilter && (
        <div className="flex flex-wrap gap-1">
          {selectedTags.map(tag => (
            <Badge key={tag} variant="default" className="gap-1 text-xs">
              {tag}
              <button onClick={() => toggleTag(tag)}>
                <X className="size-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
