import { useMutation } from "@tanstack/react-query"
import type { CodeRunRequest, CodeRunResponse } from "@/types/code-execution"

/**
 * Execute code against custom testcases via the backend sandbox endpoint
 */
export async function runCode(request: CodeRunRequest): Promise<CodeRunResponse> {
  const res = await fetch("/api/v1/code/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Code execution request failed" }))
    throw new Error(err.detail || "Code execution failed")
  }

  return res.json()
}

/**
 * React Query mutation for executing code
 */
export function useRunCode() {
  return useMutation({
    mutationFn: (request: CodeRunRequest) => runCode(request),
  })
}
