import { apiClient } from "./api-client"
import type { Collection, Bookmark, BookmarkListResponse, Note } from "@/types/bookmarks"

// ==========================
// Collections
// ==========================

export async function getCollections(userId: string): Promise<Collection[]> {
  return apiClient.get<Collection[]>(`/api/v1/users/${userId}/bookmarks/collections`)
}

export async function createCollection(userId: string, data: { name: string; description?: string }): Promise<Collection> {
  return apiClient.post<Collection>(`/api/v1/users/${userId}/bookmarks/collections`, data)
}

export async function updateCollection(userId: string, collectionId: string, data: { name?: string; description?: string }): Promise<Collection> {
  return apiClient.put<Collection>(`/api/v1/users/${userId}/bookmarks/collections/${collectionId}`, data)
}

export async function deleteCollection(userId: string, collectionId: string): Promise<void> {
  return apiClient.delete(`/api/v1/users/${userId}/bookmarks/collections/${collectionId}`)
}

// ==========================
// Bookmarks
// ==========================

export async function getBookmarks(
  userId: string,
  params?: { collection_id?: string; limit?: number; offset?: number }
): Promise<BookmarkListResponse> {
  const searchParams = new URLSearchParams()
  if (params?.collection_id) searchParams.append("collection_id", params.collection_id)
  if (params?.limit) searchParams.append("limit", params.limit.toString())
  if (params?.offset) searchParams.append("offset", params.offset.toString())

  const queryString = searchParams.toString()
  const url = queryString ? `/api/v1/users/${userId}/bookmarks?${queryString}` : `/api/v1/users/${userId}/bookmarks`
  
  return apiClient.get<BookmarkListResponse>(url)
}

export async function addBookmark(userId: string, data: { problem_id: string; collection_id?: string; note?: string }): Promise<Bookmark> {
  return apiClient.post<Bookmark>(`/api/v1/users/${userId}/bookmarks`, data)
}

export async function removeBookmark(userId: string, bookmarkId: string): Promise<void> {
  return apiClient.delete(`/api/v1/users/${userId}/bookmarks/${bookmarkId}`)
}

export async function moveBookmark(userId: string, bookmarkId: string, collectionId: string | null): Promise<void> {
  return apiClient.patch(`/api/v1/users/${userId}/bookmarks/${bookmarkId}/move`, { collection_id: collectionId })
}

// ==========================
// Notes
// ==========================

export async function getNotes(userId: string): Promise<Note[]> {
  return apiClient.get<Note[]>(`/api/v1/users/${userId}/notes`)
}

export async function getNote(userId: string, problemId: string): Promise<Note> {
  return apiClient.get<Note>(`/api/v1/users/${userId}/notes/${problemId}`)
}

export async function upsertNote(userId: string, problemId: string, content: string): Promise<Note> {
  return apiClient.put<Note>(`/api/v1/users/${userId}/notes/${problemId}`, { content })
}

export async function deleteNote(userId: string, problemId: string): Promise<void> {
  return apiClient.delete(`/api/v1/users/${userId}/notes/${problemId}`)
}
