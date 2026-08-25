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
        labels.push({ month: midWeek.toLocaleString('default', { month: 'short' }), offset: i })
        lastMonth = midWeek.getMonth()
      }
    })
    
    return labels
  }, [calendarColumns])

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 animate-pulse">
        <Skeleton className="h-6 w-48 mb-6" />
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
        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              Practice Activity
              <span className="text-xs font-normal text-muted-foreground px-2 py-0.5 rounded-full border border-border/50 bg-surface-1">12 Months</span>
            </h3>
            <p className="text-sm text-muted-foreground mt-1">Your problem-solving timeline scaled by difficulty.</p>
          </div>
          
          {/* Summary Stats - Secondary visual weight */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider flex items-center gap-1">
                <Flame className="w-3 h-3 text-orange-500" /> Streak
              </span>
              <span className="font-semibold">{data.summary.current_streak}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider flex items-center gap-1">
                <Trophy className="w-3 h-3 text-yellow-500" /> Max
              </span>
              <span className="font-semibold">{data.summary.longest_streak}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider flex items-center gap-1">
                <Target className="w-3 h-3 text-emerald-500" /> Solved
              </span>
              <span className="font-semibold">{data.summary.total_solved}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider flex items-center gap-1">
                <Calendar className="w-3 h-3 text-blue-500" /> Active
              </span>
              <span className="font-semibold">{data.summary.active_days}</span>
            </div>
          </div>
        </div>
        
        {/* Heatmap Grid Wrapper */}
        <div className="overflow-x-auto pb-4 pt-2 -mx-2 px-2 custom-scrollbar">
          <div className="min-w-max inline-block">
            {/* Month Labels */}
            <div className="flex text-[10px] font-medium tracking-wide text-muted-foreground/80 mb-2 relative h-4" style={{ marginLeft: "32px" }}>
              {monthLabels.map((l, idx) => (
                <div 
                  key={idx} 
                  className="absolute" 
                  style={{ left: `${l.offset * 18}px` }}
                >
                  {l.month}
                </div>
              ))}
            </div>
            
            <div className="flex gap-1 items-start">
              {/* Day Labels */}
              <div className="flex flex-col gap-1 text-[10px] font-medium text-muted-foreground/60 pr-3 w-8 text-right pt-[1px]">
                <span className="h-3.5 flex items-center justify-end opacity-0">Sun</span>
                <span className="h-3.5 flex items-center justify-end">Mon</span>
                <span className="h-3.5 flex items-center justify-end opacity-0">Tue</span>
                <span className="h-3.5 flex items-center justify-end">Wed</span>
                <span className="h-3.5 flex items-center justify-end opacity-0">Thu</span>
                <span className="h-3.5 flex items-center justify-end">Fri</span>
                <span className="h-3.5 flex items-center justify-end opacity-0">Sat</span>
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
                        cellClasses = "bg-emerald-400 border-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.5)] hover:bg-emerald-300 hover:shadow-[0_0_16px_rgba(52,211,153,0.8)]"
                      }
                    }

                    const displayDate = day.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                    
                    return (
                      <Tooltip key={rowIndex}>
                        <TooltipTrigger asChild>
                          <div 
                            onClick={() => !isFuture && setSelectedDate(isSelected ? null : dateStr)}
                            className={`
                              w-3.5 h-3.5 rounded-[4px] border transition-all duration-200 relative group
                              ${cellClasses}
                              ${!isFuture ? 'cursor-pointer hover:scale-[1.3] hover:z-10 hover:shadow-lg' : ''}
                              ${isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-card scale-[1.2] z-10' : ''}
                            `}
                          />
                        </TooltipTrigger>
                        {!isFuture && (
                          <TooltipContent side="top" className="flex flex-col gap-1.5 p-3 min-w-[160px] bg-surface-1 border-border/60 shadow-xl rounded-xl">
                            <div className="text-xs font-medium text-muted-foreground mb-1">{displayDate}</div>
                            {activity ? (
                              <>
                                <div className="text-sm font-semibold flex items-center gap-1.5">
                                  <Target className="w-3.5 h-3.5 text-emerald-400" />
                                  {activity.solved_count} problem{activity.solved_count !== 1 ? 's' : ''} solved
                                </div>
                                {activity.max_rating && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Highest rating: <span className="font-semibold text-foreground">{activity.max_rating}</span>
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="text-sm text-muted-foreground italic">No problems solved</div>
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
        <div className="flex items-center justify-end gap-3 text-xs text-muted-foreground mt-6 pt-4 border-t border-border/30">
          <span>Lower Difficulty</span>
          <div className="flex gap-1.5">
            <div className="w-3.5 h-3.5 rounded-[4px] bg-surface-2/30 border border-transparent"></div>
            <div className="w-3.5 h-3.5 rounded-[4px] bg-purple-900/40 border border-purple-900/20"></div>
            <div className="w-3.5 h-3.5 rounded-[4px] bg-purple-600/70 border border-purple-500/30"></div>
            <div className="w-3.5 h-3.5 rounded-[4px] bg-emerald-500/80 border border-emerald-400/40"></div>
            <div className="w-3.5 h-3.5 rounded-[4px] bg-emerald-400 border border-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.5)]"></div>
          </div>
          <span>Higher</span>
        </div>

        {/* Selected Day Details */}
        {selectedDate && (
          <div className="mt-6 pt-6 border-t border-border animate-in fade-in slide-in-from-top-2 duration-200">
            <h4 className="text-sm font-semibold mb-4 flex items-center gap-2 text-foreground">
              {new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              {selectedDate === todayStr && <span className="text-[10px] uppercase bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">Today</span>}
            </h4>
            
            {selectedDayActivity && selectedDayActivity.problems.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-3">
                {selectedDayActivity.problems.map((prob, i) => (
                  <a 
                    key={i} 
                    href={`https://codeforces.com/contest/${prob.contest_id}/problem/${prob.index}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col p-4 rounded-xl bg-surface-1 border border-border/50 hover:bg-surface-2 hover:border-border transition-all duration-200 group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5 line-clamp-2">
                        {prob.name}
                      </span>
                      {prob.rating && (
                        <span className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-full bg-surface-2 text-muted-foreground border border-border/40 group-hover:text-primary group-hover:border-primary/30 transition-colors">
                          {prob.rating}
                        </span>
                      )}
                    </div>
                    <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
                      <span>{prob.contest_id}{prob.index}</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" />
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 border border-dashed border-border/60 rounded-xl bg-surface-1/50">
                <Target className="w-8 h-8 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground italic">Take a break or crush some problems!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
