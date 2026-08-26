import type { CompareOverview } from "@/lib/compare"
import { Trophy, TrendingUp, Hash, Calendar, Medal } from "lucide-react"

interface HeadToHeadProps {
  userStats: CompareOverview
  rivalStats: CompareOverview
}

export function HeadToHead({ userStats, rivalStats }: HeadToHeadProps) {
  const getWinnerClass = (userVal: number, rivalVal: number, isUser: boolean) => {
    if (userVal === rivalVal) return ""
    if (isUser) {
      return userVal > rivalVal ? "text-emerald-500 font-bold" : "text-muted-foreground"
    } else {
      return rivalVal > userVal ? "text-emerald-500 font-bold" : "text-muted-foreground"
    }
  }

  // Lower is better for rank
  const getWinnerClassLow = (userVal: number | null, rivalVal: number | null, isUser: boolean) => {
    if (userVal === rivalVal) return ""
    if (userVal === null) return isUser ? "text-muted-foreground" : "text-emerald-500 font-bold"
    if (rivalVal === null) return isUser ? "text-emerald-500 font-bold" : "text-muted-foreground"
    if (isUser) {
      return userVal < rivalVal ? "text-emerald-500 font-bold" : "text-muted-foreground"
    } else {
      return rivalVal < userVal ? "text-emerald-500 font-bold" : "text-muted-foreground"
    }
  }

  const metrics = [
    {
      label: "Current Rating",
      icon: <TrendingUp className="h-4 w-4" />,
      userValue: userStats.current_rating || 0,
      rivalValue: rivalStats.current_rating || 0,
      userClass: getWinnerClass(
        userStats.current_rating || 0,
        rivalStats.current_rating || 0,
        true
      ),
      rivalClass: getWinnerClass(
        userStats.current_rating || 0,
        rivalStats.current_rating || 0,
        false
      ),
    },
    {
      label: "Peak Rating",
      icon: <Trophy className="h-4 w-4" />,
      userValue: userStats.peak_rating || 0,
      rivalValue: rivalStats.peak_rating || 0,
      userClass: getWinnerClass(userStats.peak_rating || 0, rivalStats.peak_rating || 0, true),
      rivalClass: getWinnerClass(userStats.peak_rating || 0, rivalStats.peak_rating || 0, false),
    },
    {
      label: "Problems Solved",
      icon: <Hash className="h-4 w-4" />,
      userValue: userStats.problems_solved,
      rivalValue: rivalStats.problems_solved,
      userClass: getWinnerClass(userStats.problems_solved, rivalStats.problems_solved, true),
      rivalClass: getWinnerClass(userStats.problems_solved, rivalStats.problems_solved, false),
    },
    {
      label: "Contests",
      icon: <Calendar className="h-4 w-4" />,
      userValue: userStats.contests_participated,
      rivalValue: rivalStats.contests_participated,
      userClass: getWinnerClass(
        userStats.contests_participated,
        rivalStats.contests_participated,
        true
      ),
      rivalClass: getWinnerClass(
        userStats.contests_participated,
        rivalStats.contests_participated,
        false
      ),
    },
    {
      label: "Best Rank",
      icon: <Medal className="h-4 w-4" />,
      userValue: userStats.best_rank,
      rivalValue: rivalStats.best_rank,
      userClass: getWinnerClassLow(userStats.best_rank, rivalStats.best_rank, true),
      rivalClass: getWinnerClassLow(userStats.best_rank, rivalStats.best_rank, false),
      format: (v: number | null) => (v ? `#${v}` : "N/A"),
    },
  ]

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="grid grid-cols-3 border-b border-border bg-muted/50 p-4 text-sm font-semibold">
        <div className="text-left text-muted-foreground">Metric</div>
        <div className="truncate px-2 text-center">{userStats.handle} (You)</div>
        <div className="truncate px-2 text-center">{rivalStats.handle}</div>
      </div>
      <div className="divide-y divide-border">
        {metrics.map((m, i) => (
          <div key={i} className="grid grid-cols-3 items-center p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <div className="text-muted-foreground">{m.icon}</div>
              {m.label}
            </div>
            <div className={`text-center text-lg ${m.userClass}`}>
              {m.format ? m.format(m.userValue) : m.userValue}
            </div>
            <div className={`text-center text-lg ${m.rivalClass}`}>
              {m.format ? m.format(m.rivalValue) : m.rivalValue}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
