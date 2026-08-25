export type BugCategory =
  | "Authentication"
  | "Codeforces Sync"
  | "Recommendations"
  | "Analytics"
  | "Problem Explorer"
  | "UI/UX"
  | "Performance"
  | "Other"

export type BugPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
export type BugStatus = "OPEN" | "IN_PROGRESS" | "FIXED" | "CLOSED"

export interface EnvironmentMetadata {
  route: string
  browser: string
  os: string
  viewport: string
  app_version: string
  user_id?: string
  [key: string]: any
}

export interface BugReportCreateInput {
  title: string
  category: BugCategory
  description: string
  reproduction_steps?: string
  expected_behavior?: string
  actual_behavior?: string
  priority: BugPriority
  screenshot_url?: string | null
  environment_metadata?: EnvironmentMetadata
}

export interface BugReport {
  id: string
  user_id: string
  title: string
  category: BugCategory
  description: string
  reproduction_steps?: string | null
  expected_behavior?: string | null
  actual_behavior?: string | null
  priority: BugPriority
  status: BugStatus
  screenshot_url?: string | null
  environment_metadata: EnvironmentMetadata
  created_at: string
  updated_at: string
}

export interface BugReportListResponse {
  items: BugReport[]
  total: number
}
