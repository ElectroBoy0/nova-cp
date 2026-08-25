"use client"

import { useState } from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RecommendationCard } from "@/components/problems/recommendation-card"
import { useRecommendations, useRecommendationFeedback, useDailyMission } from "@/hooks/use-problems"

import { Skeleton } from "@/components/ui/skeleton"
import { BrainCircuit, AlertCircle } from "lucide-react"

export function RecommendationsClient({ userId }: { userId: string }) {
  const { data: recommendations, isPending: isRecsPending, error: recsError } = useRecommendations(userId)
  const { data: dailyMission, isPending: isDailyMissionPending } = useDailyMission(userId)
  const { mutate: submitFeedback } = useRecommendationFeedback()

  const [activeTab, setActiveTab] = useState("all")

  const handleSolve = (problemId: string, recommendationType: string) => {
    if (userId) {
      submitFeedback({
        userId: userId,
        feedback: { problem_id: problemId, recommendation_type: recommendationType, event_type: "started" }
      })
    }
  }

  const handleSkip = (problemId: string, recommendationType: string) => {
    if (userId) {
      submitFeedback({
        userId: userId,
        feedback: { problem_id: problemId, recommendation_type: recommendationType, event_type: "skipped" }
      })
    }
  }
  
  const handleMarkSolved = (problemId: string, recommendationType: string) => {
    if (userId) {
      submitFeedback({
        userId: userId,
        feedback: { problem_id: problemId, recommendation_type: recommendationType, event_type: "solved_externally" }
      })
    }
  }

  if (isRecsPending || isDailyMissionPending) {
    return (
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-72 rounded-xl" />)}
      </div>
    )
  }

  if (recsError || !recommendations) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
        <AlertCircle className="w-10 h-10 mb-4 opacity-50" />
        <p>Failed to load recommendations. Please try again later.</p>
      </div>
    )
  }

  let allRecs = [...recommendations]
  if (dailyMission) {
    allRecs = [dailyMission, ...allRecs]
  }

  if (allRecs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground bg-muted/10 rounded-xl border border-dashed">
        <BrainCircuit className="w-12 h-12 mb-4 opacity-50" />
        <h3 className="text-lg font-medium text-foreground mb-1">No Recommendations Available</h3>
        <p className="max-w-md">Train the AI by connecting your Codeforces handle and solving more problems to unlock personalized recommendations.</p>
      </div>
    )
  }

  const filteredRecs = activeTab === "all" 
    ? allRecs 
    : allRecs.filter(r => r.explanation.bucket === activeTab || r.explanation.recommendation_type === activeTab)

  return (
    <div className="space-y-6">
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 flex-wrap h-auto p-1 bg-surface-1/50 border border-border/40 rounded-xl">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="todays_mission">Today's Mission</TabsTrigger>
          <TabsTrigger value="continue">Unfinished</TabsTrigger>
          <TabsTrigger value="skill_builder">Skill Builder</TabsTrigger>
          <TabsTrigger value="stretch">Stretch</TabsTrigger>
          <TabsTrigger value="speed_review">Speed & Review</TabsTrigger>
        </TabsList>
        
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 items-stretch">
          {filteredRecs.map((rec, idx) => (
            <div key={`${rec.explanation?.recommendation_type || 'rec'}-${rec.problem?.id || idx}-${idx}`} className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both" style={{ animationDelay: `${(idx % 6) * 50}ms` }}>
              <RecommendationCard 
                rec={rec} 
                userId={userId}
                onSolve={handleSolve}
                onSkip={handleSkip}
                onMarkSolved={handleMarkSolved}
              />
            </div>
          ))}
          {filteredRecs.length === 0 && (
             <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground">
               <p>No recommendations found in this category.</p>
             </div>
          )}
        </div>
      </Tabs>
    </div>
  )
}
