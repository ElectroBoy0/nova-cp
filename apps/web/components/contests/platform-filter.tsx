"use client"

import { cn } from "@/lib/utils"
import type { ContestPlatform } from "@/types/contests"

type FilterValue = ContestPlatform | "all"

interface PlatformFilterProps {
  value: FilterValue
  onChange: (value: FilterValue) => void
  counts?: Partial<Record<FilterValue, number>>
}

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "codeforces", label: "Codeforces" },
  { value: "codechef", label: "CodeChef" },
  { value: "atcoder", label: "AtCoder" },
]

export function PlatformFilter({
  value,
  onChange,
  counts,
}: PlatformFilterProps) {
  return (
    <div
      className="flex flex-wrap gap-1.5"
      role="group"
      aria-label="Filter by platform"
    >
      {FILTERS.map((f) => {
        const active = value === f.value
        const count = counts?.[f.value]

        return (
          <button
            key={f.value}
            type="button"
            id={`filter-${f.value}`}
            onClick={() => onChange(f.value)}
            aria-pressed={active}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              active
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-transparent text-muted-foreground hover:border-border/80 hover:bg-accent hover:text-foreground"
            )}
          >
            {f.label}
            {count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                  active
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
