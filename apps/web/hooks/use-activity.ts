import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { ActivityHeatmapData } from "@/types/users"

export const activityKeys = {
  all: ["activity"] as const,
  user: (userId: string) => [...activityKeys.all, userId] as const,
}

const fetchUserActivity = async (userId: string): Promise<ActivityHeatmapData> => {
  return apiClient.get<ActivityHeatmapData>(`/api/v1/users/${userId}/activity`)
}

export function useUserActivity(userId: string) {
  return useQuery({
    queryKey: activityKeys.user(userId),
    queryFn: () => fetchUserActivity(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
