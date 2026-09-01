"use client"

import { BrainCircuit } from "lucide-react"
import type { ProblemRecommendation } from "@/types/problems"
import { useRecommendationFeedback } from "@/hooks/use-problems"
import { Skeleton } from "@/components/ui/skeleton"
import { RecommendationCard } from "./recommendation-card"

export function RecommendationWidget({
  userId,
  recommendations,
  isLoading,
}: {
  userId: string
  recommendations?: ProblemRecommendation[]
  isLoading: boolean
}) {
  const { mutate: submitFeedback } = useRecommendationFeedback()

  const handleSolve = (problemId: string, recommendationType: string) => {
    if (userId) {
      submitFeedback({
        userId: userId,
        feedback: {
          problem_id: problemId,
          recommendation_type: recommendationType,
          event_type: "started",
        },
      })
    }
  }

  const handleSkip = (problemId: string, recommendationType: string) => {
    if (userId) {
      submitFeedback({
        userId: userId,
        feedback: {
          problem_id: problemId,
          recommendation_type: recommendationType,
          event_type: "skipped",
        },
      })
      // Ideally, trigger a refetch of recommendations here or optimistically remove the item
    }
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-44 rounded-xl" />
        ))}
      </div>
    )
  }

  const displayRecs = (recommendations || []).slice(0, 4)

  if (displayRecs.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center space-y-4 rounded-xl border border-dashed border-border bg-surface-1/30">
        <BrainCircuit className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          Train the AI to get personalized recommendations.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
      {displayRecs.map((rec, idx) => (
        <RecommendationCard
          key={`${rec.explanation?.recommendation_type || "rec"}-${rec.problem?.id || idx}-${idx}`}
          rec={rec}
          userId={userId}
          onSolve={handleSolve}
          onSkip={handleSkip}
        />
      ))}
    </div>
  )
}
