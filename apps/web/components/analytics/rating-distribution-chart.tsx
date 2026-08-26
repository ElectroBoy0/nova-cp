"use client"

import { useState, useMemo } from "react"
import { BarChart2, Target, Award, Flame, CheckCircle, HelpCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface RatingDistributionChartProps {
  distribution?: Record<string, number>
  totalSolved?: number
}

interface BracketData {
  ratingStr: string
  ratingNum: number
  count: number
  percentage: number
  tierName: string
  color: string
  glowColor: string
  badgeClass: string
}

function getRatingTierMeta(rating: number | string): {
  tierName: string
  color: string
  glowColor: string
  badgeClass: string
} {
  if (rating === "Unrated" || (typeof rating === "string" && isNaN(Number(rating)))) {
    return {
      tierName: "Unrated",
      color: "#64748b",
      glowColor: "rgba(100, 116, 139, 0.2)",
      badgeClass: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    }
  }

  const r = Number(rating)
  if (r < 1200) {
    return {
      tierName: "Newbie",
      color: "#94a3b8",
      glowColor: "rgba(148, 163, 184, 0.2)",
      badgeClass: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    }
  }
  if (r < 1400) {
    return {
      tierName: "Pupil",
      color: "#22c55e",
      glowColor: "rgba(34, 197, 94, 0.25)",
      badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    }
  }
  if (r < 1600) {
    return {
      tierName: "Specialist",
      color: "#06b6d4",
      glowColor: "rgba(6, 182, 212, 0.25)",
      badgeClass: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    }
  }
  if (r < 1900) {
    return {
      tierName: "Expert",
      color: "#3b82f6",
      glowColor: "rgba(59, 130, 246, 0.25)",
      badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    }
  }
  if (r < 2100) {
    return {
      tierName: "Candidate Master",
      color: "#a855f7",
      glowColor: "rgba(168, 85, 247, 0.25)",
      badgeClass: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    }
  }
  if (r < 2300) {
    return {
      tierName: "Master",
      color: "#f97316",
      glowColor: "rgba(249, 115, 22, 0.25)",
      badgeClass: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    }
  }
  if (r < 2400) {
    return {
      tierName: "International Master",
      color: "#ea580c",
      glowColor: "rgba(234, 88, 12, 0.25)",
      badgeClass: "bg-orange-600/10 text-orange-500 border-orange-600/20",
    }
  }
  return {
    tierName: "Grandmaster",
    color: "#ef4444",
    glowColor: "rgba(239, 68, 68, 0.25)",
    badgeClass: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  }
}

export function RatingDistributionChart({
  distribution = {},
  totalSolved = 0,
}: RatingDistributionChartProps) {
  const [hoveredBracket, setHoveredBracket] = useState<BracketData | null>(null)

  // Parse, sort and normalize distribution data
  const { brackets, maxCount, calculatedTotal, stats } = useMemo(() => {
    const entries = Object.entries(distribution || {})
    if (entries.length === 0) {
      return {
        brackets: [],
        maxCount: 0,
        calculatedTotal: 0,
        stats: { hardest: null, median: null, sweetSpot: null, ratedSolves: 0 },
      }
    }

    // Sort: numerical ratings ascending, "Unrated" at the end
    const sortedEntries = entries.sort((a, b) => {
      const aNum = Number(a[0])
      const bNum = Number(b[0])
      if (isNaN(aNum)) return 1
      if (isNaN(bNum)) return -1
      return aNum - bNum
    })

    const calculatedTotal = entries.reduce((acc, [, count]) => acc + count, 0) || totalSolved || 1
    const maxCount = Math.max(...entries.map(([, count]) => count), 1)

    const brackets: BracketData[] = sortedEntries.map(([ratingStr, count]) => {
      const ratingNum = isNaN(Number(ratingStr)) ? 0 : Number(ratingStr)
      const percentage = Math.round((count / calculatedTotal) * 100)
      const meta = getRatingTierMeta(ratingStr)

      return {
        ratingStr,
        ratingNum,
        count,
        percentage,
        tierName: meta.tierName,
        color: meta.color,
        glowColor: meta.glowColor,
        badgeClass: meta.badgeClass,
      }
    })

    // Calculate Summary Stats
    const ratedBrackets = brackets.filter((b) => b.ratingStr !== "Unrated" && b.ratingNum > 0)
    const ratedSolves = ratedBrackets.reduce((acc, b) => acc + b.count, 0)
    const hardest =
      ratedBrackets.length > 0 ? Math.max(...ratedBrackets.map((b) => b.ratingNum)) : null

    // Sweet spot (tier with max solves)
    const sweetSpot =
      brackets.length > 0 ? [...brackets].sort((a, b) => b.count - a.count)[0] : null

    // Median Difficulty
    let median: number | null = null
    if (ratedSolves > 0) {
      const allRatedValues: number[] = []
      ratedBrackets.forEach((b) => {
        for (let i = 0; i < b.count; i++) {
          allRatedValues.push(b.ratingNum)
        }
      })
      allRatedValues.sort((a, b) => a - b)
      const mid = Math.floor(allRatedValues.length / 2)
      median = allRatedValues[mid] ?? null
    }

    return {
      brackets,
      maxCount,
      calculatedTotal,
      stats: { hardest, median, sweetSpot, ratedSolves },
    }
  }, [distribution, totalSolved])

  if (brackets.length === 0) {
    return (
      <div className="flex h-56 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-6 text-center">
        <BarChart2 className="mb-3 h-10 w-10 text-muted-foreground/40" />
        <h4 className="text-base font-medium text-foreground">No Difficulty Spectrum Available</h4>
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
          Sync your Codeforces submissions to unlock your problem difficulty rating distribution.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      {/* Header & KPIs */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">Difficulty Spectrum</h3>
            <Badge variant="outline" className="font-mono text-[11px]">
              {calculatedTotal} Solves Analyzed
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Distribution of solved problems grouped by official Codeforces rating tier.
          </p>
        </div>

        {/* Quick KPI Badges */}
        <div className="flex flex-wrap items-center gap-2">
          {stats.hardest && (
            <div className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-surface-1/80 px-2.5 py-1 text-xs">
              <Award className="h-3.5 w-3.5 text-purple-400" />
              <span className="text-muted-foreground">Hardest:</span>
              <span className="font-mono font-bold text-foreground">{stats.hardest}</span>
            </div>
          )}

          {stats.median && (
            <div className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-surface-1/80 px-2.5 py-1 text-xs">
              <Target className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-muted-foreground">Median:</span>
              <span className="font-mono font-bold text-foreground">{stats.median}</span>
            </div>
          )}

          {stats.sweetSpot && (
            <div className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-surface-1/80 px-2.5 py-1 text-xs">
              <Flame className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-muted-foreground">Top Tier:</span>
              <span className="font-mono font-bold text-foreground">
                {stats.sweetSpot.ratingStr} ({stats.sweetSpot.count})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Histogram Bar Chart */}
      <div className="relative mt-4">
        {/* Hover Information Card */}
        <div className="mb-4 flex min-h-[32px] items-center justify-between rounded-lg border border-border/60 bg-surface-1/50 px-3 py-1.5 text-xs">
          {hoveredBracket ? (
            <>
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: hoveredBracket.color }}
                />
                <span className="font-mono font-semibold text-foreground">
                  Rating {hoveredBracket.ratingStr}
                </span>
                <span className="text-muted-foreground">({hoveredBracket.tierName})</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-primary">
                  {hoveredBracket.count} solved
                </span>
                <span className="text-muted-foreground">
                  ({hoveredBracket.percentage}% of total)
                </span>
              </div>
            </>
          ) : (
            <span className="text-muted-foreground">
              Hover over any rating bar below to inspect solve frequency and tier classification.
            </span>
          )}
        </div>

        {/* Bars Container */}
        <div className="flex h-56 items-end gap-2 overflow-x-auto pb-6 pt-6 sm:gap-3">
          {brackets.map((bracket) => {
            const heightPercent = Math.max(8, Math.round((bracket.count / maxCount) * 100))
            const isHovered = hoveredBracket?.ratingStr === bracket.ratingStr

            return (
              <div
                key={bracket.ratingStr}
                onMouseEnter={() => setHoveredBracket(bracket)}
                onMouseLeave={() => setHoveredBracket(null)}
                className="group relative flex flex-1 flex-col items-center justify-end"
                style={{ minWidth: "38px" }}
              >
                {/* Count Pill above bar */}
                <div
                  className={`mb-1.5 font-mono text-[11px] font-semibold transition-all duration-200 ${
                    isHovered
                      ? "scale-110 font-bold text-foreground"
                      : "text-muted-foreground group-hover:text-foreground"
                  }`}
                >
                  {bracket.count}
                </div>

                {/* Vertical Bar */}
                <div
                  className="w-full rounded-t-md transition-all duration-300 group-hover:brightness-125"
                  style={{
                    height: `${heightPercent}%`,
                    backgroundColor: bracket.color,
                    boxShadow: isHovered
                      ? `0 0 16px ${bracket.glowColor}, 0 0 4px ${bracket.color}`
                      : `0 0 8px ${bracket.glowColor}`,
                    opacity: hoveredBracket && !isHovered ? 0.45 : 1,
                  }}
                />

                {/* X-Axis Label */}
                <div className="absolute -bottom-6 flex flex-col items-center">
                  <span
                    className={`font-mono text-[11px] transition-colors ${
                      isHovered ? "font-bold text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {bracket.ratingStr}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4 border-t border-border/60 pt-4 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#94a3b8]" />
          <span>Newbie (&lt;1200)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#22c55e]" />
          <span>Pupil (1200-1399)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#06b6d4]" />
          <span>Specialist (1400-1599)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#3b82f6]" />
          <span>Expert (1600-1899)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#a855f7]" />
          <span>Candidate Master (1900+)</span>
        </div>
      </div>
    </div>
  )
}
