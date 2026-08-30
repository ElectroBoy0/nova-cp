export interface SolveSessionRecord {
  id: string
  problemId: string
  problemName: string
  durationSeconds: number
  startedAt: string
  completedAt: string
  mode: "count_up" | "count_down"
  status: "submitted" | "solved" | "run_code" | "practice"
  language?: string
}

const SOLVE_HISTORY_KEY = "novacp_solve_history"
const MAX_HISTORY_ITEMS = 100

/**
 * Record a problem solving attempt with its active duration
 */
export function recordSolveSession(
  session: Omit<SolveSessionRecord, "id" | "completedAt"> & { completedAt?: string }
): SolveSessionRecord {
  const completedAt = session.completedAt || new Date().toISOString()
  const record: SolveSessionRecord = {
    ...session,
    id: `${session.problemId}_${Date.now()}`,
    completedAt,
  }

  if (typeof window !== "undefined") {
    try {
      const existing = getSolveHistory()
      const updated = [record, ...existing.filter((item) => item.id !== record.id)].slice(
        0,
        MAX_HISTORY_ITEMS
      )
      localStorage.setItem(SOLVE_HISTORY_KEY, JSON.stringify(updated))

      // Dispatch custom event so listeners update reactively
      window.dispatchEvent(
        new CustomEvent("novacp:solve_recorded", {
          detail: record,
        })
      )
    } catch (err) {
      console.warn("[SolveHistory] Failed to record solve session:", err)
    }
  }

  return record
}

/**
 * Retrieve solve session history from localStorage
 */
export function getSolveHistory(problemId?: string): SolveSessionRecord[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(SOLVE_HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as SolveSessionRecord[]
    if (problemId) {
      return parsed.filter((item) => item.problemId === problemId)
    }
    return parsed
  } catch (err) {
    console.warn("[SolveHistory] Failed to retrieve solve history:", err)
    return []
  }
}
