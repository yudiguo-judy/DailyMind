"use client"

import { FC } from "react"
import { Lightbulb, Star, Sparkles, Tag, BookOpen } from "lucide-react"

interface KnowledgeStatsProps {
  total: number
  lessonCount: number
  highlightCount: number
  inspirationCount: number
  uniqueTagsCount: number
}

export const KnowledgeStats: FC<KnowledgeStatsProps> = ({
  total,
  lessonCount,
  highlightCount,
  inspirationCount,
  uniqueTagsCount
}) => {
  if (total === 0) return null

  const stats = [
    {
      icon: BookOpen,
      label: "Total",
      value: total,
      color: "text-foreground"
    },
    {
      icon: Lightbulb,
      label: "Lessons",
      value: lessonCount,
      color: "text-amber-500"
    },
    {
      icon: Star,
      label: "Highlights",
      value: highlightCount,
      color: "text-blue-500"
    },
    {
      icon: Sparkles,
      label: "Inspirations",
      value: inspirationCount,
      color: "text-purple-500"
    },
    {
      icon: Tag,
      label: "Tags",
      value: uniqueTagsCount,
      color: "text-green-500"
    }
  ]

  return (
    <div className="flex flex-wrap gap-4 rounded-lg border p-3">
      {stats.map(stat => {
        const Icon = stat.icon
        return (
          <div key={stat.label} className="flex items-center gap-1.5">
            <Icon className={`size-3.5 ${stat.color}`} />
            <span className="text-muted-foreground text-xs">{stat.label}</span>
            <span className="text-sm font-semibold">{stat.value}</span>
          </div>
        )
      })}
    </div>
  )
}
