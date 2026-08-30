"use client"

import { useState } from "react"
import { useHint, useHintFeedback } from "@/hooks/use-problems"
import { Button } from "@/components/ui/button"
import { Lightbulb, ChevronRight, CheckCircle2, ThumbsUp, ThumbsDown, Loader2 } from "lucide-react"
import { MathText } from "@/components/ui/math-text"

interface HintDrawerProps {
  problemId: string
  userId: string
  problemUrl: string
}

export function HintDrawer({ problemId, userId, problemUrl }: HintDrawerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentLevel, setCurrentLevel] = useState(1)

  const { data: hint, isLoading, isError } = useHint(problemId, currentLevel, isOpen)
  const { mutate: submitFeedback } = useHintFeedback()

  const [feedbackGiven, setFeedbackGiven] = useState<Record<number, boolean>>({})

  const handleOpen = () => {
    setIsOpen(true)
    if (currentLevel === 1 && !isOpen) {
      submitFeedback({
        problemId,
        feedback: { user_id: userId, hint_level: 1, event_type: "requested" },
      })
    }
  }

  const handleNextHint = () => {
    if (currentLevel < 4) {
      const nextLevel = currentLevel + 1
      setCurrentLevel(nextLevel)
      submitFeedback({
        problemId,
        feedback: { user_id: userId, hint_level: nextLevel, event_type: "requested" },
      })
    }
  }

  const handleFeedback = (type: "helpful" | "not_helpful") => {
    if (feedbackGiven[currentLevel]) return
    submitFeedback({
      problemId,
      feedback: { user_id: userId, hint_level: currentLevel, event_type: type },
    })
    setFeedbackGiven((prev) => ({ ...prev, [currentLevel]: true }))
  }

  const handleSolved = () => {
    submitFeedback({
      problemId,
      feedback: { user_id: userId, hint_level: currentLevel, event_type: "solved_after_hint" },
    })
    window.open(problemUrl, "_blank")
  }

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="w-full border-amber-500/30 text-amber-500 hover:bg-amber-500/10 hover:text-amber-600"
        onClick={handleOpen}
      >
        <Lightbulb className="mr-2 h-4 w-4" />
        Need a Hint?
      </Button>
    )
  }

  return (
    <div className="mt-3 w-full rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 duration-300 animate-in slide-in-from-top-2">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="flex items-center text-sm font-semibold text-amber-600 dark:text-amber-500">
          <Lightbulb className="mr-1.5 h-4 w-4" />
          Hint {currentLevel} of 4
        </h4>
      </div>

      <div className="min-h-[60px] text-sm text-foreground/90">
        {isLoading ? (
          <div className="flex h-full items-center justify-center py-4 opacity-50">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            <span className="text-xs">Generating hint...</span>
          </div>
        ) : isError ? (
          <p className="py-4 text-center text-xs text-destructive/80">
            Failed to load hint. Please try again.
          </p>
        ) : (
          <MathText content={hint?.content} className="text-sm leading-relaxed" />
        )}
      </div>

      {!isLoading && !isError && (
        <div className="mt-4 space-y-3 border-t border-amber-500/20 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Was this helpful?
            </span>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className={`h-7 w-7 rounded-full ${feedbackGiven[currentLevel] ? "cursor-not-allowed opacity-50" : "hover:bg-green-500/20 hover:text-green-600"}`}
                onClick={() => handleFeedback("helpful")}
                disabled={feedbackGiven[currentLevel]}
              >
                <ThumbsUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`h-7 w-7 rounded-full ${feedbackGiven[currentLevel] ? "cursor-not-allowed opacity-50" : "hover:bg-red-500/20 hover:text-red-600"}`}
                onClick={() => handleFeedback("not_helpful")}
                disabled={feedbackGiven[currentLevel]}
              >
                <ThumbsDown className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="default"
              size="sm"
              className="bg-emerald-500 text-xs text-white hover:bg-emerald-600"
              onClick={handleSolved}
            >
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />I Solved It!
            </Button>

            {currentLevel < 4 ? (
              <Button variant="secondary" size="sm" className="text-xs" onClick={handleNextHint}>
                Next Hint
                <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                className="text-xs"
                onClick={() =>
                  window.open(
                    `https://codeforces.com/contest/${hint?.content ? problemId : problemId}/editorial`,
                    "_blank"
                  )
                }
              >
                View Editorial
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
