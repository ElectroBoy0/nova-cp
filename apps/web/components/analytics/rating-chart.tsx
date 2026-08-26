"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Minus, Trophy, Activity, Award, Calendar } from "lucide-react"
import type { RatingHistoryItem } from "@/types/users"

interface RatingChartProps {
  history: (number | RatingHistoryItem)[]
  currentRating?: number | null
  maxRating?: number | null
}

interface NormalizedPoint {
  index: number
  rating: number
  oldRating: number
  change: number
  contestName: string
  rank: number | string
  dateStr: string
  x: number
  y: number
}

export function RatingChart({ history, currentRating, maxRating }: RatingChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<NormalizedPoint | null>(null)

  if (!history || history.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-6 text-center">
        <Activity className="mb-3 h-10 w-10 text-muted-foreground/40" />
        <h4 className="text-base font-medium text-foreground">No Rating History Yet</h4>
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
          Participate in Codeforces rated contests to track your rating progression over time.
        </p>
      </div>
    )
  }

  // SVG dimensions & margins
  const width = 850
  const height = 280
  const paddingLeft = 55
  const paddingRight = 30
  const paddingTop = 30
  const paddingBottom = 45

  const chartWidth = width - paddingLeft - paddingRight
  const chartHeight = height - paddingTop - paddingBottom

  // Normalize history items
  const normalizedData = history.map((item, idx) => {
    if (typeof item === "number") {
      const prevRating =
        idx > 0
          ? typeof history[idx - 1] === "number"
            ? (history[idx - 1] as number)
            : (history[idx - 1] as RatingHistoryItem).new_rating || 0
          : 0
      return {
        index: idx + 1,
        rating: item,
        oldRating: prevRating,
        change: item - prevRating,
        contestName: `Rated Contest #${idx + 1}`,
        rank: "—",
        dateStr: `Contest ${idx + 1}`,
      }
    } else {
      const rating = item.new_rating ?? 0
      const oldRating = item.old_rating ?? 0
      const change = rating - oldRating
      const dateStr = item.time
        ? new Date(item.time * 1000).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : `Contest ${idx + 1}`

      return {
        index: idx + 1,
        rating,
        oldRating,
        change,
        contestName: item.contest_name || `Contest #${idx + 1}`,
        rank: item.rank ? `#${item.rank}` : "—",
        dateStr,
      }
    }
  })

  // Calculate bounds
  const ratings = normalizedData.map((d) => d.rating)
  const minVal = Math.min(...ratings)
  const maxVal = Math.max(...ratings)
  const peakVal = maxRating ?? maxVal
  const latestVal = currentRating ?? ratings[ratings.length - 1] ?? 0
  const initialVal = normalizedData[0]?.oldRating || ratings[0] || 0
  const diff = latestVal - initialVal

  // Best rank calculation
  const numericRanks = normalizedData
    .map((d) => (typeof d.rank === "string" ? parseInt(d.rank.replace("#", ""), 10) : d.rank))
    .filter((r) => !isNaN(r))
  const bestRank = numericRanks.length > 0 ? Math.min(...numericRanks) : null

  // Y-axis range calculation
  const yMin = Math.max(0, Math.floor((minVal - 100) / 100) * 100)
  const yMax = Math.ceil((maxVal + 120) / 100) * 100
  const yRange = yMax - yMin || 1

  // Map to 2D coordinates
  const points: NormalizedPoint[] = normalizedData.map((d, idx) => {
    const x = paddingLeft + (idx / Math.max(1, normalizedData.length - 1)) * chartWidth
    const y = paddingTop + chartHeight - ((d.rating - yMin) / yRange) * chartHeight
    return { ...d, x, y }
  })

  // Build SVG path strings
  const linePath = points.reduce(
    (acc, p, idx) => `${acc} ${idx === 0 ? "M" : "L"} ${p.x},${p.y}`,
    ""
  )
  const lastPoint = points[points.length - 1]
  const firstPoint = points[0]
  const areaPath =
    firstPoint && lastPoint
      ? `${linePath} L ${lastPoint.x},${paddingTop + chartHeight} L ${firstPoint.x},${paddingTop + chartHeight} Z`
      : linePath

  // Threshold grid lines
  const thresholds = [800, 1200, 1400, 1600, 1900, 2100, 2400].filter((t) => t >= yMin && t <= yMax)

  // X-axis label step filter to prevent overlap
  const step = Math.max(1, Math.floor(points.length / 6))

  return (
    <div className="relative rounded-xl border border-border bg-card p-6 shadow-sm">
      {/* Header Summary */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">Rating Trajectory</h3>
            <Badge variant="secondary" className="font-mono text-xs">
              {history.length} {history.length === 1 ? "Contest" : "Contests"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Official Codeforces performance history with contest breakdown
          </p>
        </div>

        <div className="flex items-center gap-6">
          <div>
            <span className="block text-[10px] font-medium uppercase text-muted-foreground">
              Current
            </span>
            <span className="font-mono text-xl font-bold text-foreground">{latestVal}</span>
          </div>

          <div>
            <span className="block text-[10px] font-medium uppercase text-muted-foreground">
              Peak
            </span>
            <span className="flex items-center gap-1 font-mono text-xl font-bold text-emerald-400">
              <Trophy className="h-3.5 w-3.5" />
              {peakVal}
            </span>
          </div>

          {bestRank !== null && (
            <div>
              <span className="block text-[10px] font-medium uppercase text-muted-foreground">
                Best Rank
              </span>
              <span className="flex items-center gap-1 font-mono text-xl font-bold text-violet-400">
                <Award className="h-3.5 w-3.5" />#{bestRank}
              </span>
            </div>
          )}

          <div>
            <span className="block text-[10px] font-medium uppercase text-muted-foreground">
              Net Change
            </span>
            <span
              className={`flex items-center gap-0.5 font-mono text-sm font-semibold ${diff > 0 ? "text-emerald-400" : diff < 0 ? "text-rose-400" : "text-muted-foreground"}`}
            >
              {diff > 0 ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : diff < 0 ? (
                <TrendingDown className="h-3.5 w-3.5" />
              ) : (
                <Minus className="h-3.5 w-3.5" />
              )}
              {diff > 0 ? `+${diff}` : diff}
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Chart Container */}
      <div className="relative w-full">
        {/* HTML Tooltip Overlay (Absolute Positioned for perfect visibility) */}
        {hoveredPoint && (
          <div
            className="pointer-events-none absolute z-20 mb-3 -translate-x-1/2 -translate-y-full transform transition-all duration-75"
            style={{
              left: `${(hoveredPoint.x / width) * 100}%`,
              top: `${(hoveredPoint.y / height) * 100}%`,
            }}
          >
            <div className="min-w-[220px] max-w-[280px] space-y-1.5 rounded-lg border border-border bg-popover p-3 text-xs shadow-xl duration-100 animate-in fade-in zoom-in-95">
              <div className="line-clamp-2 font-semibold leading-snug text-foreground">
                {hoveredPoint.contestName}
              </div>
              <div className="flex items-center justify-between border-t border-border/50 pt-1 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {hoveredPoint.dateStr}
                </span>
                <span className="font-mono font-medium text-foreground">
                  Rank {hoveredPoint.rank}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Rating Change:</span>
                <div className="flex items-center gap-1 font-mono font-bold">
                  <span className="text-muted-foreground">{hoveredPoint.oldRating}</span>
                  <span>→</span>
                  <span className="text-foreground">{hoveredPoint.rating}</span>
                  <span
                    className={`rounded px-1 py-0.5 text-[10px] ${hoveredPoint.change >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}
                  >
                    {hoveredPoint.change >= 0 ? `+${hoveredPoint.change}` : hoveredPoint.change}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full select-none overflow-visible"
        >
          <defs>
            <linearGradient id="ratingGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(139, 92, 246)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="rgb(139, 92, 246)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines & Y-axis labels */}
          {thresholds.map((t) => {
            const y = paddingTop + chartHeight - ((t - yMin) / yRange) * chartHeight
            return (
              <g key={t}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.2)"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 12}
                  y={y + 4}
                  textAnchor="end"
                  fill="#ffffff"
                  fontSize="12"
                  fontWeight="600"
                  fontFamily="monospace"
                >
                  {t}
                </text>
              </g>
            )
          })}

          {/* X-axis labels (Dates / Contest numbers) */}
          {points.map((p, i) => {
            if (i % step !== 0 && i !== points.length - 1) return null
            return (
              <g key={i} transform={`translate(${p.x}, ${paddingTop + chartHeight + 24})`}>
                <text
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="12"
                  fontWeight="600"
                  fontFamily="monospace"
                >
                  #{p.index}
                </text>
              </g>
            )
          })}

          {/* Area Fill */}
          <path d={areaPath} fill="url(#ratingGradient)" />

          {/* Main Line Path */}
          <path
            d={linePath}
            fill="none"
            stroke="#a78bfa"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Hover Line Marker */}
          {hoveredPoint && (
            <line
              x1={hoveredPoint.x}
              y1={paddingTop}
              x2={hoveredPoint.x}
              y2={paddingTop + chartHeight}
              stroke="#c4b5fd"
              strokeDasharray="3 3"
              strokeWidth="1.5"
              opacity="0.8"
            />
          )}

          {/* Points */}
          {points.map((p) => {
            const isHovered = hoveredPoint?.index === p.index
            return (
              <g key={p.index}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 7.5 : points.length > 25 ? 4 : 5.5}
                  fill={isHovered ? "#ddd6fe" : "#a78bfa"}
                  stroke="#ffffff"
                  strokeWidth={isHovered ? "3" : "2"}
                  className="cursor-pointer transition-all duration-150"
                  onMouseEnter={() => setHoveredPoint(p)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
