"use client"

import { useState } from "react"
import { useHint, useHintFeedback } from "@/hooks/use-problems"
import { Button } from "@/components/ui/button"
import { Lightbulb, ChevronRight, CheckCircle2, ThumbsUp, ThumbsDown, Loader2 } from "lucide-react"

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
      submitFeedback({ problemId, feedback: { user_id: userId, hint_level: 1, event_type: "requested" } })
    }
  }

  const handleNextHint = () => {
    if (currentLevel < 4) {
      const nextLevel = currentLevel + 1
      setCurrentLevel(nextLevel)
      submitFeedback({ problemId, feedback: { user_id: userId, hint_level: nextLevel, event_type: "requested" } })
    }
  }

  const handleFeedback = (type: "helpful" | "not_helpful") => {
    if (feedbackGiven[currentLevel]) return
    submitFeedback({ problemId, feedback: { user_id: userId, hint_level: currentLevel, event_type: type } })
    setFeedbackGiven(prev => ({ ...prev, [currentLevel]: true }))
  }

  const handleSolved = () => {
    submitFeedback({ problemId, feedback: { user_id: userId, hint_level: currentLevel, event_type: "solved_after_hint" } })
    window.open(problemUrl, "_blank")
  }

  if (!isOpen) {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        className="w-full text-amber-500 hover:text-amber-600 hover:bg-amber-500/10 border-amber-500/30"
        onClick={handleOpen}
      >
        <Lightbulb className="w-4 h-4 mr-2" />
        Need a Hint?
      </Button>
    )
  }

  return (
    <div className="w-full mt-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 animate-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-amber-600 dark:text-amber-500 flex items-center">
          <Lightbulb className="w-4 h-4 mr-1.5" />
          Hint {currentLevel} of 4
        </h4>
      </div>

      <div className="text-sm text-foreground/90 min-h-[60px]">
        {isLoading ? (
          <div className="flex items-center justify-center h-full opacity-50 py-4">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            <span className="text-xs">Generating hint...</span>
          </div>
        ) : isError ? (
          <p className="text-destructive/80 text-xs py-4 text-center">Failed to load hint. Please try again.</p>
        ) : (
          <p className="leading-relaxed">{hint?.content}</p>
        )}
      </div>

      {!isLoading && !isError && (
        <div className="mt-4 pt-4 border-t border-amber-500/20 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Was this helpful?</span>
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className={`h-7 w-7 rounded-full ${feedbackGiven[currentLevel] ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-500/20 hover:text-green-600'}`}
                onClick={() => handleFeedback("helpful")}
                disabled={feedbackGiven[currentLevel]}
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className={`h-7 w-7 rounded-full ${feedbackGiven[currentLevel] ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-500/20 hover:text-red-600'}`}
                onClick={() => handleFeedback("not_helpful")}
                disabled={feedbackGiven[currentLevel]}
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="default" 
              size="sm" 
              className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white"
              onClick={handleSolved}
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              I Solved It!
            </Button>
            
            {currentLevel < 4 ? (
              <Button 
                variant="secondary" 
                size="sm" 
                className="text-xs"
                onClick={handleNextHint}
              >
                Next Hint
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            ) : (
              <Button 
                variant="secondary" 
                size="sm" 
                className="text-xs"
                onClick={() => window.open(`https://codeforces.com/contest/${hint?.content ? problemId : problemId}/editorial`, "_blank")}
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
