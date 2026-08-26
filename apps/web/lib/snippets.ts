import { apiClient } from "./api-client"
import type { Snippet, SnippetListResponse, SnippetCreate, SnippetUpdate } from "@/types/snippets"

export async function getSnippets(
  userId: string,
  params?: {
    search?: string
    language?: string
    category?: string
    favorites_only?: boolean
    official_only?: boolean
    my_snippets_only?: boolean
    limit?: number
    offset?: number
  }
): Promise<SnippetListResponse> {
  const searchParams = new URLSearchParams()
  searchParams.append("user_id", userId)

  if (params?.search) searchParams.append("search", params.search)
  if (params?.language) searchParams.append("language", params.language)
  if (params?.category) searchParams.append("category", params.category)
  if (params?.favorites_only) searchParams.append("favorites_only", "true")
  if (params?.official_only) searchParams.append("official_only", "true")
  if (params?.my_snippets_only) searchParams.append("my_snippets_only", "true")
  if (params?.limit) searchParams.append("limit", params.limit.toString())
  if (params?.offset) searchParams.append("offset", params.offset.toString())

  return apiClient.get<SnippetListResponse>(`/api/v1/snippets?${searchParams.toString()}`)
}

export async function getSnippet(userId: string, snippetId: string): Promise<Snippet> {
  return apiClient.get<Snippet>(`/api/v1/snippets/${snippetId}?user_id=${userId}`)
}

export async function createSnippet(userId: string, data: SnippetCreate): Promise<Snippet> {
  return apiClient.post<Snippet>(`/api/v1/snippets?user_id=${userId}`, data)
}

export async function updateSnippet(
  userId: string,
  snippetId: string,
  data: SnippetUpdate
): Promise<Snippet> {
  return apiClient.put<Snippet>(`/api/v1/snippets/${snippetId}?user_id=${userId}`, data)
}

export async function deleteSnippet(userId: string, snippetId: string): Promise<void> {
  return apiClient.delete(`/api/v1/snippets/${snippetId}?user_id=${userId}`)
}

export async function toggleFavorite(
  userId: string,
  snippetId: string
): Promise<{ status: string; is_favorited: boolean }> {
  return apiClient.post<{ status: string; is_favorited: boolean }>(
    `/api/v1/snippets/${snippetId}/favorite?user_id=${userId}`,
    {}
  )
}

export async function seedSnippets(): Promise<{ status: string; seeded: number }> {
  return apiClient.post<{ status: string; seeded: number }>(`/api/v1/snippets/seed`, {})
}
