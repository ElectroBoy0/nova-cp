"use client"

import { useUserDashboard } from "@/lib/users"
import { useDailyMission } from "@/hooks/use-problems"
import { Flame, Target } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export function TopbarStreak({ userId }: { userId: string }) {
  const { data: analytics, isPending: isAnalyticsPending } = useUserDashboard(userId)
  const { data: dailyMission, isPending: isMissionPending } = useDailyMission(userId)

  if (isAnalyticsPending || isMissionPending) {
    return <Skeleton className="h-8 w-16" />
  }

  const streak = analytics?.current_streak_days || 0
  const isMissionCompleted = dailyMission?.is_completed

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border",
          streak > 0 
            ? "bg-orange-500/10 text-orange-500 border-orange-500/20 hover:bg-orange-500/20" 
            : "bg-surface-2 text-muted-foreground border-border hover:bg-surface-2/80"
        )}>
          <Flame className={cn("w-4 h-4", streak > 0 && "fill-orange-500")} />
          {streak}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4" align="end">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className={cn(
              "p-2 rounded-full",
              streak > 0 ? "bg-orange-500/20 text-orange-500" : "bg-muted text-muted-foreground"
            )}>
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold">{streak} Day Streak</h4>
              <p className="text-xs text-muted-foreground">
                {streak > 0 ? "Solve a problem every day to keep it going!" : "Solve a problem today to start your streak!"}
              </p>
            </div>
          </div>
          
          <div className="h-px bg-border w-full" />
          
          <div className="flex items-start gap-3">
            <div className={cn(
              "p-2 rounded-full",
              isMissionCompleted ? "bg-emerald-500/20 text-emerald-500" : "bg-muted text-muted-foreground"
            )}>
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold">Daily Target</h4>
              <p className="text-xs text-muted-foreground">
                {isMissionCompleted ? "Mission completed for today! Awesome job." : "Check your recommendations for today's mission!"}
              </p>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
