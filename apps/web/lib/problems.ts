import { apiClient } from "./api-client"
import type {
  Problem,
  ProblemListResponse,
  ProblemRecommendation,
  RecommendationFeedback,
  HintResponse,
  HintFeedbackCreate,
} from "@/types/problems"

export async function getProblems(params: {
  platform?: string
  min_rating?: number
  max_rating?: number
  tags?: string
  search?: string
  limit?: number
  offset?: number
}): Promise<ProblemListResponse> {
  const searchParams = new URLSearchParams()

  if (params.platform) searchParams.append("platform", params.platform)
  if (params.min_rating !== undefined)
    searchParams.append("min_rating", params.min_rating.toString())
  if (params.max_rating !== undefined)
    searchParams.append("max_rating", params.max_rating.toString())
  if (params.tags) searchParams.append("tags", params.tags)
  if (params.search) searchParams.append("search", params.search)
  if (params.limit !== undefined) searchParams.append("limit", params.limit.toString())
  if (params.offset !== undefined) searchParams.append("offset", params.offset.toString())

  const queryString = searchParams.toString()
  const url = queryString ? `/api/v1/problems?${queryString}` : "/api/v1/problems"

  return apiClient.get<ProblemListResponse>(url)
}

export async function searchProblems(params: {
  q: string
  limit?: number
  offset?: number
  userId?: string
}): Promise<import("@/types/problems").ProblemSearchResponse> {
  const searchParams = new URLSearchParams()
  if (params.q) searchParams.append("q", params.q)
  if (params.limit !== undefined) searchParams.append("limit", params.limit.toString())
  if (params.offset !== undefined) searchParams.append("offset", params.offset.toString())
  if (params.userId) searchParams.append("user_id", params.userId)

  const queryString = searchParams.toString()
  const url = queryString ? `/api/v1/problems/search?${queryString}` : "/api/v1/problems/search"

  return apiClient.get<import("@/types/problems").ProblemSearchResponse>(url)
}

export async function getRecommendations(userId: string): Promise<ProblemRecommendation[]> {
  return apiClient.get<ProblemRecommendation[]>(`/api/v1/problems/recommendations/${userId}`)
}

export async function getDailyMission(userId: string): Promise<ProblemRecommendation> {
  return apiClient.get<ProblemRecommendation>(`/api/v1/daily-mission/${userId}`)
}

export async function submitRecommendationFeedback(
  userId: string,
  feedback: RecommendationFeedback
): Promise<void> {
  return apiClient.post<void>(`/api/v1/problems/feedback/${userId}`, feedback)
}

export async function getHint(problemId: string, level: number): Promise<HintResponse> {
  return apiClient.get(`/api/v1/problems/${problemId}/hints/${level}`)
}

export async function submitHintFeedback(
  problemId: string,
  feedback: HintFeedbackCreate
): Promise<void> {
  return apiClient.post(`/api/v1/problems/${problemId}/hints/feedback`, feedback)
}

export interface ProblemStatementResponse {
  problem_id: string
  contest_id: number
  index: string
  name: string
  rating: number | null
  tags: string[]
  title: string
  time_limit: string
  memory_limit: string
  description: string
  input_specification: string
  output_specification: string
  sample_tests: Array<{
    id: string
    name: string
    input: string
    expected_output: string
  }>
  note: string
  is_fallback?: boolean
  cf_url?: string
}

export async function getProblemStatement(
  problemId: string,
  sessionCookie?: string
): Promise<ProblemStatementResponse> {
  const query = sessionCookie ? `?session_cookie=${encodeURIComponent(sessionCookie)}` : ""
  return apiClient.get<ProblemStatementResponse>(`/api/v1/problems/${problemId}/statement${query}`)
}

export async function getProblem(problemId: string): Promise<Problem> {
  return apiClient.get<Problem>(`/api/v1/problems/${encodeURIComponent(problemId)}`)
}
