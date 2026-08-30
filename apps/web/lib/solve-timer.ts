export type TimerMode = "count_up" | "count_down"
export type TimerStatus = "idle" | "running" | "paused" | "completed"

export interface TimerState {
  mode: TimerMode
  status: TimerStatus
  /** Current display seconds */
  seconds: number
  /** Initial target duration for countdown mode (e.g. 1800 for 30m) */
  targetSeconds: number
  /** Total elapsed active solving time in seconds */
  elapsedSolvingSeconds: number
  /** Timestamp when timer was last started/resumed (ms) */
  lastStartedAt: number | null
  /** Stored timestamp when timer was created or reset (ISO) */
  sessionStartedAt: string
  /** Associated problem ID */
  problemId: string
  /** If in virtual contest mode */
  isVirtualContest?: boolean
  /** Target virtual contest end timestamp (ms) */
  contestEndTime?: number | null
}

const STORAGE_PREFIX = "novacp_timer_"

/**
 * Format total seconds into HH:MM:SS or MM:SS
 */
export function formatTimerSeconds(totalSeconds: number, forceHours: boolean = false): string {
  if (totalSeconds < 0) totalSeconds = 0
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const pad = (n: number) => n.toString().padStart(2, "0")

  if (hours > 0 || forceHours) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  }
  return `${pad(minutes)}:${pad(seconds)}`
}

/**
 * Format human readable duration like "14m 32s" or "1h 15m"
 */
export function formatDurationHuman(totalSeconds: number): string {
  if (totalSeconds <= 0) return "0s"
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const parts: string[] = []
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`)

  return parts.join(" ")
}

/**
 * Load saved timer state from localStorage for a given problem
 */
export function loadTimerState(problemId: string): TimerState | null {
  if (typeof window === "undefined" || !problemId) return null
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${problemId}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as TimerState

    // If it was running when saved, calculate the elapsed time since lastStartedAt
    if (parsed.status === "running" && parsed.lastStartedAt) {
      const now = Date.now()
      const deltaSec = Math.floor((now - parsed.lastStartedAt) / 1000)
      if (deltaSec > 0) {
        parsed.elapsedSolvingSeconds = (parsed.elapsedSolvingSeconds || 0) + deltaSec

        if (parsed.mode === "count_up") {
          parsed.seconds = (parsed.seconds || 0) + deltaSec
        } else {
          parsed.seconds = Math.max(0, (parsed.seconds || 0) - deltaSec)
          if (parsed.seconds === 0) {
            parsed.status = "completed"
          }
        }
      }
      parsed.lastStartedAt = now
    }

    return parsed
  } catch (err) {
    console.warn(`[SolveTimer] Failed to load timer for ${problemId}:`, err)
    return null
  }
}

/**
 * Save timer state to localStorage
 */
export function saveTimerState(problemId: string, state: TimerState): void {
  if (typeof window === "undefined" || !problemId) return
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${problemId}`, JSON.stringify(state))
  } catch (err) {
    console.warn(`[SolveTimer] Failed to save timer for ${problemId}:`, err)
  }
}

/**
 * Clear timer state from localStorage
 */
export function clearTimerState(problemId: string): void {
  if (typeof window === "undefined" || !problemId) return
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${problemId}`)
  } catch (err) {
    console.warn(`[SolveTimer] Failed to clear timer for ${problemId}:`, err)
  }
}

/**
 * Common preset durations in seconds
 */
export const TIMER_PRESETS = [
  { label: "15m", seconds: 15 * 60 },
  { label: "30m", seconds: 30 * 60 },
  { label: "60m", seconds: 60 * 60 },
  { label: "90m", seconds: 90 * 60 },
] as const
