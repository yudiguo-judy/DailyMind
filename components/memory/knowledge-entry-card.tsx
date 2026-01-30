"use client"

import { KnowledgeEntry } from "@/types/knowledge-entry"
import { FC, useState } from "react"
import { format } from "date-fns"
import { Lightbulb, Star, Sparkles, Pencil, Trash2, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"

interface KnowledgeEntryCardProps {
  entry: KnowledgeEntry
  onEdit: (entry: KnowledgeEntry) => void
  onDelete: (id: string) => void
  selectable?: boolean
  selected?: boolean
  onSelectChange?: (id: string, selected: boolean) => void
}

const TYPE_CONFIG = {
  lesson: {
    icon: Lightbulb,
    label: "Lesson",
    color: "text-amber-500"
  },
  highlight: {
    icon: Star,
    label: "Highlight",
    color: "text-blue-500"
  },
  inspiration: {
    icon: Sparkles,
    label: "Inspiration",
    color: "text-purple-500"
  }
}

export const KnowledgeEntryCard: FC<KnowledgeEntryCardProps> = ({
  entry,
  onEdit,
  onDelete,
  selectable = false,
  selected = false,
  onSelectChange
}) => {
  const [showActions, setShowActions] = useState(false)
  const config = TYPE_CONFIG[entry.type]
  const Icon = config.icon

  const handleCopy = () => {
    navigator.clipboard.writeText(entry.content)
    toast.success("Copied to clipboard")
  }

  const handleDelete = () => {
    if (confirm("Delete this knowledge entry?")) {
      onDelete(entry.id)
    }
  }

  return (
    <Card
      className={`group w-full transition-shadow hover:shadow-md ${selected ? "ring-primary ring-2" : ""}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {selectable && (
              <Checkbox
                checked={selected}
                onCheckedChange={checked =>
                  onSelectChange?.(entry.id, !!checked)
                }
              />
            )}
            <Icon className={`size-4 ${config.color}`} />
            <span className="text-muted-foreground text-xs font-medium uppercase">
              {config.label}
            </span>
          </div>
          <div
            className={`flex items-center gap-1 transition-opacity ${showActions ? "opacity-100" : "opacity-0"}`}
          >
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={handleCopy}
            >
              <Copy className="size-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => onEdit(entry)}
            >
              <Pencil className="size-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive size-7"
              onClick={handleDelete}
            >
              <Trash2 className="size-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm leading-relaxed">{entry.content}</p>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex flex-wrap gap-1">
            {entry.tags?.map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
          <span className="text-muted-foreground shrink-0 text-xs">
            {format(new Date(entry.created_at), "MMM d, yyyy")}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
