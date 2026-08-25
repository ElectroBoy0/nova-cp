import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Skeleton component for loading states.
 * Uses the custom shimmer animation defined in globals.css.
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-shimmer rounded-md bg-surface-2", className)}
      aria-hidden="true"
      {...props}
    />
  )
}

export { Skeleton }
