"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Trophy } from "lucide-react"
import { ContestCard, ContestCardSkeleton } from "./contest-card"
import type { Contest, ContestStatus } from "@/types/contests"

interface ContestSectionProps {
  title: string
  status: ContestStatus
  contests: Contest[]
  isLoading?: boolean
}

const SECTION_VARIANTS = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
}

const STATUS_LABELS: Record<ContestStatus, string> = {
  running: "🟢 Live",
  upcoming: "Upcoming",
  finished: "Finished",
}

export function ContestSection({
  title,
  status,
  contests,
  isLoading = false,
}: ContestSectionProps) {
  // Don't render finished section if empty — keeps the page clean
  if (!isLoading && contests.length === 0 && status === "finished") return null

  return (
    <section aria-labelledby={`section-${status}`} className="mb-8">
      {/* Section heading */}
      <div className="mb-3 flex items-center gap-2">
        <h3
          id={`section-${status}`}
          className="text-sm font-semibold text-foreground"
        >
          {STATUS_LABELS[status]}
        </h3>
        {!isLoading && (
          <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
            {contests.length}
          </span>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: status === "running" ? 2 : 4 }).map((_, i) => (
            <ContestCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty state (only for live/upcoming) */}
      {!isLoading && contests.length === 0 && status !== "finished" && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/30 px-4 py-10 text-center">
          <Trophy
            className="mb-3 h-8 w-8 text-muted-foreground/30"
            aria-hidden="true"
          />
          <p className="text-sm text-muted-foreground">
            No {title.toLowerCase()} contests right now.
          </p>
        </div>
      )}

      {/* Contest list */}
      {!isLoading && contests.length > 0 && (
        <motion.div
          variants={SECTION_VARIANTS}
          initial="hidden"
          animate="visible"
          className="space-y-2"
        >
          <AnimatePresence mode="popLayout">
            {contests.map((contest, i) => (
              <ContestCard key={`${contest.platform || 'contest'}-${contest.id || i}-${i}`} contest={contest} index={i} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </section>
  )
}
