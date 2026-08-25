import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merges Tailwind class names using clsx and tailwind-merge.
 * Use this everywhere instead of string interpolation to avoid
 * conflicting Tailwind classes.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a duration in seconds to a human-readable countdown string.
 * Example: 3723 → "1h 2m 3s"
 */
export function formatDuration(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60

  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

/**
 * Format a timestamp to relative time.
 * Example: "3 hours ago", "in 2 days"
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  const now = new Date()
  const diffMs = d.getTime() - now.getTime()
  const diffSecs = Math.round(diffMs / 1000)
  const absDiff = Math.abs(diffSecs)

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" })

  if (absDiff < 60) return rtf.format(diffSecs, "second")
  if (absDiff < 3600) return rtf.format(Math.round(diffSecs / 60), "minute")
  if (absDiff < 86400) return rtf.format(Math.round(diffSecs / 3600), "hour")
  if (absDiff < 2592000) return rtf.format(Math.round(diffSecs / 86400), "day")
  return rtf.format(Math.round(diffSecs / 2592000), "month")
}

/**
 * Returns the color class for a Codeforces rating.
 */
export function getRatingColor(rating: number | null | undefined): string {
  if (!rating) return "text-muted-foreground"
  if (rating < 1200) return "text-gray-400"
  if (rating < 1400) return "text-emerald-400"
  if (rating < 1600) return "text-cyan-400"
  if (rating < 1900) return "text-blue-400"
  if (rating < 2100) return "text-violet-400"
  if (rating < 2300) return "text-amber-400"
  if (rating < 2400) return "text-amber-500"
  if (rating < 2600) return "text-orange-500"
  if (rating < 3000) return "text-rose-500"
  return "text-rose-400" // LGM
}

/**
 * Returns the Codeforces rank title for a rating.
 */
export function getRankTitle(rating: number | null | undefined): string {
  if (!rating) return "Unrated"
  if (rating < 1200) return "Newbie"
  if (rating < 1400) return "Pupil"
  if (rating < 1600) return "Specialist"
  if (rating < 1900) return "Expert"
  if (rating < 2100) return "Candidate Master"
  if (rating < 2300) return "Master"
  if (rating < 2400) return "International Master"
  if (rating < 2600) return "Grandmaster"
  if (rating < 3000) return "International Grandmaster"
  return "Legendary Grandmaster"
}

/**
 * Truncates a string to a maximum length with an ellipsis.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return `${str.slice(0, maxLength - 3)}...`
}
