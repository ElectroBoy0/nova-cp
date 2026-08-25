import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getSnippets,
  getSnippet,
  createSnippet,
  updateSnippet,
  deleteSnippet,
  toggleFavorite,
} from "@/lib/snippets"
import type { SnippetCreate, SnippetUpdate } from "@/types/snippets"

export function useSnippets(
  userId: string | undefined,
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
) {
  return useQuery({
    queryKey: ["snippets", userId, params],
    queryFn: () => getSnippets(userId!, params),
    enabled: !!userId,
  })
}

export function useSnippet(userId: string | undefined, snippetId: string) {
  return useQuery({
    queryKey: ["snippet", userId, snippetId],
    queryFn: () => getSnippet(userId!, snippetId),
    enabled: !!userId && !!snippetId,
    retry: false,
  })
}

export function useCreateSnippet() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: SnippetCreate }) =>
      createSnippet(userId, data),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ["snippets", userId] })
    },
  })
}

export function useUpdateSnippet() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, snippetId, data }: { userId: string; snippetId: string; data: SnippetUpdate }) =>
      updateSnippet(userId, snippetId, data),
    onSuccess: (_, { userId, snippetId }) => {
      queryClient.invalidateQueries({ queryKey: ["snippet", userId, snippetId] })
      queryClient.invalidateQueries({ queryKey: ["snippets", userId] })
    },
  })
}

export function useDeleteSnippet() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, snippetId }: { userId: string; snippetId: string }) =>
      deleteSnippet(userId, snippetId),
    onSuccess: (_, { userId, snippetId }) => {
      queryClient.invalidateQueries({ queryKey: ["snippet", userId, snippetId] })
      queryClient.invalidateQueries({ queryKey: ["snippets", userId] })
    },
  })
}

export function useToggleFavorite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, snippetId }: { userId: string; snippetId: string }) =>
      toggleFavorite(userId, snippetId),
    onSuccess: (_, { userId, snippetId }) => {
      queryClient.invalidateQueries({ queryKey: ["snippet", userId, snippetId] })
      queryClient.invalidateQueries({ queryKey: ["snippets", userId] })
    },
  })
}
