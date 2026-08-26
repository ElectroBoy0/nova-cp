"use client"

import { useState, useMemo } from "react"
import { BarChart3, Target, Award, Flame, Sparkles, TrendingUp, Compass } from "lucide-react"
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
  gradient: string
  glowColor: string
  badgeClass: string
  tierInsight: string
}

function getRatingTierMeta(rating: number | string): {
  tierName: string
  color: string
  gradient: string
  glowColor: string
  badgeClass: string
  tierInsight: string
} {
  if (rating === "Unrated" || (typeof rating === "string" && isNaN(Number(rating)))) {
    return {
      tierName: "Unrated",
      color: "#64748b",
      gradient: "from-slate-600 to-slate-800",
      glowColor: "rgba(100, 116, 139, 0.35)",
      badgeClass: "bg-slate-500/10 text-slate-400 border-slate-500/20",
      tierInsight: "Practice and unrated contest challenges",
    }
  }

  const r = Number(rating)
  if (r < 1200) {
    return {
      tierName: "Newbie",
      color: "#94a3b8",
      gradient: "from-slate-400 to-slate-600",
      glowColor: "rgba(148, 163, 184, 0.4)",
      badgeClass: "bg-slate-500/10 text-slate-300 border-slate-500/25",
      tierInsight: "Foundational speed, greedy logic, and basic math implementation",
    }
  }
  if (r < 1400) {
    return {
      tierName: "Pupil",
      color: "#22c55e",
      gradient: "from-emerald-400 to-emerald-600",
      glowColor: "rgba(34, 197, 94, 0.45)",
      badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
      tierInsight: "Intermediate patterns, binary search, and constructive algorithms",
    }
  }
  if (r < 1600) {
    return {
      tierName: "Specialist",
      color: "#06b6d4",
      gradient: "from-cyan-400 to-cyan-600",
      glowColor: "rgba(6, 182, 212, 0.45)",
      badgeClass: "bg-cyan-500/10 text-cyan-400 border-cyan-500/25",
      tierInsight: "Dynamic programming, number theory, and advanced two-pointers",
    }
  }
  if (r < 1900) {
    return {
      tierName: "Expert",
      color: "#3b82f6",
      gradient: "from-blue-400 to-blue-600",
      glowColor: "rgba(59, 130, 246, 0.45)",
      badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/25",
      tierInsight: "Trees, graph algorithms, segment trees, and deep combinatorics",
    }
  }
  if (r < 2100) {
    return {
      tierName: "Candidate Master",
      color: "#a855f7",
      gradient: "from-purple-400 to-purple-600",
      glowColor: "rgba(168, 85, 247, 0.45)",
      badgeClass: "bg-purple-500/10 text-purple-400 border-purple-500/25",
      tierInsight: "Advanced data structures, heavy recursion, and flow networks",
    }
  }
  if (r < 2300) {
    return {
      tierName: "Master",
      color: "#f97316",
      gradient: "from-orange-400 to-orange-600",
      glowColor: "rgba(249, 115, 22, 0.45)",
      badgeClass: "bg-orange-500/10 text-orange-400 border-orange-500/25",
      tierInsight: "Competitive master-level problem solving and math olympiad logic",
    }
  }
  if (r < 2400) {
    return {
      tierName: "International Master",
      color: "#ea580c",
      gradient: "from-amber-500 to-orange-700",
      glowColor: "rgba(234, 88, 12, 0.45)",
      badgeClass: "bg-orange-600/10 text-orange-500 border-orange-600/25",
      tierInsight: "High-level algorithmic research and elite speed execution",
    }
  }
  return {
    tierName: "Grandmaster",
    color: "#ef4444",
    gradient: "from-rose-500 to-red-700",
    glowColor: "rgba(239, 68, 68, 0.45)",
    badgeClass: "bg-rose-500/10 text-rose-400 border-rose-500/25",
    tierInsight: "Grandmaster echelon: near-flawless reasoning and optimization",
  }
}

