"use client"

import { ExternalLink, CalendarPlus, Clock, Timer } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { formatDuration } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { PlatformBadge } from "./platform-badge"
import { CountdownTimer } from "./countdown-timer"
import type { Contest } from "@/types/contests"

// -------------------------------------------------------
// Calendar link helpers
// -------------------------------------------------------

function buildGoogleCalendarUrl(contest: Contest): string {
  const start = new Date(contest.start_time)
  const end = contest.duration_seconds
    ? new Date(start.getTime() + contest.duration_seconds * 1000)
    : new Date(start.getTime() + 2 * 60 * 60 * 1000) // default 2h

  const fmt = (d: Date) =>
    d
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z/, "Z")

  return (
    `https://calendar.google.com/calendar/r/eventedit?` +
    `text=${encodeURIComponent(contest.contest_name)}` +
    `&dates=${fmt(start)}/${fmt(end)}` +
    `&details=${encodeURIComponent(`Platform: ${contest.platform}\nURL: ${contest.url}`)}` +
    `&location=${encodeURIComponent(contest.url)}`
  )
}

// -------------------------------------------------------
// ContestCard
// -------------------------------------------------------

interface ContestCardProps {
  contest: Contest
  index?: number
}

const ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 6 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.03,
      duration: 0.2,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  }),
}

export function ContestCard({ contest, index = 0 }: ContestCardProps) {
  const isLive = contest.status === "running"
  const isFinished = contest.status === "finished"
  const startDate = new Date(contest.start_time)

  // Local time formatting
  const localTime = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(startDate)

  const localDate = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(startDate)

  return (
    <motion.div
      custom={index}
      variants={ITEM_VARIANTS}
      initial="hidden"
      animate="visible"
      className={cn(
        "group relative flex flex-col gap-3 rounded-xl border bg-card p-4 transition-colors duration-150",
        "hover:border-border/80 hover:bg-card/80 sm:flex-row sm:items-center sm:gap-4 sm:p-4",
        isLive ? "border-emerald-500/20 bg-emerald-400/[0.03]" : "border-border"
      )}
      role="article"
      aria-label={`${contest.contest_name} on ${contest.platform}`}
    >
      {/* Live indicator stripe */}
      {isLive && (
        <div
          className="absolute left-0 top-0 h-full w-0.5 rounded-l-xl bg-emerald-400/60"
          aria-hidden="true"
        />
      )}

      {/* ---- Left: Platform icon + name ---- */}
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        {/* Platform badge */}
        <PlatformBadge platform={contest.platform} className="w-fit shrink-0" />

        {/* Contest name */}
        <div className="min-w-0">
          <a
            href={contest.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate text-sm font-medium text-foreground transition-colors hover:text-primary focus-visible:underline focus-visible:outline-none"
            title={contest.contest_name}
          >
            {contest.contest_name}
          </a>
          {/* Date + time */}
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
              {localDate} · {localTime}
            </span>
            {contest.duration_seconds != null && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Timer className="h-3 w-3 shrink-0" aria-hidden="true" />
                {formatDuration(contest.duration_seconds)}
              </span>
            )}
            {contest.registration_open === true && (
              <span className="text-xs text-violet-400">Registration open</span>
            )}
          </div>
        </div>
      </div>

      {/* ---- Right: Countdown + actions ---- */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {/* Countdown */}
        {!isFinished && (
          <div className="hidden min-w-[72px] text-right sm:block">
            <CountdownTimer startTime={contest.start_time} status={contest.status} />
          </div>
        )}

        {/* Add to Calendar (upcoming only) */}
        {contest.status === "upcoming" && (
          <Button
            variant="ghost"
            size="icon-sm"
            asChild
            className="shrink-0 text-muted-foreground hover:text-foreground"
            title="Add to Google Calendar"
          >
            <a
              href={buildGoogleCalendarUrl(contest)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Add ${contest.contest_name} to calendar`}
            >
              <CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </Button>
        )}

        {/* Open contest */}
        <Button
          variant="outline"
          size="sm"
          asChild
          className={cn(
            "shrink-0 text-xs",
            isLive && "border-emerald-500/30 text-emerald-400 hover:bg-emerald-400/10"
          )}
        >
          <a
            href={contest.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${contest.contest_name} on ${contest.platform}`}
          >
            {isLive ? "Join" : "View"}
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        </Button>
      </div>
    </motion.div>
  )
}

// -------------------------------------------------------
// ContestCardSkeleton — loading placeholder
// -------------------------------------------------------
export function ContestCardSkeleton() {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-4">
        <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
        <div className="space-y-2">
          <div className="h-4 w-56 animate-pulse rounded bg-muted" />
          <div className="h-3 w-36 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="hidden h-4 w-16 animate-pulse rounded bg-muted sm:block" />
        <div className="h-7 w-14 animate-pulse rounded-md bg-muted" />
      </div>
    </div>
  )
}
