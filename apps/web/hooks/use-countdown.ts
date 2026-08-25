"use client"

import { useEffect, useRef, useState } from "react"

/**
 * useCountdown — live countdown to a target date.
 * Returns a formatted string that updates every second.
 * Returns null if the target date is in the past.
 */
export function useCountdown(targetDate: string | null): string | null {
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const frameRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!targetDate) return

    const target = new Date(targetDate).getTime()

    const tick = () => {
      const now = Date.now()
      const diff = target - now

      if (diff <= 0) {
        setTimeLeft(0)
        return
      }

      setTimeLeft(Math.floor(diff / 1000))
      frameRef.current = setTimeout(tick, 1000)
    }

    tick()
    return () => {
      if (frameRef.current) clearTimeout(frameRef.current)
    }
  }, [targetDate])

  if (timeLeft === null) return null
  if (timeLeft === 0) return "Started"

  const d = Math.floor(timeLeft / 86400)
  const h = Math.floor((timeLeft % 86400) / 3600)
  const m = Math.floor((timeLeft % 3600) / 60)
  const s = timeLeft % 60

  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}
