"use client"

import { useState, useMemo } from "react"
import { useUserActivity } from "@/hooks/use-activity"
import { Skeleton } from "@/components/ui/skeleton"
import { Flame, Trophy, Calendar, Target, ExternalLink } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface ActivityHeatmapProps {
  userId: string
}

export function ActivityHeatmap({ userId }: ActivityHeatmapProps) {
  const { data, isLoading, error } = useUserActivity(userId)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const calendarColumns = useMemo(() => {
    const columns: Date[][] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const startDay = new Date(today)
    startDay.setDate(today.getDate() - 364)

    const startDayOfWeek = startDay.getDay()
    startDay.setDate(startDay.getDate() - startDayOfWeek)

    const currentDate = new Date(startDay)
    let currentColumn: Date[] = []

    while (currentDate <= today || currentDate.getDay() !== 0) {
      currentColumn.push(new Date(currentDate))
      if (currentColumn.length === 7) {
        columns.push(currentColumn)
        currentColumn = []
      }
      currentDate.setDate(currentDate.getDate() + 1)
    }

    if (currentColumn.length > 0) {
      while (currentColumn.length < 7) {
        currentColumn.push(new Date(currentDate))
        currentDate.setDate(currentDate.getDate() + 1)
      }
      columns.push(currentColumn)
    }

    return columns
  }, [])

  const monthLabels = useMemo(() => {
    const labels: { month: string; offset: number }[] = []
    let lastMonth = -1

    calendarColumns.forEach((col, i) => {
      const midWeek = col[0]
      if (midWeek && midWeek.getMonth() !== lastMonth) {
        labels.push({ month: midWeek.toLocaleString("default", { month: "short" }), offset: i })
        lastMonth = midWeek.getMonth()
      }
    })

    return labels
  }, [calendarColumns])

  if (isLoading) {
    return (
      <div className="animate-pulse rounded-2xl border border-border bg-card p-6">
        <Skeleton className="mb-6 h-6 w-48" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    )
  }

  if (error || !data) {
    return null
  }

  const selectedDayActivity = selectedDate ? data.days[selectedDate] : null
  const todayStr = new Date().toISOString().split("T")[0]

  return (
    <TooltipProvider delayDuration={0}>
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              Practice Activity
              <span className="rounded-full border border-border/50 bg-surface-1 px-2 py-0.5 text-xs font-normal text-muted-foreground">
                12 Months
              </span>
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Your problem-solving timeline scaled by difficulty.
            </p>
          </div>

          {/* Summary Stats - Secondary visual weight */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <Flame className="h-3 w-3 text-orange-500" /> Streak
              </span>
              <span className="font-semibold">{data.summary.current_streak}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <Trophy className="h-3 w-3 text-yellow-500" /> Max
              </span>
              <span className="font-semibold">{data.summary.longest_streak}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <Target className="h-3 w-3 text-emerald-500" /> Solved
              </span>
              <span className="font-semibold">{data.summary.total_solved}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <Calendar className="h-3 w-3 text-blue-500" /> Active
              </span>
              <span className="font-semibold">{data.summary.active_days}</span>
            </div>
          </div>
        </div>

        {/* Heatmap Grid Wrapper */}
        <div className="custom-scrollbar -mx-2 overflow-x-auto px-2 pb-4 pt-2">
          <div className="inline-block min-w-max">
            {/* Month Labels */}
            <div
              className="relative mb-2 flex h-4 text-[10px] font-medium tracking-wide text-muted-foreground/80"
              style={{ marginLeft: "32px" }}
            >
              {monthLabels.map((l, idx) => (
                <div key={idx} className="absolute" style={{ left: `${l.offset * 18}px` }}>
                  {l.month}
                </div>
              ))}
            </div>

            <div className="flex items-start gap-1">
              {/* Day Labels */}
              <div className="flex w-8 flex-col gap-1 pr-3 pt-[1px] text-right text-[10px] font-medium text-muted-foreground/60">
                <span className="flex h-3.5 items-center justify-end opacity-0">Sun</span>
                <span className="flex h-3.5 items-center justify-end">Mon</span>
                <span className="flex h-3.5 items-center justify-end opacity-0">Tue</span>
                <span className="flex h-3.5 items-center justify-end">Wed</span>
                <span className="flex h-3.5 items-center justify-end opacity-0">Thu</span>
                <span className="flex h-3.5 items-center justify-end">Fri</span>
                <span className="flex h-3.5 items-center justify-end opacity-0">Sat</span>
              </div>

              {/* Grid Columns */}
              {calendarColumns.map((col, colIndex) => (
                <div key={colIndex} className="flex flex-col gap-1">
                  {col.map((day, rowIndex) => {
                    const dateStr = day.toISOString().substring(0, 10)
                    const activity = data.days[dateStr]

                    const today = new Date()
                    today.setHours(0, 0, 0, 0)
                    const dayWithoutTime = new Date(day)
                    dayWithoutTime.setHours(0, 0, 0, 0)

                    const isFuture = dayWithoutTime > today
                    const isSelected = selectedDate === dateStr

                    let cellClasses = ""
                    if (isFuture) {
                      cellClasses = "opacity-0 cursor-default border-transparent"
                    } else {
                      const rating = activity?.max_rating
                      if (rating == null) {
                        cellClasses = "bg-surface-2/30 border-transparent hover:bg-surface-2/60"
                      } else if (rating <= 1200) {
                        cellClasses = "bg-purple-900/40 border-purple-900/20 hover:bg-purple-800/60"
                      } else if (rating <= 1600) {
                        cellClasses = "bg-purple-600/70 border-purple-500/30 hover:bg-purple-500/80"
                      } else if (rating <= 2100) {
                        cellClasses = "bg-emerald-500/80 border-emerald-400/40 hover:bg-emerald-400"
                      } else {
                        cellClasses =
                          "bg-emerald-400 border-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.5)] hover:bg-emerald-300 hover:shadow-[0_0_16px_rgba(52,211,153,0.8)]"
                      }
                    }

                    const displayDate = day.toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })

                    return (
                      <Tooltip key={rowIndex}>
                        <TooltipTrigger asChild>
                          <div
                            onClick={() =>
                              !isFuture && setSelectedDate(isSelected ? null : dateStr)
                            }
                            className={`group relative h-3.5 w-3.5 rounded-[4px] border transition-all duration-200 ${cellClasses} ${!isFuture ? "cursor-pointer hover:z-10 hover:scale-[1.3] hover:shadow-lg" : ""} ${isSelected ? "z-10 scale-[1.2] ring-2 ring-primary ring-offset-2 ring-offset-card" : ""} `}
                          />
                        </TooltipTrigger>
                        {!isFuture && (
                          <TooltipContent
                            side="top"
                            className="flex min-w-[160px] flex-col gap-1.5 rounded-xl border-border/60 bg-surface-1 p-3 shadow-xl"
                          >
                            <div className="mb-1 text-xs font-medium text-muted-foreground">
                              {displayDate}
                            </div>
                            {activity ? (
                              <>
                                <div className="flex items-center gap-1.5 text-sm font-semibold">
                                  <Target className="h-3.5 w-3.5 text-emerald-400" />
                                  {activity.solved_count} problem
                                  {activity.solved_count !== 1 ? "s" : ""} solved
                                </div>
                                {activity.max_rating && (
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    Highest rating:{" "}
                                    <span className="font-semibold text-foreground">
                                      {activity.max_rating}
                                    </span>
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="text-sm italic text-muted-foreground">
                                No problems solved
                              </div>
                            )}
                          </TooltipContent>
                        )}
                      </Tooltip>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 flex items-center justify-end gap-3 border-t border-border/30 pt-4 text-xs text-muted-foreground">
          <span>Lower Difficulty</span>
          <div className="flex gap-1.5">
            <div className="h-3.5 w-3.5 rounded-[4px] border border-transparent bg-surface-2/30"></div>
            <div className="h-3.5 w-3.5 rounded-[4px] border border-purple-900/20 bg-purple-900/40"></div>
            <div className="h-3.5 w-3.5 rounded-[4px] border border-purple-500/30 bg-purple-600/70"></div>
            <div className="h-3.5 w-3.5 rounded-[4px] border border-emerald-400/40 bg-emerald-500/80"></div>
            <div className="h-3.5 w-3.5 rounded-[4px] border border-emerald-300 bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.5)]"></div>
          </div>
          <span>Higher</span>
        </div>

        {/* Selected Day Details */}
        {selectedDate && (
          <div className="mt-6 border-t border-border pt-6 duration-200 animate-in fade-in slide-in-from-top-2">
            <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
              {new Date(selectedDate).toLocaleDateString(undefined, {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
              {selectedDate === todayStr && (
                <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                  Today
                </span>
              )}
            </h4>

            {selectedDayActivity && selectedDayActivity.problems.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-3">
                {selectedDayActivity.problems.map((prob, i) => (
                  <a
                    key={i}
                    href={`https://codeforces.com/contest/${prob.contest_id}/problem/${prob.index}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex flex-col rounded-xl border border-border/50 bg-surface-1 p-4 transition-all duration-200 hover:border-border hover:bg-surface-2"
                  >
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <span className="line-clamp-2 flex items-center gap-1.5 text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                        {prob.name}
                      </span>
                      {prob.rating && (
                        <span className="shrink-0 rounded-full border border-border/40 bg-surface-2 px-2 py-0.5 text-xs font-bold text-muted-foreground transition-colors group-hover:border-primary/30 group-hover:text-primary">
                          {prob.rating}
                        </span>
                      )}
                    </div>
                    <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {prob.contest_id}
                        {prob.index}
                      </span>
                      <ExternalLink className="h-3.5 w-3.5 -translate-x-2 opacity-0 transition-opacity group-hover:translate-x-0 group-hover:opacity-100" />
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-surface-1/50 p-8">
                <Target className="mb-3 h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm italic text-muted-foreground">
                  Take a break or crush some problems!
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
