"use client"

import React, { useState } from "react"
import {
  Play,
  Pause,
  RotateCcw,
  Clock,
  ChevronDown,
  ArrowUpRight,
  Timer as TimerIcon,
  Sparkles,
} from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { TIMER_PRESETS, formatDurationHuman } from "@/lib/solve-timer"
import { useSolveTimer } from "@/hooks/use-solve-timer"

interface SolveTimerProps {
  problemId?: string
  problemName?: string
  virtualContestEndTime?: number | null
  className?: string
  onDurationCaptured?: (durationSeconds: number) => void
}

export function SolveTimer({
  problemId = "default",
  problemName = "Problem",
  virtualContestEndTime,
  className,
}: SolveTimerProps) {
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [customMinutes, setCustomMinutes] = useState<string>("45")

  const timer = useSolveTimer({
    problemId,
    problemName,
    virtualContestEndTime,
  })

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const mins = parseInt(customMinutes, 10)
    if (!isNaN(mins) && mins > 0) {
      timer.setCustomMinutes(mins)
      timer.start()
      setPopoverOpen(false)
    }
  }

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <div
        className={cn(
          "flex items-center rounded-md border border-border/60 bg-surface-2",
          className
        )}
      >
        {/* Main Clickable Timer Pill (Toggles Start/Pause) */}
        <button
          type="button"
          onClick={() => timer.toggle()}
          title={timer.isRunning ? "Click to Pause timer" : "Click to Start timer"}
          aria-label={`Timer: ${timer.formattedTime}, status: ${timer.status}. Click to ${timer.isRunning ? "pause" : "start"}.`}
          className={cn(
            "hover:bg-surface-3 group flex h-7 items-center gap-1.5 rounded-l-md px-2.5 font-mono text-xs font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-primary",
            timer.isRunning && "text-primary",
            timer.isPaused && "text-amber-400",
            timer.isCompleted && "animate-pulse text-rose-400",
            timer.status === "idle" && "text-muted-foreground hover:text-foreground"
          )}
        >
          {timer.isRunning ? (
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
          ) : timer.isPaused ? (
            <Pause className="h-3 w-3 fill-current text-amber-400" />
          ) : timer.isCompleted ? (
            <span className="h-2 w-2 rounded-full bg-rose-500" />
          ) : (
            <Clock className="h-3 w-3 text-muted-foreground group-hover:text-foreground" />
          )}

          <span className="font-semibold tabular-nums tracking-tight">{timer.formattedTime}</span>
        </button>

        {/* Popover Settings Trigger Chevron */}
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-surface-3 h-7 w-5 rounded-none rounded-r-md border-l border-border/40 px-0 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            aria-label="Timer settings and presets"
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
      </div>

      <PopoverContent
        align="center"
        sideOffset={6}
        className="w-72 border-border/80 bg-surface-1 p-3.5 shadow-xl shadow-black/40"
      >
        <div className="space-y-3.5 text-xs">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <TimerIcon className="h-3.5 w-3.5 text-primary" />
              <span>Practice Timer</span>
            </div>
            <Badge
              variant={timer.mode === "count_down" ? "default" : "secondary"}
              className="px-1.5 py-0 text-[10px] font-normal uppercase tracking-wider"
            >
              {timer.mode === "count_down" ? "Countdown" : "Count Up"}
            </Badge>
          </div>

          {/* Mode Switcher */}
          <div className="grid grid-cols-2 gap-1 rounded-lg border border-border/60 bg-surface-2 p-0.5">
            <button
              type="button"
              onClick={() => timer.setCountUp()}
              className={cn(
                "rounded-md py-1 text-center font-medium transition-colors",
                timer.mode === "count_up"
                  ? "bg-surface-1 text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Count Up
            </button>
            <button
              type="button"
              onClick={() => timer.setCountDown(timer.targetSeconds || 30 * 60)}
              className={cn(
                "rounded-md py-1 text-center font-medium transition-colors",
                timer.mode === "count_down"
                  ? "bg-surface-1 text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Countdown
            </button>
          </div>

          {/* Countdown Presets */}
          {timer.mode === "count_down" && (
            <div className="space-y-2">
              <span className="text-[11px] font-medium text-muted-foreground">Quick Presets</span>
              <div className="grid grid-cols-4 gap-1.5">
                {TIMER_PRESETS.map((preset) => {
                  const isSelected = timer.targetSeconds === preset.seconds
                  return (
                    <Button
                      key={preset.label}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        timer.setCountDown(preset.seconds)
                        timer.start()
                      }}
                      className={cn(
                        "h-7 border-border/60 bg-surface-2 px-1 font-mono text-xs transition-all",
                        isSelected
                          ? "border-primary bg-primary/10 font-semibold text-primary"
                          : "hover:bg-surface-3 hover:text-foreground"
                      )}
                    >
                      {preset.label}
                    </Button>
                  )
                })}
              </div>

              {/* Custom Duration Input */}
              <form onSubmit={handleCustomSubmit} className="flex items-center gap-1.5 pt-1">
                <Input
                  type="number"
                  min="1"
                  max="360"
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(e.target.value)}
                  placeholder="Mins"
                  className="h-7 w-20 border-border/60 bg-surface-2 px-2 font-mono text-xs"
                />
                <span className="text-[11px] text-muted-foreground">min</span>
                <Button
                  type="submit"
                  variant="secondary"
                  size="sm"
                  className="ml-auto h-7 px-2.5 text-xs font-medium"
                >
                  Set & Start
                </Button>
              </form>
            </div>
          )}

          {/* Primary Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              onClick={() => timer.toggle()}
              className={cn(
                "h-8 flex-1 gap-1.5 text-xs font-semibold shadow-sm transition-all",
                timer.isRunning
                  ? "border border-amber-500/40 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              {timer.isRunning ? (
                <>
                  <Pause className="h-3.5 w-3.5 fill-current" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>{timer.status === "paused" ? "Resume" : "Start Timer"}</span>
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => timer.reset()}
              title="Reset Timer"
              className="hover:bg-surface-3 h-8 border-border/60 bg-surface-2 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="ml-1">Reset</span>
            </Button>
          </div>

          {/* Active Session Stats Footer */}
          <div className="flex items-center justify-between border-t border-border/40 pt-2 text-[11px] text-muted-foreground">
            <span>Total Active Time:</span>
            <span className="font-mono font-medium text-foreground">
              {formatDurationHuman(timer.elapsedSolvingSeconds || timer.seconds)}
            </span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
