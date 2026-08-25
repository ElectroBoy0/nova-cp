// Contest types — aligned with the FastAPI ContestRead schema
// Note: the API uses snake_case; we camelCase at the fetch boundary.

export type ContestPlatform = "codeforces" | "codechef" | "atcoder"
export type ContestStatus = "upcoming" | "running" | "finished"

export interface Contest {
  id: string
  platform: ContestPlatform
  platform_contest_id: string
  contest_name: string
  url: string
  start_time: string  // ISO 8601 UTC
  duration_seconds: number | null
  status: ContestStatus
  registration_open: boolean | null
  created_at: string
  updated_at: string
}

export interface ContestListResponse {
  contests: Contest[]
  total: number
  limit: number
  offset: number
}

export interface SyncResult {
  platform: string
  fetched: number
  upserted: number
  error: string | null
}

export interface SyncResponse {
  results: SyncResult[]
  total_upserted: number
}
