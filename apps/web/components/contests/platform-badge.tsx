"use client"

import { cn } from "@/lib/utils"
import type { ContestPlatform } from "@/types/contests"
import { PLATFORM_META } from "@/lib/contests"

interface PlatformBadgeProps {
  platform: ContestPlatform
  className?: string
  size?: "sm" | "md"
}

export function PlatformBadge({ platform, className, size = "md" }: PlatformBadgeProps) {
  const meta = PLATFORM_META[platform]

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        meta.bgColor,
        meta.color,
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dotColor)} aria-hidden="true" />
      {meta.label}
    </span>
  )
}
