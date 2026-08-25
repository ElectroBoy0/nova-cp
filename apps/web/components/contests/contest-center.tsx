"use client"

import { useState, useMemo } from "react"
import { RefreshCw, Search, AlertTriangle } from "lucide-react"
import { motion } from "framer-motion"
import { useContests, useSyncContests } from "@/hooks/use-contests"
import { PLATFORM_META } from "@/lib/contests"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ContestHero } from "@/components/contests/contest-hero"
import { PlatformFilter } from "@/components/contests/platform-filter"
import { ContestSection } from "@/components/contests/contest-section"
import type { ContestPlatform, ContestStatus } from "@/types/contests"

type PlatformFilter = ContestPlatform | "all"

// -------------------------------------------------------
// ContestCenter — top-level client component
// -------------------------------------------------------
export function ContestCenter() {
  const [platform, setPlatform] = useState<PlatformFilter>("all")
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<"nearest" | "platform">("nearest")

  // Fetch all contests (200 limit is sufficient for all 3 platforms)
  const { data, isLoading, isError, error, dataUpdatedAt, refetch } =
    useContests({ limit: 200 })

  const syncMutation = useSyncContests()

  // ---- Derived data ----
  const allContests = useMemo(() => data?.contests ?? [], [data])

  const filtered = useMemo(() => {
    let result = allContests

    if (platform !== "all") {
      result = result.filter((c) => c.platform === platform)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((c) => c.contest_name.toLowerCase().includes(q))
    }

    return result
  }, [allContests, platform, search])

  // Split into sections
  const live = filtered.filter((c) => c.status === "running")
  const upcoming = filtered.filter((c) => c.status === "upcoming")
  const finished = filtered.filter((c) => c.status === "finished")

  // Sort sections
  if (sort === "nearest") {
    live.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    upcoming.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    finished.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
  } else {
    live.sort((a, b) => a.platform.localeCompare(b.platform))
    upcoming.sort((a, b) => a.platform.localeCompare(b.platform))
    finished.sort((a, b) => a.platform.localeCompare(b.platform))
  }

  // Next contest = first live, then first upcoming
  const nextContest = live[0] ?? upcoming[0] ?? null

  // Platform counts for filter pills
  const platformCounts = useMemo(() => {
    const counts: Partial<Record<PlatformFilter, number>> = {
      all: allContests.length,
    }
    for (const p of Object.keys(PLATFORM_META) as ContestPlatform[]) {
      counts[p] = allContests.filter((c) => c.platform === p).length
    }
    return counts
  }, [allContests])

  // Last sync time
  const lastUpdated = dataUpdatedAt
    ? new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(new Date(dataUpdatedAt))
    : null

  // ---- Sync handler ----
  const handleSync = async () => {
    await syncMutation.mutateAsync()
    refetch()
  }

  // ---- Error state ----
  if (isError && !isLoading && allContests.length === 0) {
    return (
      <ErrorState
        message={
          error instanceof Error ? error.message : "Failed to load contests."
        }
        onRetry={() => refetch()}
      />
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col gap-6"
    >
      {/* ---- Hero ---- */}
      <ContestHero
        nextContest={nextContest}
        liveCount={live.length}
        upcomingCount={upcoming.length}
        totalCount={allContests.length}
      />

      {/* ---- Toolbar ---- */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Platform filters */}
        <PlatformFilter
          value={platform}
          onChange={setPlatform}
          counts={platformCounts}
        />

        {/* Right-side controls */}
        <div className="flex items-center gap-2">
          {/* Sort */}
          <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
            {(
              [
                { value: "nearest", label: "Nearest" },
                { value: "platform", label: "Platform" },
              ] as const
            ).map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setSort(s.value)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  sort === s.value
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Sync button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncMutation.isPending}
            className="shrink-0 gap-1.5"
            aria-label="Sync contests from all platforms"
          >
            <RefreshCw
              className={cn(
                "h-3.5 w-3.5",
                syncMutation.isPending && "animate-spin"
              )}
              aria-hidden="true"
            />
            {syncMutation.isPending ? "Syncing…" : "Sync"}
          </Button>
        </div>
      </div>

      {/* ---- Search ---- */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          id="contest-search"
          type="search"
          placeholder="Search contests…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={cn(
            "w-full rounded-lg border border-border bg-card py-2 pl-9 pr-4 text-sm",
            "placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0",
            "transition-colors hover:border-border/80"
          )}
          aria-label="Search contests by name"
        />
      </div>

      {/* ---- Last sync status ---- */}
      {lastUpdated && (
        <p className="text-[11px] text-muted-foreground/60">
          Last updated at {lastUpdated}
          {syncMutation.isSuccess && (
            <span className="ml-2 text-emerald-400">
              · Sync complete ✓
            </span>
          )}
          {syncMutation.isError && (
            <span className="ml-2 text-destructive">
              · Sync failed
            </span>
          )}
        </p>
      )}

      {/* ---- Contest Sections ---- */}
      {(["running", "upcoming", "finished"] as ContestStatus[]).map((s) => (
        <ContestSection
          key={s}
          title={s}
          status={s}
          contests={
            s === "running" ? live : s === "upcoming" ? upcoming : finished
          }
          isLoading={isLoading}
        />
      ))}

      {/* ---- Empty state when search has no results ---- */}
      {!isLoading && filtered.length === 0 && search.length > 0 && (
        <div className="py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No contests match &quot;{search}&quot;
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearch("")}
            className="mt-2 text-xs"
          >
            Clear search
          </Button>
        </div>
      )}
    </motion.div>
  )
}

// -------------------------------------------------------
// ErrorState
// -------------------------------------------------------
function ErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/20 bg-destructive/5 px-6 py-12 text-center">
      <AlertTriangle
        className="mb-3 h-8 w-8 text-destructive/60"
        aria-hidden="true"
      />
      <p className="mb-1 text-sm font-medium text-foreground">
        Failed to load contests
      </p>
      <p className="mb-4 text-xs text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="h-3.5 w-3.5" />
        Retry
      </Button>
    </div>
  )
}
