"use client"

import React, { useState, useMemo } from "react"
import Link from "next/link"
import { Layers, Search, ArrowRight, BookOpen, LayoutGrid, List, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface TopicStats {
  solved: number
  attempts: number
}

interface TopicMasteryChartProps {
  topicMastery?: Record<string, TopicStats>
  isLoading?: boolean
}

type SortOption = "solved_desc" | "accuracy_desc" | "accuracy_asc" | "name_asc"
type CategoryOption = "all" | "core" | "algorithms" | "math_spec"

const TOPIC_CATEGORIES: Record<string, CategoryOption> = {
  // Core
  greedy: "core",
  implementation: "core",
  "brute force": "core",
  sortings: "core",
  "constructive algorithms": "core",
  strings: "core",
  "two pointers": "core",

  // Algorithms & DS
  dp: "algorithms",
  "dynamic programming": "algorithms",
  graphs: "algorithms",
  trees: "algorithms",
  "data structures": "algorithms",
  "binary search": "algorithms",
  "dfs and similar": "algorithms",
  "shortest paths": "algorithms",
  dsu: "algorithms",

  // Math & Specialized
  math: "math_spec",
  "number theory": "math_spec",
  combinatorics: "math_spec",
  probabilities: "math_spec",
  geometry: "math_spec",
  bitmasks: "math_spec",
  games: "math_spec",
  matrices: "math_spec",
}

function getMasteryLevel(
  solved: number,
  accuracy: number
): {
  label: string
  color: string
} {
  if (solved >= 15 || (solved >= 8 && accuracy >= 75)) {
    return {
      label: "Mastered",
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    }
  }
  if (solved >= 6 || (solved >= 3 && accuracy >= 60)) {
    return {
      label: "Proficient",
      color: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    }
  }
  if (solved >= 2 || accuracy >= 40) {
    return {
      label: "Practicing",
      color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    }
  }
  return {
    label: "Developing",
    color: "text-muted-foreground bg-surface-2 border-border/60",
  }
}

export function TopicMasteryChart({ topicMastery, isLoading }: TopicMasteryChartProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [sortOption, setSortOption] = useState<SortOption>("solved_desc")
  const [selectedCategory, setSelectedCategory] = useState<CategoryOption>("all")
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")

  const rawEntries = useMemo(() => {
    if (!topicMastery) return []
    return Object.entries(topicMastery).map(([topic, stats]) => {
      const accuracy = stats.attempts > 0 ? Math.round((stats.solved / stats.attempts) * 100) : 0
      const category = TOPIC_CATEGORIES[topic.toLowerCase()] || "core"
      return {
        topic,
        solved: stats.solved,
        attempts: stats.attempts,
        accuracy,
        category,
      }
    })
  }, [topicMastery])

  // Summary Metrics with unified, cohesive typography
  const summary = useMemo(() => {
    if (rawEntries.length === 0) return null

    const totalSolved = rawEntries.reduce((acc, curr) => acc + curr.solved, 0)
    const totalAttempts = rawEntries.reduce((acc, curr) => acc + curr.attempts, 0)
    const overallAccuracy = totalAttempts > 0 ? Math.round((totalSolved / totalAttempts) * 100) : 0

    // Top Solved Topic
    const topSolved = [...rawEntries].sort((a, b) => b.solved - a.solved)[0]

    // Highest Accuracy Topic with at least 3 attempts
    const validAccuracyList = rawEntries.filter((t) => t.attempts >= 3)
    const topAccuracy =
      validAccuracyList.length > 0
        ? [...validAccuracyList].sort((a, b) => b.accuracy - a.accuracy)[0]
        : rawEntries[0]

    return {
      totalTopics: rawEntries.length,
      totalSolved,
      overallAccuracy,
      topSolvedTopic: topSolved?.topic,
      topSolvedCount: topSolved?.solved,
      topAccuracyTopic: topAccuracy?.topic,
      topAccuracyPercent: topAccuracy?.accuracy,
    }
  }, [rawEntries])

  // Filtered & Sorted list
  const filteredEntries = useMemo(() => {
    let list = rawEntries

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter((item) => item.topic.toLowerCase().includes(q))
    }

    // Category filter
    if (selectedCategory !== "all") {
      list = list.filter((item) => item.category === selectedCategory)
    }

    // Sorting
    return [...list].sort((a, b) => {
      switch (sortOption) {
        case "solved_desc":
          return b.solved - a.solved || b.accuracy - a.accuracy
        case "accuracy_desc":
          return b.accuracy - a.accuracy || b.solved - a.solved
        case "accuracy_asc":
          return a.accuracy - b.accuracy || a.solved - b.solved
        case "name_asc":
          return a.topic.localeCompare(b.topic)
        default:
          return b.solved - a.solved
      }
    })
  }, [rawEntries, searchQuery, selectedCategory, sortOption])

  return (
    <div className="shadow-xs rounded-xl border border-border bg-card p-5 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-border/60 pb-5 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Layers className="h-4 w-4" />
            </div>
            <h3 className="text-base font-semibold text-foreground">Topic Mastery & Skill Map</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Multi-domain problem performance, accuracy rates, and category depth.
          </p>
        </div>

        {/* Search & Layout Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[180px] sm:w-56">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter topics (dp, math)..."
              className="h-8 border-border bg-surface-2 pl-8 text-xs placeholder:text-muted-foreground/60"
            />
          </div>

          {/* Sort Selector */}
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
            className="h-8 rounded-md border border-border bg-surface-2 px-2.5 font-mono text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="solved_desc">Most Solved</option>
            <option value="accuracy_desc">Highest Accuracy</option>
            <option value="accuracy_asc">Needs Practice</option>
            <option value="name_asc">Alphabetical</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex rounded-md border border-border bg-surface-2 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn(
                "rounded p-1.5 text-xs transition-colors",
                viewMode === "list"
                  ? "bg-surface-3 shadow-xs text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Detailed List View"
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={cn(
                "rounded p-1.5 text-xs transition-colors",
                viewMode === "grid"
                  ? "bg-surface-3 shadow-xs text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Grid Card View"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Cohesive Summary KPI Ribbon */}
      {summary && (
        <div className="my-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-border/50 bg-surface-1 p-3.5">
            <div className="text-[11px] font-medium text-muted-foreground">Topics Explored</div>
            <div className="mt-1 font-mono text-lg font-bold text-foreground">
              {summary.totalTopics}
            </div>
            <div className="text-[10px] text-muted-foreground">Active Categories</div>
          </div>

          <div className="rounded-lg border border-border/50 bg-surface-1 p-3.5">
            <div className="text-[11px] font-medium text-muted-foreground">Top Domain</div>
            <div className="mt-1 truncate font-mono text-lg font-bold capitalize text-foreground">
              {summary.topSolvedTopic}
            </div>
            <div className="text-[10px] text-muted-foreground">{summary.topSolvedCount} solved</div>
          </div>

          <div className="rounded-lg border border-border/50 bg-surface-1 p-3.5">
            <div className="text-[11px] font-medium text-muted-foreground">Best Accuracy</div>
            <div className="mt-1 truncate font-mono text-lg font-bold text-foreground">
              {summary.topAccuracyPercent}%
            </div>
            <div className="truncate text-[10px] capitalize text-muted-foreground">
              {summary.topAccuracyTopic}
            </div>
          </div>

          <div className="rounded-lg border border-border/50 bg-surface-1 p-3.5">
            <div className="text-[11px] font-medium text-muted-foreground">Overall Solve Rate</div>
            <div className="mt-1 font-mono text-lg font-bold text-foreground">
              {summary.overallAccuracy}%
            </div>
            <div className="text-[10px] text-muted-foreground">
              {summary.totalSolved} total solved
            </div>
          </div>
        </div>
      )}

      {/* Category Pills Filter */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {[
          { id: "all", label: "All Topics" },
          { id: "core", label: "Core & Fundamentals" },
          { id: "algorithms", label: "Algorithms & Structures" },
          { id: "math_spec", label: "Math & Specialized" },
        ].map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.id as CategoryOption)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              selectedCategory === cat.id
                ? "border-primary bg-primary/10 text-primary"
                : "hover:bg-surface-3 border-border/60 bg-surface-2 text-muted-foreground hover:text-foreground"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Content Rendering */}
      {isLoading ? (
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-2 flex-1 rounded-full" />
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
          <BookOpen className="h-10 w-10 text-muted-foreground/30" />
          <p className="mt-2 text-sm font-semibold text-foreground">No matching topics found</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {searchQuery
              ? `No topics match "${searchQuery}".`
              : "Solve more problems to build your topic mastery tree!"}
          </p>
        </div>
      ) : viewMode === "list" ? (
        /* Detailed List View */
        <div className="divide-y divide-border/40">
          {filteredEntries.map((item) => {
            const mastery = getMasteryLevel(item.solved, item.accuracy)

            return (
              <div
                key={item.topic}
                className="group flex flex-col gap-2 rounded-lg py-3 transition-colors hover:bg-surface-1/60 sm:flex-row sm:items-center sm:gap-4 sm:px-2"
              >
                {/* Topic Name & Badge */}
                <div className="flex min-w-[200px] items-center gap-2 sm:w-52">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground/60" />
                  <Link
                    href={`/problems?tags=${encodeURIComponent(item.topic)}`}
                    className="truncate text-xs font-semibold capitalize text-foreground transition-colors hover:text-primary"
                    title={`Practice ${item.topic} problems`}
                  >
                    {item.topic}
                  </Link>
                  <Badge
                    variant="outline"
                    className={cn("h-4 px-1 py-0 font-mono text-[9px] uppercase", mastery.color)}
                  >
                    {mastery.label}
                  </Badge>
                </div>

                {/* Consistent NovaCP Indigo/Purple Accuracy Bar */}
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-mono text-muted-foreground">
                      Accuracy:{" "}
                      <span className="font-semibold text-foreground">{item.accuracy}%</span>
                    </span>
                    <span className="font-mono text-xs font-semibold text-foreground">
                      {item.solved}{" "}
                      <span className="font-normal text-muted-foreground">
                        / {item.attempts} solves
                      </span>
                    </span>
                  </div>

                  <div className="relative h-2 w-full overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{
                        width: `${Math.max(item.accuracy, 3)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Direct Practice Link */}
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="hidden h-7 gap-1 px-2 text-[11px] text-muted-foreground opacity-0 transition-all hover:text-primary group-hover:opacity-100 sm:inline-flex"
                >
                  <Link href={`/problems?tags=${encodeURIComponent(item.topic)}`}>
                    Practice
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </Button>
              </div>
            )
          })}
        </div>
      ) : (
        /* Grid Card View */
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredEntries.map((item) => {
            const mastery = getMasteryLevel(item.solved, item.accuracy)

            return (
              <div
                key={item.topic}
                className="group relative flex flex-col justify-between rounded-xl border border-border/60 bg-surface-1 p-4 transition-all hover:border-primary/40 hover:bg-surface-2"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Tag className="h-3.5 w-3.5 text-muted-foreground/60" />
                      <h4 className="text-sm font-semibold capitalize text-foreground">
                        {item.topic}
                      </h4>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn("px-1.5 py-0.5 font-mono text-[9px]", mastery.color)}
                    >
                      {mastery.label}
                    </Badge>
                  </div>

                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-center justify-between font-mono text-xs">
                      <span className="text-muted-foreground">Accuracy</span>
                      <span className="font-bold text-foreground">{item.accuracy}%</span>
                    </div>

                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{
                          width: `${Math.max(item.accuracy, 4)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3 text-xs">
                  <span className="font-mono text-muted-foreground">
                    <strong className="font-semibold text-foreground">{item.solved}</strong> /{" "}
                    {item.attempts} Solved
                  </span>

                  <Link
                    href={`/problems?tags=${encodeURIComponent(item.topic)}`}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                  >
                    Solve <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
