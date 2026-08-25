import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getCollections,
  createCollection,
  updateCollection,
  deleteCollection,
  getBookmarks,
  addBookmark,
  removeBookmark,
  moveBookmark,
  getNotes,
  getNote,
  upsertNote,
  deleteNote
} from "@/lib/bookmarks"

// ==========================
// Collections
// ==========================

export function useCollections(userId: string | undefined) {
  return useQuery({
    queryKey: ["collections", userId],
    queryFn: () => getCollections(userId!),
    enabled: !!userId,
  })
}

export function useCreateCollection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: { name: string; description?: string } }) =>
      createCollection(userId, data),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ["collections", userId] })
    },
  })
}

export function useUpdateCollection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, collectionId, data }: { userId: string; collectionId: string; data: { name?: string; description?: string } }) =>
      updateCollection(userId, collectionId, data),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ["collections", userId] })
    },
  })
}

export function useDeleteCollection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, collectionId }: { userId: string; collectionId: string }) =>
      deleteCollection(userId, collectionId),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ["collections", userId] })
      queryClient.invalidateQueries({ queryKey: ["bookmarks", userId] })
    },
  })
}

// ==========================
// Bookmarks
// ==========================

export function useBookmarks(userId: string | undefined, params?: { collection_id?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ["bookmarks", userId, params],
    queryFn: () => getBookmarks(userId!, params),
    enabled: !!userId,
  })
}

export function useAddBookmark() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: { problem_id: string; collection_id?: string; note?: string } }) =>
      addBookmark(userId, data),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks", userId] })
      queryClient.invalidateQueries({ queryKey: ["collections", userId] })
    },
  })
}

export function useRemoveBookmark() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, bookmarkId }: { userId: string; bookmarkId: string }) =>
      removeBookmark(userId, bookmarkId),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks", userId] })
      queryClient.invalidateQueries({ queryKey: ["collections", userId] })
    },
  })
}

export function useMoveBookmark() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, bookmarkId, collectionId }: { userId: string; bookmarkId: string; collectionId: string | null }) =>
      moveBookmark(userId, bookmarkId, collectionId),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks", userId] })
      queryClient.invalidateQueries({ queryKey: ["collections", userId] })
    },
  })
}

// ==========================
// Notes
// ==========================

export function useNotes(userId: string | undefined) {
  return useQuery({
    queryKey: ["notes", userId],
    queryFn: () => getNotes(userId!),
    enabled: !!userId,
  })
}

export function useNote(userId: string | undefined, problemId: string) {
  return useQuery({
    queryKey: ["note", userId, problemId],
    queryFn: () => getNote(userId!, problemId),
    enabled: !!userId && !!problemId,
    retry: false, // Don't retry on 404s
  })
}

export function useUpsertNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, problemId, content }: { userId: string; problemId: string; content: string }) =>
      upsertNote(userId, problemId, content),
    onSuccess: (_, { userId, problemId }) => {
      queryClient.invalidateQueries({ queryKey: ["note", userId, problemId] })
      queryClient.invalidateQueries({ queryKey: ["notes", userId] })
    },
  })
}

export function useDeleteNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, problemId }: { userId: string; problemId: string }) =>
      deleteNote(userId, problemId),
    onSuccess: (_, { userId, problemId }) => {
      queryClient.invalidateQueries({ queryKey: ["note", userId, problemId] })
      queryClient.invalidateQueries({ queryKey: ["notes", userId] })
    },
  })
}
