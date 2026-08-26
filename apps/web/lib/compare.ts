import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export interface CompareOverview {
  handle: string
  current_rating: number | null
  peak_rating: number | null
  problems_solved: number
  contests_participated: number
  best_rank: number | null
}

export interface TopicMasteryComparison {
  topic: string
  user_solved: number
  user_attempts: number
  rival_solved: number
  rival_attempts: number
}

export interface GapProblem {
  name: string
  contest_id: number | null
  index: string
  rating: number | null
  tags: string[]
  relevance_score: number
  reasons: string[]
}

export interface RatingHistoryPoint {
  contest_id: number
  contest_name: string
  time: number
  user_rating: number | null
  rival_rating: number | null
}

export interface CompareResponse {
  user_overview: CompareOverview
  rival_overview: CompareOverview
  rating_history: RatingHistoryPoint[]
  topic_comparison: TopicMasteryComparison[]
  gap_problems: GapProblem[]
  shared_problems_count: number
}

// -------------------------------------------------------
// Query Keys
// -------------------------------------------------------
export const compareKeys = {
  compare: (userId: string, rivalHandle: string) => ["compare", userId, rivalHandle] as const,
}

// -------------------------------------------------------
// Fetcher
// -------------------------------------------------------
export async function fetchCompareData(
  userId: string,
  rivalHandle: string
): Promise<CompareResponse> {
  return apiClient.get<CompareResponse>(`/api/v1/users/${userId}/compare/${rivalHandle}`)
}

// -------------------------------------------------------
// Hook
// -------------------------------------------------------
export function useCompare(userId?: string, rivalHandle?: string | null) {
  const shouldFetch = !!userId && !!rivalHandle

  const query = useQuery({
    queryKey: compareKeys.compare(userId ?? "", rivalHandle ?? ""),
    queryFn: () => fetchCompareData(userId!, rivalHandle!),
    enabled: shouldFetch,
    refetchOnWindowFocus: false, // Don't constantly ping CF API
  })

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    isValidating: query.isFetching,
  }
}
