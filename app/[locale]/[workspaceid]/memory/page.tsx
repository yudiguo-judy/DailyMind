"use client"

import { DailySummaryPanel } from "@/components/memory/daily-summary-panel"
import { KnowledgeLibrary } from "@/components/memory/knowledge-library"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

export default function MemoryPage() {
  return (
    <div className="flex h-full flex-col p-4 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Memory & Summaries</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Review your daily conversation summaries, knowledge, and insights
        </p>
      </div>

      <div className="flex-1 overflow-auto">
        <Tabs defaultValue="summaries">
          <TabsList className="mb-4">
            <TabsTrigger value="summaries">Summaries</TabsTrigger>
            <TabsTrigger value="knowledge">Knowledge Library</TabsTrigger>
          </TabsList>

          <TabsContent value="summaries">
            <DailySummaryPanel limit={30} showGenerateButton={true} />
          </TabsContent>

          <TabsContent value="knowledge">
            <KnowledgeLibrary />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
