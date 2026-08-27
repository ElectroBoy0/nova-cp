"use client"

import React, { useState, useEffect, useRef, useMemo } from "react"
import {
  Search,
  Loader2,
  Check,
  Clock,
  Sparkles,
  ChevronDown,
  CheckCircle2,
  CircleDot,
} from "lucide-react"
import { useDebounce } from "use-debounce"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useProblemSearch } from "@/hooks/use-problems"
import type { Problem, ProblemSearchResult } from "@/types/problems"

interface ProblemSearchComboboxProps {
  currentProblem: Problem | null
  onSelectProblem: (problem: ProblemSearchResult | Problem) => void
  userId?: string
}

const RECENT_PROBLEMS_KEY = "novacp_recent_problems"

function getRatingBadgeColor(rating: number | null | undefined): {
  badgeClass: string
  dotColor: string
} {
  if (!rating)
    return { badgeClass: "bg-slate-500/10 text-slate-400 border-slate-500/20", dotColor: "#64748b" }
  if (rating < 1200)
    return { badgeClass: "bg-slate-500/10 text-slate-300 border-slate-500/20", dotColor: "#94a3b8" }
  if (rating < 1400)
    return {
      badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      dotColor: "#22c55e",
    }
  if (rating < 1600)
    return { badgeClass: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20", dotColor: "#06b6d4" }
  if (rating < 1900)
    return { badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/20", dotColor: "#3b82f6" }
  if (rating < 2100)
    return {
      badgeClass: "bg-purple-500/10 text-purple-400 border-purple-500/20",
      dotColor: "#a855f7",
    }
  if (rating < 2400)
    return {
      badgeClass: "bg-orange-500/10 text-orange-400 border-orange-500/20",
      dotColor: "#f97316",
    }
  return { badgeClass: "bg-rose-500/10 text-rose-400 border-rose-500/20", dotColor: "#ef4444" }
}

export function ProblemSearchCombobox({
  currentProblem,
  onSelectProblem,
  userId,
}: ProblemSearchComboboxProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedQuery] = useDebounce(searchQuery, 300)
  const [recentProblems, setRecentProblems] = useState<ProblemSearchResult[]>([])

  // Fetch search results from backend API
  const { data: searchData, isLoading } = useProblemSearch({
    q: debouncedQuery,
    limit: 25,
    userId,
  })

  const results = searchData?.results || []

  // Load recent problems from local storage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_PROBLEMS_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) setRecentProblems(parsed)
      }
    } catch {
      // Ignore local storage errors
    }
  }, [open])

  // Save current problem to recent problems on change
  useEffect(() => {
    if (!currentProblem) return
    try {
      const probId = currentProblem.contest_id
        ? `${currentProblem.contest_id}${currentProblem.index}`
        : currentProblem.index
      const entry: ProblemSearchResult = {
        id: probId,
        problem_id: currentProblem.id,
        platform: currentProblem.platform,
        platform_problem_id: currentProblem.platform_problem_id,
        contest_id: currentProblem.contest_id,
        index: currentProblem.index,
        name: currentProblem.name,
        title: currentProblem.name,
        rating: currentProblem.rating,
        tags: currentProblem.tags || [],
        url: currentProblem.url,
        solved_count: currentProblem.solved_count,
      }

      const stored = localStorage.getItem(RECENT_PROBLEMS_KEY)
      let list: ProblemSearchResult[] = stored ? JSON.parse(stored) : []
      list = [
        entry,
        ...list.filter((p) => p.id !== entry.id && p.problem_id !== entry.problem_id),
      ].slice(0, 10)
      localStorage.setItem(RECENT_PROBLEMS_KEY, JSON.stringify(list))
      setRecentProblems(list)
    } catch {
      // Ignore
    }
  }, [currentProblem])

  // Keyboard shortcut listener for Cmd + K / Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const handleSelect = (item: ProblemSearchResult) => {
    onSelectProblem(item)
    setOpen(false)
    setSearchQuery("")

    // Update recents
    try {
      const stored = localStorage.getItem(RECENT_PROBLEMS_KEY)
      let list: ProblemSearchResult[] = stored ? JSON.parse(stored) : []
      list = [
        item,
        ...list.filter((p) => p.id !== item.id && p.problem_id !== item.problem_id),
      ].slice(0, 10)
      localStorage.setItem(RECENT_PROBLEMS_KEY, JSON.stringify(list))
      setRecentProblems(list)
    } catch {
      // Ignore
    }
  }

  const currentProbDisplayId = currentProblem
    ? currentProblem.contest_id
      ? `${currentProblem.contest_id}${currentProblem.index}`
      : currentProblem.index
    : "—"

  const currentMeta = getRatingBadgeColor(currentProblem?.rating)

  return (
    <>
      {/* Workspace Toolbar Combobox Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hover:bg-surface-3 group flex max-w-[280px] items-center gap-2 truncate rounded-md border border-border/80 bg-surface-2 px-2.5 py-1 text-left font-mono text-xs font-medium text-foreground shadow-sm transition-all hover:border-border focus:outline-none focus:ring-1 focus:ring-primary sm:max-w-md"
        title="Search problems (⌘K)"
      >
        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: currentMeta.dotColor }}
          />
          <span className="font-bold text-foreground">{currentProbDisplayId}</span>
        </div>

        <span className="truncate text-muted-foreground group-hover:text-foreground">
          · {currentProblem?.name || "Select Problem"}
        </span>

        {currentProblem?.rating && (
          <span className="shrink-0 text-[11px] text-muted-foreground">
            ({currentProblem.rating})
          </span>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-1 pl-1">
          <kbd className="hidden rounded border border-border/60 bg-surface-1 px-1 py-0.5 font-sans text-[9px] font-medium text-muted-foreground group-hover:text-foreground sm:inline-block">
            ⌘K
          </kbd>
          <ChevronDown className="h-3 w-3 text-muted-foreground opacity-60 group-hover:opacity-100" />
        </div>
      </button>

      {/* Search Modal Dialog */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search 10,000+ problems by ID (2041G), title, tag (dp), or rating (1600)..."
          value={searchQuery}
          onValueChange={setSearchQuery}
        />

        <CommandList className="custom-scrollbar max-h-[420px] p-2">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>Searching Codeforces problemset...</span>
            </div>
          )}

          {!isLoading && debouncedQuery && results.length === 0 && (
            <CommandEmpty className="py-8 text-center text-xs text-muted-foreground">
              No problems found matching{" "}
              <span className="font-semibold text-foreground">&quot;{debouncedQuery}&quot;</span>.
              <br />
              <span className="mt-1 block text-[11px] text-muted-foreground/70">
                Try searching by contest ID (e.g., 2041G), problem name, tag, or rating.
              </span>
            </CommandEmpty>
          )}

          {/* Search Results */}
          {!isLoading && debouncedQuery && results.length > 0 && (
            <CommandGroup heading={`Search Results (${results.length})`}>
              {results.map((prob) => {
                const meta = getRatingBadgeColor(prob.rating)
                const isCurrent =
                  currentProblem &&
                  (prob.problem_id === currentProblem.id ||
                    (prob.contest_id === currentProblem.contest_id &&
                      prob.index === currentProblem.index))

                return (
                  <CommandItem
                    key={`${prob.contest_id}_${prob.index}_${prob.problem_id}`}
                    value={`${prob.id} ${prob.title} ${prob.rating || ""} ${prob.tags.join(" ")}`}
                    onSelect={() => handleSelect(prob)}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-xs transition-colors hover:bg-surface-2"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="shrink-0 rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] font-bold text-foreground">
                        {prob.id}
                      </span>
                      <div className="flex min-w-0 flex-col">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium text-foreground">{prob.title}</span>
                          {isCurrent && (
                            <Badge
                              variant="outline"
                              className="h-4 border-primary/30 px-1 text-[9px] text-primary"
                            >
                              Current
                            </Badge>
                          )}
                        </div>
                        {prob.tags && prob.tags.length > 0 && (
                          <div className="mt-0.5 flex flex-wrap gap-1">
                            {prob.tags.slice(0, 3).map((tag) => (
                              <span key={tag} className="text-[10px] text-muted-foreground">
                                #{tag}
                              </span>
                            ))}
                            {prob.tags.length > 3 && (
                              <span className="text-[10px] text-muted-foreground">
                                +{prob.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {prob.status === "solved" && (
                        <Badge
                          variant="outline"
                          className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-400"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Solved
                        </Badge>
                      )}
                      {prob.status === "attempted" && (
                        <Badge
                          variant="outline"
                          className="gap-1 border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-400"
                        >
                          <CircleDot className="h-3 w-3" />
                          Attempted
                        </Badge>
                      )}

                      {prob.rating ? (
                        <Badge
                          variant="outline"
                          className={`font-mono text-[10px] font-semibold ${meta.badgeClass}`}
                        >
                          {prob.rating}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          Unrated
                        </Badge>
                      )}
                    </div>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          )}

          {/* Recent Problems (shown when search is empty) */}
          {!debouncedQuery && recentProblems.length > 0 && (
            <CommandGroup heading="Recent Problems">
              {recentProblems.map((prob) => {
                const meta = getRatingBadgeColor(prob.rating)
                const isCurrent =
                  currentProblem &&
                  (prob.problem_id === currentProblem.id ||
                    (prob.contest_id === currentProblem.contest_id &&
                      prob.index === currentProblem.index))

                return (
                  <CommandItem
                    key={`recent_${prob.contest_id}_${prob.index}_${prob.problem_id}`}
                    value={`${prob.id} ${prob.title} ${prob.rating || ""} ${prob.tags.join(" ")}`}
                    onSelect={() => handleSelect(prob)}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-xs transition-colors hover:bg-surface-2"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="shrink-0 rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] font-bold text-foreground">
                        {prob.id}
                      </span>
                      <span className="truncate font-medium text-foreground">{prob.title}</span>
                      {isCurrent && (
                        <Badge
                          variant="outline"
                          className="h-4 border-primary/30 px-1 text-[9px] text-primary"
                        >
                          Current
                        </Badge>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {prob.rating ? (
                        <Badge
                          variant="outline"
                          className={`font-mono text-[10px] font-semibold ${meta.badgeClass}`}
                        >
                          {prob.rating}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          Unrated
                        </Badge>
                      )}
                    </div>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
