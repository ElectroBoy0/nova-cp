export type SupportedLanguage = "cpp" | "python" | "java"

export type TestCaseStatus =
  | "PASSED"
  | "WRONG_ANSWER"
  | "TIME_LIMIT_EXCEEDED"
  | "MEMORY_LIMIT_EXCEEDED"
  | "RUNTIME_ERROR"
  | "COMPILATION_ERROR"
  | "PENDING"

export type OverallExecutionStatus =
  | "ACCEPTED"
  | "WRONG_ANSWER"
  | "TIME_LIMIT_EXCEEDED"
  | "MEMORY_LIMIT_EXCEEDED"
  | "RUNTIME_ERROR"
  | "COMPILATION_ERROR"
  | "INTERNAL_ERROR"

export interface TestCase {
  id: string
  name?: string
  input: string
  expected_output?: string
  actual_output?: string
  status?: TestCaseStatus
  time_ms?: number
  memory_kb?: number
  stderr?: string
}

export interface CodeRunRequest {
  language: SupportedLanguage
  code: string
  test_cases: {
    id: string
    input: string
    expected_output?: string
  }[]
  time_limit_ms?: number
  memory_limit_mb?: number
}

export interface CodeRunResponse {
  status: OverallExecutionStatus
  compile_output?: string | null
  total_time_ms: number
  peak_memory_kb: number
  test_cases: {
    id: string
    input: string
    expected_output?: string | null
    actual_output: string
    status: TestCaseStatus
    time_ms: number
    memory_kb: number
    stderr?: string | null
  }[]
}
