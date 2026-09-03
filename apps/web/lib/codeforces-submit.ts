export interface CodeforcesSubmitPayload {
  user_id?: string
  contest_id: number
  problem_index: string
  code: string
  language: string
  session_cookie?: string
}

export interface CodeforcesSubmitResponse {
  status: string
  message: string
  contest_id: string
  index: string
  language_id: number
}

export interface CFSubmissionVerdict {
  id: number
  contestId: number
  creationTimeSeconds: number
  problem: {
    contestId: number
    index: string
    name: string
  }
  programmingLanguage: string
  verdict?:
    | "OK"
    | "WRONG_ANSWER"
    | "TIME_LIMIT_EXCEEDED"
    | "MEMORY_LIMIT_EXCEEDED"
    | "COMPILATION_ERROR"
    | "RUNTIME_ERROR"
    | "CHALLENGED"
    | "SKIPPED"
    | "TESTING"
    | string
  passedTestCount: number
  timeConsumedMillis: number
  memoryConsumedBytes: number
}

/**
 * Submit code directly to Codeforces via backend proxy
 */
export async function submitToCodeforces(
  payload: CodeforcesSubmitPayload
): Promise<CodeforcesSubmitResponse> {
  const res = await fetch("/api/v1/codeforces/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: "Submission request failed" }))
    throw new Error(data.detail || "Failed to submit to Codeforces")
  }

  return res.json()
}

/**
 * Check recent submissions for a handle from Codeforces public API
 */
export async function checkLatestCFSubmission(
  handle: string,
  contestId: number,
  problemIndex: string
): Promise<CFSubmissionVerdict | null> {
  try {
    const res = await fetch(
      `https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}&from=1&count=6`,
      { cache: "no-store" }
    )
    if (!res.ok) return null
    const data = await res.json()
    if (data.status !== "OK" || !Array.isArray(data.result)) return null

    const match = data.result.find(
      (sub: CFSubmissionVerdict) =>
        sub.problem?.contestId === contestId &&
        sub.problem?.index?.toUpperCase() === problemIndex.toUpperCase()
    )

    return match || null
  } catch (err) {
    console.warn("Failed to check Codeforces submission status:", err)
    return null
  }
}
