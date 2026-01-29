import { DailySummaryPanel } from "@/components/memory/daily-summary-panel"

export default function MemoryPage() {
  return (
    <div className="flex h-full flex-col p-4 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Memory & Summaries</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Review your daily conversation summaries and insights
        </p>
      </div>

      <div className="flex-1 overflow-auto">
        <DailySummaryPanel limit={30} showGenerateButton={true} />
      </div>
    </div>
  )
}
