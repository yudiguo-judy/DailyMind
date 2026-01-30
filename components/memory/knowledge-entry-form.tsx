"use client"

import { FC, useState, useEffect } from "react"
import { KnowledgeEntry, KnowledgeType } from "@/types/knowledge-entry"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Lightbulb, Star, Sparkles, X, Plus } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog"

interface KnowledgeEntryFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry?: KnowledgeEntry | null
  existingTags?: string[]
  onSave: (data: {
    type: KnowledgeType
    content: string
    tags: string[]
  }) => Promise<void>
}

const TYPE_OPTIONS: {
  value: KnowledgeType
  label: string
  icon: typeof Lightbulb
  color: string
}[] = [
  {
    value: "lesson",
    label: "Lesson",
    icon: Lightbulb,
    color: "text-amber-500"
  },
  {
    value: "highlight",
    label: "Highlight",
    icon: Star,
    color: "text-blue-500"
  },
  {
    value: "inspiration",
    label: "Inspiration",
    icon: Sparkles,
    color: "text-purple-500"
  }
]

export const KnowledgeEntryForm: FC<KnowledgeEntryFormProps> = ({
  open,
  onOpenChange,
  entry,
  existingTags = [],
  onSave
}) => {
  const [type, setType] = useState<KnowledgeType>("lesson")
  const [content, setContent] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const isEditing = !!entry

  useEffect(() => {
    if (entry) {
      setType(entry.type)
      setContent(entry.content)
      setTags(entry.tags || [])
    } else {
      setType("lesson")
      setContent("")
      setTags([])
    }
    setTagInput("")
  }, [entry, open])

  const addTag = (tag: string) => {
    const normalized = tag.toLowerCase().trim().replace(/\s+/g, "-")
    if (normalized && !tags.includes(normalized) && tags.length < 10) {
      setTags([...tags, normalized])
    }
    setTagInput("")
    setShowSuggestions(false)
  }

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag))
  }

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      if (tagInput.trim()) {
        addTag(tagInput)
      }
    }
  }

  const filteredSuggestions = existingTags.filter(
    t => t.toLowerCase().includes(tagInput.toLowerCase()) && !tags.includes(t)
  )

  const handleSubmit = async () => {
    if (content.length < 5 || content.length > 500) return
    setIsSaving(true)
    try {
      await onSave({ type, content, tags })
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to save:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const contentValid = content.length >= 5 && content.length <= 500

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Knowledge Entry" : "Add Knowledge Entry"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Type Select */}
          <div>
            <label className="mb-2 block text-sm font-medium">Type</label>
            <div className="flex gap-2">
              {TYPE_OPTIONS.map(opt => {
                const Icon = opt.icon
                const isSelected = type === opt.value
                return (
                  <Button
                    key={opt.value}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => setType(opt.value)}
                    className="flex-1"
                  >
                    <Icon
                      className={`mr-1.5 size-3.5 ${isSelected ? "" : opt.color}`}
                    />
                    {opt.label}
                  </Button>
                )
              })}
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="mb-2 block text-sm font-medium">Content</label>
            <Textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="What did you learn, discover, or find inspiring?"
              rows={4}
              maxLength={500}
            />
            <div className="mt-1 flex justify-between">
              <span
                className={`text-xs ${content.length < 5 ? "text-destructive" : "text-muted-foreground"}`}
              >
                {content.length < 5 ? "Minimum 5 characters" : ""}
              </span>
              <span
                className={`text-xs ${content.length > 500 ? "text-destructive" : "text-muted-foreground"}`}
              >
                {content.length}/500
              </span>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              Tags ({tags.length}/10)
            </label>

            {tags.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1">
                {tags.map(tag => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="gap-1 text-xs"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="hover:text-destructive ml-0.5"
                    >
                      <X className="size-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            <div className="relative">
              <Input
                value={tagInput}
                onChange={e => {
                  setTagInput(e.target.value)
                  setShowSuggestions(e.target.value.length > 0)
                }}
                onKeyDown={handleTagKeyDown}
                onFocus={() => tagInput && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder={
                  tags.length >= 10 ? "Max tags reached" : "Add tag..."
                }
                disabled={tags.length >= 10}
              />
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="bg-popover border-border absolute z-10 mt-1 max-h-32 w-full overflow-auto rounded-md border shadow-md">
                  {filteredSuggestions.slice(0, 5).map(tag => (
                    <button
                      key={tag}
                      type="button"
                      className="hover:bg-accent w-full px-3 py-1.5 text-left text-sm"
                      onMouseDown={e => {
                        e.preventDefault()
                        addTag(tag)
                      }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!contentValid || isSaving}>
            {isSaving ? "Saving..." : isEditing ? "Save Changes" : "Add Entry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
