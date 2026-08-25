"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { fetchContests, syncContests, contestKeys } from "@/lib/contests"
import type { ContestFilters } from "@/lib/contests"

// -------------------------------------------------------
// useContests — main data hook for the Contest Center
// -------------------------------------------------------
export function useContests(filters: ContestFilters = {}) {
  return useQuery({
    queryKey: contestKeys.list(filters),
    queryFn: () => fetchContests(filters),
    // Refetch every 5 minutes in the background
    refetchInterval: 5 * 60 * 1000,
  })
}

// -------------------------------------------------------
// useSyncContests — manual sync mutation
// -------------------------------------------------------
export function useSyncContests() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: syncContests,
    onSuccess: () => {
      // Invalidate all contest queries so they refetch fresh data
      queryClient.invalidateQueries({ queryKey: contestKeys.all })
    },
  })
}
