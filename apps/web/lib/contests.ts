import { apiClient } from "@/lib/api-client"
import type {
  Contest,
  ContestListResponse,
  ContestPlatform,
  ContestStatus,
  SyncResponse,
} from "@/types/contests"

// -------------------------------------------------------
// Query Keys — centralised for cache consistency
// -------------------------------------------------------
export const contestKeys = {
  all: ["contests"] as const,
  lists: () => [...contestKeys.all, "list"] as const,
  list: (filters: ContestFilters) => [...contestKeys.lists(), filters] as const,
  sync: () => [...contestKeys.all, "sync"] as const,
}

// -------------------------------------------------------
// Filter shape used by queries + components
// -------------------------------------------------------
export interface ContestFilters {
  platform?: ContestPlatform | "all"
  status?: ContestStatus | "all"
  search?: string
  limit?: number
  offset?: number
}

// -------------------------------------------------------
// Fetch all contests (with optional platform filter)
// -------------------------------------------------------
export async function fetchContests(filters: ContestFilters = {}): Promise<ContestListResponse> {
  const { platform, status, limit = 200, offset = 0 } = filters

  const params: Record<string, string | number> = { limit, offset }
  if (status && status !== "all") {
    params.status = status
  }

  if (platform && platform !== "all") {
    return apiClient.get<ContestListResponse>(`/api/v1/contests/platform/${platform}`, { params })
  }

  return apiClient.get<ContestListResponse>("/api/v1/contests", {
    params,
  })
}

// -------------------------------------------------------
// Trigger a manual sync
// -------------------------------------------------------
export async function syncContests(): Promise<SyncResponse> {
  return apiClient.post<SyncResponse>("/api/v1/contests/sync", {})
}

// -------------------------------------------------------
// Client-side helpers
// -------------------------------------------------------

export function filterContests(contests: Contest[], filters: ContestFilters): Contest[] {
  let result = [...contests]

  if (filters.status && filters.status !== "all") {
    result = result.filter((c) => c.status === filters.status)
  }

  if (filters.search) {
    const q = filters.search.toLowerCase()
    result = result.filter((c) => c.contest_name.toLowerCase().includes(q))
  }

  return result
}

// -------------------------------------------------------
// Platform metadata — single source of truth for UI
// -------------------------------------------------------
export const PLATFORM_META: Record<
  ContestPlatform,
  { label: string; color: string; bgColor: string; dotColor: string }
> = {
  codeforces: {
    label: "Codeforces",
    color: "text-sky-400",
    bgColor: "bg-sky-400/10",
    dotColor: "bg-sky-400",
  },
  codechef: {
    label: "CodeChef",
    color: "text-amber-400",
    bgColor: "bg-amber-400/10",
    dotColor: "bg-amber-400",
  },
  atcoder: {
    label: "AtCoder",
    color: "text-emerald-400",
    bgColor: "bg-emerald-400/10",
    dotColor: "bg-emerald-400",
  },
}

export const STATUS_META: Record<ContestStatus, { label: string; color: string; bgColor: string }> =
  {
    upcoming: {
      label: "Upcoming",
      color: "text-violet-400",
      bgColor: "bg-violet-400/10",
    },
    running: {
      label: "Live",
      color: "text-emerald-400",
      bgColor: "bg-emerald-400/10",
    },
    finished: {
      label: "Finished",
      color: "text-muted-foreground",
      bgColor: "bg-muted",
    },
  }
