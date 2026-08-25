import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getUpsolveQueue, getUpsolveStats, generateUpsolveQueue, updateUpsolveStatus } from "@/lib/upsolve"

export function useUpsolveQueue(userId: string | undefined, params?: { status?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ["upsolve", "queue", userId, params],
    queryFn: () => getUpsolveQueue(userId!, params),
    enabled: !!userId,
  })
}

export function useUpsolveStats(userId: string | undefined) {
  return useQuery({
    queryKey: ["upsolve", "stats", userId],
    queryFn: () => getUpsolveStats(userId!),
    enabled: !!userId,
  })
}

export function useGenerateUpsolve() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => generateUpsolveQueue(userId),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ["upsolve", "queue", userId] })
      queryClient.invalidateQueries({ queryKey: ["upsolve", "stats", userId] })
    },
  })
}

export function useUpdateUpsolveStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, itemId, status }: { userId: string; itemId: string; status: string }) =>
      updateUpsolveStatus(userId, itemId, status),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ["upsolve", "queue", userId] })
      queryClient.invalidateQueries({ queryKey: ["upsolve", "stats", userId] })
    },
  })
}
