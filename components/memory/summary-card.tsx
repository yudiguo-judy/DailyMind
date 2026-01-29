"use client"

import { DailySummary } from "@/types"
import { FC, useState } from "react"
import { format } from "date-fns"
import {
  Calendar,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Sparkles
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

interface SummaryCardProps {
  summary: DailySummary
  onViewMessages?: () => void
}

export const SummaryCard: FC<SummaryCardProps> = ({
  summary,
  onViewMessages
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const formattedDate = format(new Date(summary.date), "MMMM d, yyyy")
  const dayOfWeek = format(new Date(summary.date), "EEEE")

  return (
    <Card className="w-full transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="mb-1 flex items-center gap-2">
              <Calendar className="text-muted-foreground size-4" />
              <h3 className="text-sm font-semibold">{formattedDate}</h3>
              <span className="text-muted-foreground text-xs">
                ({dayOfWeek})
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <MessageSquare className="text-muted-foreground size-3" />
              <span className="text-muted-foreground text-xs">
                {summary.message_count || 0} messages
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </Button>
        </div>

        {summary.key_topics && summary.key_topics.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {summary.key_topics.map((topic, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {topic}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{summary.summary}</ReactMarkdown>
          </div>

          {onViewMessages && (
            <div className="mt-4 border-t pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={onViewMessages}
                className="w-full"
              >
                <MessageSquare className="mr-2 size-3" />
                View Full Conversation
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
