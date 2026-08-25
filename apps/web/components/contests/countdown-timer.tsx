"use client"

import { useCountdown } from "@/hooks/use-countdown"
import { cn } from "@/lib/utils"
import type { ContestStatus } from "@/types/contests"

interface CountdownTimerProps {
  startTime: string
  status: ContestStatus
  className?: string
}

export function CountdownTimer({
  startTime,
  status,
  className,
}: CountdownTimerProps) {
  const countdown = useCountdown(status === "upcoming" ? startTime : null)

  if (status === "running") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 font-mono text-xs font-medium text-emerald-400",
          className
        )}
      >
        <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </span>
        Live now
      </span>
    )
  }

  if (status === "finished") {
    return (
      <span
        className={cn(
          "font-mono text-xs text-muted-foreground",
          className
        )}
      >
        Ended
      </span>
    )
  }

  // Upcoming
  if (countdown === null) {
    // Before hydration: render a placeholder with the same width to avoid layout shift
    return (
      <span
        className={cn(
          "inline-block h-4 w-20 animate-pulse rounded bg-muted",
          className
        )}
        aria-label="Loading countdown"
      />
    )
  }

  return (
    <span
      className={cn(
        "font-mono text-xs font-medium tabular-nums text-violet-400",
        className
      )}
      aria-live="polite"
      aria-label={`Starts in ${countdown}`}
    >
      {countdown}
    </span>
  )
}
