"use client"

import { FC, useState, useEffect, useContext } from "react"
import { ChatbotUIContext } from "@/context/context"
import { getDailySummariesByWorkspace } from "@/db/daily-summaries"
import { DailySummary } from "@/types"
import { SummaryCard } from "./summary-card"
import { Button } from "@/components/ui/button"
import { Loader2, Sparkles, RefreshCw } from "lucide-react"
import { toast } from "sonner"

interface DailySummaryPanelProps {
  limit?: number
  showGenerateButton?: boolean
}

export const DailySummaryPanel: FC<DailySummaryPanelProps> = ({
  limit = 7,
  showGenerateButton = true
}) => {
  const { profile, selectedWorkspace } = useContext(ChatbotUIContext)
  const [summaries, setSummaries] = useState<DailySummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)

  const loadSummaries = async () => {
    if (!profile || !selectedWorkspace) return

    try {
      setIsLoading(true)
      const data = await getDailySummariesByWorkspace(
        profile.user_id,
        selectedWorkspace.id,
        { limit }
      )
      setSummaries(data)
    } catch (error: any) {
      console.error("Failed to load summaries:", error)
      toast.error("Failed to load summaries")
    } finally {
      setIsLoading(false)
    }
  }

  const generateTodaySummary = async () => {
    if (!profile || !selectedWorkspace) return

    try {
      setIsGenerating(true)
      const today = new Date().toISOString().split("T")[0]

      const response = await fetch("/api/summary/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: today,
          workspace_id: selectedWorkspace.id,
          force: false
        })
      })

      const result = await response.json()

      if (response.ok) {
        toast.success(result.message || "Summary generated!")
        loadSummaries() // Reload summaries
      } else {
        toast.error(result.error || "Failed to generate summary")
      }
    } catch (error: any) {
      console.error("Error generating summary:", error)
      toast.error("Failed to generate summary")
    } finally {
      setIsGenerating(false)
    }
  }

  useEffect(() => {
    loadSummaries()
  }, [profile, selectedWorkspace])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="text-primary size-5" />
          <h2 className="text-lg font-semibold">Daily Summaries</h2>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadSummaries}
            disabled={isLoading}
          >
            <RefreshCw className="size-3" />
          </Button>
          {showGenerateButton && (
            <Button
              variant="default"
              size="sm"
              onClick={generateTodaySummary}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 size-3 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 size-3" />
                  Generate Today
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {summaries.length === 0 ? (
        <div className="text-muted-foreground p-8 text-center">
          <Sparkles className="mx-auto mb-4 size-12 opacity-50" />
          <p className="text-sm">No summaries yet</p>
          {showGenerateButton && (
            <p className="mt-2 text-xs">
              Click &quot;Generate Today&quot; to create your first summary
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {summaries.map(summary => (
            <SummaryCard key={summary.id} summary={summary} />
          ))}
        </div>
      )}

      {summaries.length > 0 && summaries.length >= limit && (
        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              // TODO: Implement load more or navigate to full summary page
              toast.info("Load more feature coming soon!")
            }}
          >
            Load More
          </Button>
        </div>
      )}
    </div>
  )
}
