"use client"

import { Trophy, Calendar, Clock } from "lucide-react"
import type { Contest } from "@/types/contests"
import { CountdownTimer } from "./countdown-timer"
import { PlatformBadge } from "./platform-badge"
import { formatDuration } from "@/lib/utils"

interface ContestHeroProps {
  nextContest: Contest | null
  liveCount: number
  upcomingCount: number
  totalCount: number
}

export function ContestHero({
  nextContest,
  liveCount,
  upcomingCount,
  totalCount,
}: ContestHeroProps) {
  const startDate = nextContest ? new Date(nextContest.start_time) : null

  const localDateTime = startDate
    ? new Intl.DateTimeFormat(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZoneName: "short",
      }).format(startDate)
    : null

  return (
    <div className="mb-6 grid gap-4 lg:grid-cols-3">
      {/* ---- Next contest highlight ---- */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5 lg:col-span-2">
        {/* Subtle gradient */}
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 0% 100%, hsl(262 83% 57% / 0.08), transparent)",
          }}
          aria-hidden="true"
        />

        <div className="relative flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Trophy
              className="h-4 w-4 text-primary"
              aria-hidden="true"
            />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {liveCount > 0 ? "Live Now" : "Next Contest"}
            </span>
          </div>

          {nextContest ? (
            <>
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <PlatformBadge platform={nextContest.platform} />
                  {nextContest.registration_open && (
                    <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-0.5 text-xs font-medium text-violet-400">
                      Registration open
                    </span>
                  )}
                </div>
                <h2 className="text-base font-semibold text-foreground sm:text-lg leading-snug">
                  {nextContest.contest_name}
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                {localDateTime && (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {localDateTime}
                  </span>
                )}
                {nextContest.duration_seconds && (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {formatDuration(nextContest.duration_seconds)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Starts in</span>
                <CountdownTimer
                  startTime={nextContest.start_time}
                  status={nextContest.status}
                  className="text-sm"
                />
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No upcoming contests found. Run a sync to fetch the latest data.
            </p>
          )}
        </div>
      </div>

      {/* ---- Stats ---- */}
      <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
        {[
          {
            label: "Live",
            value: liveCount,
            color: "text-emerald-400",
            bg: "bg-emerald-400/10",
          },
          {
            label: "Upcoming",
            value: upcomingCount,
            color: "text-violet-400",
            bg: "bg-violet-400/10",
          },
          {
            label: "Total",
            value: totalCount,
            color: "text-foreground",
            bg: "bg-muted",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col justify-center rounded-xl border border-border bg-card p-4"
          >
            <span className="mb-1 text-xs text-muted-foreground">
              {stat.label}
            </span>
            <span
              className={`font-mono text-2xl font-semibold tabular-nums ${stat.color}`}
            >
              {stat.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
