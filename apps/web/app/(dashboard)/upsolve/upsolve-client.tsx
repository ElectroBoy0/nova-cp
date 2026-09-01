"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import {
  useUpsolveQueue,
  useUpsolveStats,
  useUpdateUpsolveStatus,
  useGenerateUpsolve,
} from "@/hooks/use-upsolve"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import {
  CheckCircle2,
  Circle,
  Clock,
  Target,
  RotateCw,
  NotebookPen,
  BookOpen,
  Trophy,
  Terminal,
  Search,
  X,
  SlidersHorizontal,
} from "lucide-react"
import { NoteModal } from "@/components/problems/note-modal"

export function UpsolveClient({ userId }: { userId: string }) {
  const [statusFilter, setStatusFilter] = useState("all")
  const [ratingRange, setRatingRange] = useState<[number, number]>([800, 3500])
  const [search, setSearch] = useState("")
  const [noteModalProblem, setNoteModalProblem] = useState<{ id: string; name: string } | null>(
    null
  )
  const { data: stats, isLoading: isStatsLoading } = useUpsolveStats(userId)
  const { data: queueData, isLoading: isQueueLoading } = useUpsolveQueue(userId, {
    status: statusFilter !== "all" ? statusFilter : undefined,
  })

  const updateStatus = useUpdateUpsolveStatus()
  const generateQueue = useGenerateUpsolve()

  const handleStatusChange = (itemId: string, newStatus: string) => {
    updateStatus.mutate({ userId, itemId, status: newStatus })
  }

  const rawItems = queueData?.items || []

  const filteredItems = useMemo(() => {
    return rawItems.filter((item) => {
      // Rating filter
      if (item.problem_rating) {
        if (item.problem_rating < ratingRange[0] || item.problem_rating > ratingRange[1]) {
          return false
        }
      }
      // Search / tag filter
      if (search.trim()) {
        const q = search.toLowerCase().trim()
        const matchName = item.problem_name.toLowerCase().includes(q)
        const matchIndex = `${item.contest_id}${item.problem_index}`.toLowerCase().includes(q)
        const matchTag = item.tags.some((t) => t.toLowerCase().includes(q))
        const matchContest = (item.contest_name || "").toLowerCase().includes(q)
        if (!matchName && !matchIndex && !matchTag && !matchContest) {
          return false
        }
      }
      return true
    })
  }, [rawItems, ratingRange, search])

  const hasActiveFilters = ratingRange[0] !== 800 || ratingRange[1] !== 3500 || search.trim() !== ""

  const handleResetFilters = () => {
    setRatingRange([800, 3500])
    setSearch("")
  }

  return (
    <div className="space-y-8">
      {/* Stats Bar */}
      <div className="grid animate-fade-up grid-cols-2 gap-4 md:grid-cols-4">
        {[
          {
            label: "Total Missed",
            value: stats?.total_items,
            icon: Target,
            color: "text-amber-400",
          },
          {
            label: "Pending",
            value: (stats?.not_started ?? 0) + (stats?.attempted ?? 0),
            icon: Clock,
            color: "text-sky-400",
          },
          {
            label: "Upsolved",
            value: stats?.solved,
            icon: CheckCircle2,
            color: "text-emerald-400",
          },
          {
            label: "Upsolve Ratio",
            value: stats ? `${Math.round(stats.upsolve_ratio * 100)}%` : null,
            icon: Target,
            color: "text-violet-400",
          },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border/40 bg-surface-1/50 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {stat.label}
              </span>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <div className="font-mono text-2xl font-semibold">
              {isStatsLoading ? <Skeleton className="h-8 w-16" /> : (stat.value ?? 0)}
            </div>
          </div>
        ))}
      </div>

      {/* Filter and Search Toolbar */}
      <div className="stagger-1 flex animate-fade-up flex-col gap-4 rounded-xl border border-border/40 bg-surface-1/40 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-fit">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="not_started">Not Started</TabsTrigger>
              <TabsTrigger value="attempted">Attempted</TabsTrigger>
              <TabsTrigger value="solved">Solved</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative min-w-[200px] max-w-sm flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by problem name, tag, contest..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9 text-xs"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Rating Range Filter */}
        <div className="flex flex-wrap items-center gap-4 sm:flex-nowrap">
          <div className="flex w-full min-w-[200px] max-w-xs flex-col gap-1.5 sm:w-56">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                <SlidersHorizontal className="h-3 w-3 text-primary" /> Rating Range:
              </span>
              <span className="font-mono text-xs font-semibold text-primary">
                {ratingRange[0]} - {ratingRange[1]}
              </span>
            </div>
            <Slider
              min={800}
              max={3500}
              step={100}
              value={ratingRange}
              onValueChange={(val) => setRatingRange([val[0] ?? 800, val[1] ?? 3500])}
            />
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-9 gap-1 px-2.5 text-xs text-muted-foreground hover:text-foreground"
              title="Clear active filters"
            >
              <X className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => generateQueue.mutate(userId)}
            disabled={generateQueue.isPending}
            className="h-9 gap-2 text-xs"
          >
            <RotateCw className={`h-3 w-3 ${generateQueue.isPending ? "animate-spin" : ""}`} />
            <span>Refresh Queue</span>
          </Button>
        </div>
      </div>

      {/* Queue List */}
      <div className="stagger-2 animate-fade-up space-y-4">
        {isQueueLoading ? (
          [1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
        ) : rawItems.length === 0 ? (
          <div className="mx-auto max-w-lg space-y-4 rounded-2xl border border-dashed border-border/80 bg-surface-1/30 p-12 text-center text-muted-foreground">
            <div className="mx-auto w-fit rounded-full border border-primary/20 bg-primary/10 p-3 text-primary">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-foreground">No Unsolved Problems!</h3>
              <p className="text-xs text-muted-foreground">
                {statusFilter === "all"
                  ? "You're all caught up from your recent contests. Practice targeted problems from the explorer or discover upcoming contests."
                  : `No problems currently match the '${statusFilter}' filter.`}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                asChild
                size="sm"
                className="gap-2 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
              >
                <Link href="/problems">
                  <BookOpen className="h-4 w-4" />
                  <span>Explore Problems</span>
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="gap-2 border-border hover:bg-surface-2"
              >
                <Link href="/contests">
                  <Trophy className="h-4 w-4 text-purple-400" />
                  <span>Contest Center</span>
                </Link>
              </Button>
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="mx-auto max-w-md space-y-3 rounded-2xl border border-dashed border-border/80 bg-surface-1/30 p-8 text-center text-muted-foreground">
            <SlidersHorizontal className="mx-auto h-6 w-6 text-primary opacity-40" />
            <h4 className="text-sm font-semibold text-foreground">No matching problems</h4>
            <p className="text-xs text-muted-foreground">
              No queue problems found in the rating range {ratingRange[0]} - {ratingRange[1]}
              {search ? ` matching "${search}"` : ""}.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={handleResetFilters}
              className="mt-2 text-xs"
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          filteredItems.map((item, idx) => (
            <div
              key={`${item.id || idx}-${idx}`}
              className={`flex flex-col items-start justify-between gap-4 rounded-xl border p-5 transition-colors sm:flex-row sm:items-center ${
                item.status === "solved"
                  ? "border-emerald-500/20 bg-emerald-500/5"
                  : "border-border/40 bg-card hover:border-border/80"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{item.contest_name}</span>
                  <span>•</span>
                  <span>{item.reason}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/solve?problemId=${item.contest_id}${item.problem_index}`}
                    className="flex items-center gap-1.5 text-lg font-medium text-foreground transition-colors hover:text-primary"
                  >
                    <span>
                      {item.problem_index}. {item.problem_name}
                    </span>
                  </Link>
                  {item.problem_rating && (
                    <Badge
                      variant="outline"
                      className={
                        item.problem_rating < 1200
                          ? "border-green-500/30 text-green-400"
                          : item.problem_rating < 1600
                            ? "border-cyan-500/30 text-cyan-400"
                            : item.problem_rating < 2000
                              ? "border-blue-500/30 text-blue-400"
                              : item.problem_rating < 2400
                                ? "border-violet-500/30 text-violet-400"
                                : "border-red-500/30 text-red-400"
                      }
                    >
                      {item.problem_rating}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded bg-surface-2 px-2 py-0.5 text-[10px] text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex w-full flex-row gap-2 sm:w-auto sm:flex-col">
                {item.status !== "solved" && (
                  <Button
                    asChild
                    size="sm"
                    className="flex-1 gap-1.5 border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 sm:flex-none"
                  >
                    <Link href={`/solve?problemId=${item.contest_id}${item.problem_index}`}>
                      <Terminal className="h-3.5 w-3.5" />
                      <span>Solve Workspace</span>
                    </Link>
                  </Button>
                )}
                {item.status === "not_started" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2 text-xs sm:flex-none"
                    onClick={() => handleStatusChange(item.id, "attempted")}
                  >
                    <Circle className="h-3 w-3" />
                    Mark Attempted
                  </Button>
                )}
                {item.status !== "solved" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2 border-emerald-500/20 text-xs text-emerald-400 hover:bg-emerald-500/10 sm:flex-none"
                    onClick={() => handleStatusChange(item.id, "solved")}
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Mark Solved
                  </Button>
                )}
                {item.status === "solved" && (
                  <div className="flex items-center gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    Solved {item.solved_at && new Date(item.solved_at).toLocaleDateString()}
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 gap-2 text-xs sm:flex-none"
                  onClick={() =>
                    setNoteModalProblem({
                      id: `CF_${item.contest_id}_${item.problem_index}`,
                      name: item.problem_name,
                    })
                  }
                >
                  <NotebookPen className="h-3 w-3" />
                  Notes
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <NoteModal
        userId={userId}
        problemId={noteModalProblem?.id || ""}
        problemName={noteModalProblem?.name || ""}
        isOpen={!!noteModalProblem}
        onClose={() => setNoteModalProblem(null)}
      />
    </div>
  )
}