export function RatingDistributionChart({
  distribution = {},
  totalSolved = 0,
}: RatingDistributionChartProps) {
  const [hoveredBracket, setHoveredBracket] = useState<BracketData | null>(null)

  // Parse, sort and normalize distribution data
  const { brackets, maxCount, calculatedTotal, stats, tierTotals } = useMemo(() => {
    const entries = Object.entries(distribution || {})
    if (entries.length === 0) {
      return {
        brackets: [],
        maxCount: 0,
        calculatedTotal: 0,
        stats: { hardest: null, median: null, sweetSpot: null, ratedSolves: 0 },
        tierTotals: [],
      }
    }

    // Sort numerically ascending
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
      const percentage = parseFloat(((count / calculatedTotal) * 100).toFixed(1))
      const meta = getRatingTierMeta(ratingStr)

      return {
        ratingStr,
        ratingNum,
        count,
        percentage,
        tierName: meta.tierName,
        color: meta.color,
        gradient: meta.gradient,
        glowColor: meta.glowColor,
        badgeClass: meta.badgeClass,
        tierInsight: meta.tierInsight,
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

    // Tier aggregations for summary ribbon
    const tierMap = new Map<string, { count: number; color: string }>()
    brackets.forEach((b) => {
      const existing = tierMap.get(b.tierName) || { count: 0, color: b.color }
      existing.count += b.count
      tierMap.set(b.tierName, existing)
    })

    const tierTotals = Array.from(tierMap.entries()).map(([tier, data]) => ({
      tier,
      count: data.count,
      color: data.color,
      pct: parseFloat(((data.count / calculatedTotal) * 100).toFixed(1)),
    }))

    return {
      brackets,
      maxCount,
      calculatedTotal,
      stats: { hardest, median, sweetSpot, ratedSolves },
      tierTotals,
    }
  }, [distribution, totalSolved])

  if (brackets.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-dashed border-border/80 bg-card/60 p-8 text-center backdrop-blur-md">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <BarChart3 className="h-6 w-6" />
        </div>
        <h4 className="text-base font-semibold text-foreground">
          No Difficulty Spectrum Available
        </h4>
        <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
          Link your Codeforces handle and sync your submissions to unlock your problem difficulty
          spectrum.
        </p>
      </div>
    )
  }

  // Active hover data or default to top sweet spot
  const activeFocus = hoveredBracket || stats.sweetSpot

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-b from-card/95 via-card/85 to-card/60 p-6 shadow-xl backdrop-blur-xl transition-all">
      {/* Background ambient accent glow */}
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full blur-3xl transition-all duration-700"
        style={{
          backgroundColor: activeFocus?.glowColor || "rgba(148, 163, 184, 0.15)",
        }}
      />

      {/* Header & KPI Summary Badges */}
      <div className="relative z-10 mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-sm">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight text-foreground">
                  Difficulty Spectrum
                </h3>
                <Badge
                  variant="outline"
                  className="border-primary/20 bg-primary/10 font-mono text-[11px] font-semibold text-primary"
                >
                  <Sparkles className="mr-1 h-3 w-3" />
                  {calculatedTotal} Solves Analyzed
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Distribution of solved problems grouped by official Codeforces rating tier.
              </p>
            </div>
          </div>
        </div>

        {/* Quick KPI Badges */}
        <div className="flex flex-wrap items-center gap-2">
          {stats.hardest && (
            <div className="flex items-center gap-1.5 rounded-xl border border-purple-500/20 bg-purple-500/10 px-3 py-1.5 text-xs shadow-sm">
              <Award className="h-4 w-4 text-purple-400" />
              <span className="text-muted-foreground">Hardest Solved:</span>
              <span className="font-mono font-bold text-purple-300">{stats.hardest}</span>
            </div>
          )}

          {stats.median && (
            <div className="flex items-center gap-1.5 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-xs shadow-sm">
              <Target className="h-4 w-4 text-cyan-400" />
              <span className="text-muted-foreground">Median:</span>
              <span className="font-mono font-bold text-cyan-300">{stats.median}</span>
            </div>
          )}

          {stats.sweetSpot && (
            <div className="flex items-center gap-1.5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs shadow-sm">
              <Flame className="h-4 w-4 text-amber-400" />
              <span className="text-muted-foreground">Top Focus:</span>
              <span className="font-mono font-bold text-amber-300">
                {stats.sweetSpot.ratingStr} ({stats.sweetSpot.count} solves)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Floating Insight Bar */}
      <div className="relative z-10 mb-6 flex flex-col justify-between gap-2 rounded-xl border border-border/60 bg-surface-1/70 px-4 py-2.5 backdrop-blur-md sm:flex-row sm:items-center">
        {activeFocus ? (
          <>
            <div className="flex items-center gap-2.5">
              <span
                className="h-3 w-3 rounded-full shadow-sm"
                style={{
                  backgroundColor: activeFocus.color,
                  boxShadow: `0 0 10px ${activeFocus.color}`,
                }}
              />
              <span className="font-mono text-sm font-bold text-foreground">
                Rating {activeFocus.ratingStr}
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] font-medium ${activeFocus.badgeClass}`}
              >
                {activeFocus.tierName}
              </Badge>
              <span className="hidden text-xs text-muted-foreground sm:inline">•</span>
              <span className="hidden text-xs text-muted-foreground sm:inline">
                {activeFocus.tierInsight}
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="font-bold text-foreground">{activeFocus.count} problems</span>
              <span className="rounded bg-surface-2 px-1.5 py-0.5 text-muted-foreground">
                {activeFocus.percentage}% of portfolio
              </span>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Compass className="h-4 w-4 text-primary" />
            <span>
              Hover over any difficulty bar to view solve volume, tier, and training insights.
            </span>
          </div>
        )}
      </div>

      {/* Main Histogram Bar Chart */}
      <div className="relative z-10 pt-4">
        {/* Horizontal Background Grid Reference Lines */}
        <div className="pointer-events-none absolute inset-x-0 bottom-12 top-4 flex flex-col justify-between opacity-15">
          <div className="border-b border-dashed border-foreground" />
          <div className="border-b border-dashed border-foreground" />
          <div className="border-b border-dashed border-foreground" />
          <div className="border-b border-foreground" />
        </div>

        {/* Bars Container */}
        <div className="relative flex h-60 items-end justify-between gap-3 overflow-x-auto px-2 pb-12 pt-4 sm:gap-4">
          {brackets.map((bracket) => {
            // Fixed pixel height calculation: range between 24px (min visible) to 160px (max height)
            const barHeightPx = Math.max(24, Math.round((bracket.count / maxCount) * 150))
            const isHovered = hoveredBracket?.ratingStr === bracket.ratingStr
            const isPeak = bracket.ratingStr === stats.sweetSpot?.ratingStr

            return (
              <div
                key={bracket.ratingStr}
                onMouseEnter={() => setHoveredBracket(bracket)}
                onMouseLeave={() => setHoveredBracket(null)}
                className="group relative flex flex-1 cursor-pointer flex-col items-center justify-end transition-all"
                style={{ minWidth: "44px" }}
              >
                {/* Solves Count Badge Floating above Bar */}
                <div
                  className={`mb-2 flex items-center justify-center rounded-full px-2 py-0.5 font-mono text-xs transition-all duration-200 ${
                    isHovered
                      ? "scale-110 border border-foreground/30 bg-foreground font-bold text-background shadow-lg"
                      : isPeak
                        ? "border border-amber-500/40 bg-amber-500/20 font-bold text-amber-300"
                        : "border border-border/60 bg-surface-2/90 font-medium text-muted-foreground group-hover:border-foreground/20 group-hover:text-foreground"
                  }`}
                >
                  {bracket.count}
                </div>

                {/* Vertical Bar with Linear Gradient Fill & Glow */}
                <div
                  className={`w-full max-w-[48px] rounded-t-xl bg-gradient-to-t ${bracket.gradient} transition-all duration-300 group-hover:brightness-125`}
                  style={{
                    height: `${barHeightPx}px`,
                    boxShadow: isHovered
                      ? `0 0 24px ${bracket.glowColor}, 0 0 8px ${bracket.color}`
                      : `0 4px 12px ${bracket.glowColor}`,
                    opacity: hoveredBracket && !isHovered ? 0.4 : 1,
                    transform: isHovered ? "translateY(-4px)" : "none",
                  }}
                >
                  {/* Glass Shimmer Highlight on top edge */}
                  <div className="h-1.5 w-full rounded-t-xl bg-white/30" />
                </div>

                {/* X-Axis Label & Percentage (Always Visible) */}
                <div className="absolute -bottom-10 flex flex-col items-center">
                  <span
                    className={`font-mono text-xs transition-colors ${
                      isHovered
                        ? "font-bold text-foreground"
                        : isPeak
                          ? "font-semibold text-amber-300"
                          : "font-medium text-muted-foreground group-hover:text-foreground"
                    }`}
                  >
                    {bracket.ratingStr}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground/80">
                    {bracket.percentage}%
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Tier Breakdown Ribbon at Bottom */}
      <div className="relative z-10 mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <TrendingUp className="h-3.5 w-3.5 text-primary" />
          <span className="font-semibold text-foreground">Tier Breakdown:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {tierTotals.map((t) => (
            <div
              key={t.tier}
              className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-surface-1/60 px-2.5 py-1 text-xs"
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
              <span className="text-muted-foreground">{t.tier}:</span>
              <span className="font-mono font-semibold text-foreground">
                {t.count} ({t.pct}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
