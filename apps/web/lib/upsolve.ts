import { apiClient } from "./api-client"
import type { UpsolveQueueResponse, UpsolveStats } from "@/types/upsolve"

export async function getUpsolveQueue(
  userId: string,
  params?: { status?: string; limit?: number; offset?: number }
): Promise<UpsolveQueueResponse> {
  const searchParams = new URLSearchParams()
  if (params?.status && params.status !== "all") searchParams.append("status", params.status)
  if (params?.limit) searchParams.append("limit", params.limit.toString())
  if (params?.offset) searchParams.append("offset", params.offset.toString())

  const queryString = searchParams.toString()
  const url = queryString ? `/api/v1/users/${userId}/upsolve?${queryString}` : `/api/v1/users/${userId}/upsolve`
  
  return apiClient.get<UpsolveQueueResponse>(url)
}

export async function getUpsolveStats(userId: string): Promise<UpsolveStats> {
  return apiClient.get<UpsolveStats>(`/api/v1/users/${userId}/upsolve/stats`)
}

export async function generateUpsolveQueue(userId: string): Promise<{ status: string; added: number }> {
  return apiClient.post<{ status: string; added: number }>(`/api/v1/users/${userId}/upsolve/generate`, {})
}

export async function updateUpsolveStatus(userId: string, itemId: string, status: string): Promise<void> {
  return apiClient.patch(`/api/v1/users/${userId}/upsolve/${itemId}`, { status })
}
