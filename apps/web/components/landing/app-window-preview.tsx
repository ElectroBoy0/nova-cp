"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { ArrowUpRight, Check, X, Terminal, Sparkles } from "lucide-react"

// Recent contest points for animated SVG trajectory
const trajectoryPoints = [
  { round: "R988", rating: 1590, x: 20, y: 55 },
  { round: "R990", rating: 1624, x: 80, y: 45 },
  { round: "R992", rating: 1608, x: 140, y: 50 },
  { round: "R994", rating: 1655, x: 200, y: 35 },
  { round: "R996", rating: 1678, x: 260, y: 28 },
  { round: "R998", rating: 1742, x: 320, y: 10 },
]

const svgPath = `M ${trajectoryPoints.map((p) => `${p.x},${p.y}`).join(" L ")}`

export function AppWindowPreview() {
  const [ratingCount, setRatingCount] = useState(1678)
  const [syncStatus, setSyncStatus] = useState("Syncing 648 submissions...")
  const [activeLogIndex, setActiveLogIndex] = useState(0)

  const logs = [
    "GET /api/user.status?handle=tourist_mind · 648 submissions indexed (142ms)",
    "AUDIT: DP interval states identified as primary bottleneck (34% accuracy)",
    "TRAINING: Prescribed 1842C (Rating 1800) for daily practice session",
  ]

  // Count up rating and transition sync state
  useEffect(() => {
    const startRating = 1678
    const endRating = 1742
    const duration = 1200
    const startTime = performance.now()

    const animateCount = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(startRating + (endRating - startRating) * easeProgress)
      setRatingCount(current)

      if (progress < 1) {
        requestAnimationFrame(animateCount)
      } else {
        setSyncStatus("Codeforces Sync Complete · 142ms")
      }
    }

    const timer = setTimeout(() => {
      requestAnimationFrame(animateCount)
    }, 400)

    // Cycle terminal logs
    const logInterval = setInterval(() => {
      setActiveLogIndex((prev) => (prev + 1) % logs.length)
    }, 3200)

    return () => {
      clearTimeout(timer)
      clearInterval(logInterval)
    }
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto mt-12 w-full max-w-4xl text-left font-sans"
    >
      {/* Real Developer App Frame (Linear / Raycast aesthetic) */}
      <div className="overflow-hidden rounded-lg border border-border/80 bg-surface-1 shadow-2xl shadow-black/70">
        {/* Chrome Titlebar */}
        <div className="flex items-center justify-between border-b border-border/60 bg-surface-2/80 px-4 py-2.5 text-xs">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-zinc-700 transition-colors hover:bg-rose-500" />
            <div className="h-2.5 w-2.5 rounded-full bg-zinc-700 transition-colors hover:bg-amber-500" />
            <div className="h-2.5 w-2.5 rounded-full bg-zinc-700 transition-colors hover:bg-emerald-500" />
            <div className="mx-1.5 h-3.5 w-px bg-border/80" />
            <span className="font-mono text-[11px] text-muted-foreground">
              novacp / analysis / @tourist_mind
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded border border-border/60 bg-surface-1 px-2.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              {syncStatus}
            </span>
          </div>
        </div>

        {/* Interior Workflow Body */}
        <div className="space-y-5 bg-background p-5 sm:p-6">
          {/* Top Contest Summary Bar with Animated Trajectory */}
          <div className="space-y-4 rounded-md border border-border/60 bg-surface-1/60 p-4">
            <div className="flex flex-col justify-between gap-4 border-b border-border/40 pb-3 lg:flex-row lg:items-center">
              <div>
                <span className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Last Rated Contest Breakdown
                </span>
                <h4 className="mt-0.5 text-xs font-semibold text-foreground sm:text-sm">
                  Codeforces Round 998 (Div. 2)
                </h4>
              </div>

              {/* Live Rating Delta & Animated Counter */}
              <div className="flex items-center gap-4 font-mono">
                {/* SVG Mini Rating Graph */}
                <div className="hidden sm:block">
                  <span className="mb-0.5 block text-right font-mono text-[9px] text-muted-foreground">
                    Rating Trajectory (Last 6 Rounds)
                  </span>
                  <svg width="180" height="32" viewBox="0 0 340 65" className="overflow-visible">
                    {/* Background grid line */}
                    <line
                      x1="10"
                      y1="55"
                      x2="330"
                      y2="55"
                      stroke="currentColor"
                      strokeOpacity="0.1"
                      strokeDasharray="2 2"
                    />
                    {/* Animated Trajectory Path */}
                    <motion.path
                      d={svgPath}
                      fill="none"
                      stroke="hsl(var(--primary))"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.4, ease: "easeInOut" }}
                    />
                    {/* Data Points */}
                    {trajectoryPoints.map((p, idx) => (
                      <motion.circle
                        key={p.round}
                        cx={p.x}
                        cy={p.y}
                        r={idx === trajectoryPoints.length - 1 ? "4" : "2.5"}
                        className={
                          idx === trajectoryPoints.length - 1
                            ? "fill-primary stroke-background stroke-2"
                            : "fill-muted-foreground/60"
                        }
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2 + idx * 0.15 }}
                      />
                    ))}
                  </svg>
                </div>

                <div className="hidden h-7 w-px bg-border/60 sm:block" />

                <div>
                  <span className="block text-right text-[10px] text-muted-foreground">
                    Rating Delta
                  </span>
                  <span className="text-xs font-bold text-foreground">
                    1,678 &rarr;{" "}
                    <span className="font-bold text-primary">{ratingCount.toLocaleString()}</span>{" "}
                    (+64)
                  </span>
                </div>

                <div className="h-7 w-px bg-border/60" />

                <div>
                  <span className="block text-right text-[10px] text-muted-foreground">Rank</span>
                  <span className="text-xs font-bold text-foreground">142 / 12,480</span>
                </div>
              </div>
            </div>

            {/* Staggered Contest Problem Performance Row */}
            <div className="grid grid-cols-2 gap-2 font-mono text-xs sm:grid-cols-4">
              {[
                { id: "998A", rating: "800", time: "00:06", ok: true, delay: 0.1 },
                { id: "998B", rating: "1100", time: "00:18", ok: true, delay: 0.2 },
                { id: "998C", rating: "1500", time: "00:44", ok: true, delay: 0.3 },
                { id: "998D", rating: "1800", time: "WA test 14", ok: false, delay: 0.4 },
              ].map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: p.delay, duration: 0.35 }}
                  className={`flex items-center justify-between rounded border p-2 transition-colors ${
                    p.ok
                      ? "border-border/40 bg-surface-2/50 hover:border-border/80"
                      : "border-primary/30 bg-primary/5"
                  }`}
                >
                  <span className={p.ok ? "text-muted-foreground" : "font-bold text-primary"}>
                    {p.id} ({p.rating})
                  </span>
                  <span
                    className={`flex items-center gap-1 text-[11px] font-medium ${
                      p.ok ? "text-primary" : "font-semibold text-primary"
                    }`}
                  >
                    {p.ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} {p.time}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Core Analysis: Weak Topic & Actionable Problem */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Left: Historic Topic Breakdown */}
            <div className="space-y-3 rounded-md border border-border/60 bg-surface-1/40 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Historic Tag Accuracy</span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  Rating 1700–1900
                </span>
              </div>

              <div className="space-y-2.5 font-mono text-[11px]">
                {[
                  {
                    tag: "Dynamic Programming",
                    solved: "4/12 solved",
                    pct: 34,
                    isBottleneck: true,
                  },
                  {
                    tag: "Segment Trees & Range Queries",
                    solved: "6/12 solved",
                    pct: 48,
                    isBottleneck: false,
                  },
                  {
                    tag: "Binary Search & Monotonicity",
                    solved: "14/18 solved",
                    pct: 78,
                    isBottleneck: false,
                  },
                  {
                    tag: "Trees & Graph Traversals",
                    solved: "19/22 solved",
                    pct: 86,
                    isBottleneck: false,
                  },
                ].map((t) => (
                  <div key={t.tag} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 font-sans font-medium text-foreground">
                        {t.isBottleneck && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                        {t.tag}
                      </span>
                      <span
                        className={
                          t.isBottleneck ? "font-bold text-primary" : "text-muted-foreground"
                        }
                      >
                        {t.pct}% ({t.solved})
                      </span>
                    </div>
                    <div className="h-1 w-full overflow-hidden rounded-full bg-surface-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${t.pct}%` }}
                        transition={{ duration: 0.9, delay: 0.3 }}
                        className={`h-full ${t.isBottleneck ? "bg-primary" : "bg-muted-foreground/60"}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Concrete Recommended Next Problem */}
            <div className="flex flex-col justify-between space-y-3 rounded-md border border-border/80 bg-surface-1/80 p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-primary">
                    Targeted Training Prescription
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    Div. 2 D Bottleneck
                  </span>
                </div>

                <p className="text-xs leading-relaxed text-muted-foreground">
                  You failed 4 of your last 6 contest problems involving interval DP states. Solving{" "}
                  <strong className="font-mono text-foreground">1842C</strong> reinforces this
                  transition structure before your next rated round.
                </p>
              </div>

              {/* Problem Tile with Micro Hover */}
              <div className="group space-y-1.5 rounded border border-border/80 bg-background p-3 transition-colors hover:border-primary/50">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-foreground transition-colors group-hover:text-primary">
                    1842C · Tenzing and Balls
                  </span>
                  <span className="rounded border border-primary/20 bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">
                    Rating 1800
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <span className="font-mono text-[10px] text-muted-foreground">
                    tags: dp, data structures
                  </span>
                  <span className="flex items-center gap-0.5 text-xs font-medium text-foreground transition-colors group-hover:text-primary">
                    Start Problem{" "}
                    <ArrowUpRight className="h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Terminal Activity Ticker Bar */}
          <div className="flex items-center gap-2 border-t border-border/40 pt-2 font-mono text-[10px] text-muted-foreground">
            <Terminal className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="shrink-0 font-semibold text-primary">&gt;</span>
            <motion.span
              key={activeLogIndex}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="truncate"
            >
              {logs[activeLogIndex]}
            </motion.span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
