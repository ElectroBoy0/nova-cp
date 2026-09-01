import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type {
  UserProfile,
  UserAnalytics,
  UserCustomPreferences,
  NotificationSettings,
  NotificationListResponse,
} from "@/types/users"

// -------------------------------------------------------
// Query Keys
// -------------------------------------------------------
export const userKeys = {
  all: ["users"] as const,
  profile: (userId: string) => [...userKeys.all, userId, "profile"] as const,
  notifications: (userId: string) => [...userKeys.all, userId, "notifications"] as const,
}

// -------------------------------------------------------
// Fetchers
// -------------------------------------------------------
export async function fetchUserProfile(userId: string): Promise<UserProfile> {
  return apiClient.get<UserProfile>(`/api/v1/users/${userId}`)
}

export async function linkCodeforcesHandle(userId: string, handle: string): Promise<UserProfile> {
  return apiClient.post<UserProfile>(`/api/v1/users/${userId}/cf-handle`, { handle })
}

export async function delinkCodeforcesHandle(userId: string): Promise<UserProfile> {
  return apiClient.delete<UserProfile>(`/api/v1/users/${userId}/cf-handle`)
}

export async function generateVerificationToken(
  userId: string,
  handle: string
): Promise<{ token: string; handle: string; expires_in_minutes: number }> {
  return apiClient.post<{ token: string; handle: string; expires_in_minutes: number }>(
    `/api/v1/users/${userId}/cf-handle/verification-token`,
    { handle }
  )
}

export async function updateUserSettings(
  userId: string,
  settings: {
    timezone?: string
    name?: string
    image?: string
    custom_preferences?: UserCustomPreferences
    notification_settings?: NotificationSettings
  }
): Promise<UserProfile> {
  return apiClient.patch<UserProfile>(`/api/v1/users/${userId}/settings`, settings)
}

export async function fetchUserNotifications(
  userId: string,
  params?: { limit?: number; offset?: number; unread_only?: boolean }
): Promise<NotificationListResponse> {
  const searchParams = new URLSearchParams()
  if (params?.limit) searchParams.append("limit", params.limit.toString())
  if (params?.offset) searchParams.append("offset", params.offset.toString())
  if (params?.unread_only) searchParams.append("unread_only", "true")

  const query = searchParams.toString()
  return apiClient.get<NotificationListResponse>(
    `/api/v1/users/${userId}/notifications${query ? `?${query}` : ""}`
  )
}

export async function markNotificationAsRead(
  userId: string,
  notificationId: string
): Promise<{ status: string }> {
  return apiClient.patch<{ status: string }>(
    `/api/v1/users/${userId}/notifications/${notificationId}/read`,
    {}
  )
}

export async function markAllNotificationsAsRead(
  userId: string
): Promise<{ status: string; marked_count: number }> {
  return apiClient.post<{ status: string; marked_count: number }>(
    `/api/v1/users/${userId}/notifications/read-all`,
    {}
  )
}

export async function triggerTestNotification(
  userId: string
): Promise<{ status: string; notification: any }> {
  return apiClient.post<{ status: string; notification: any }>(
    `/api/v1/users/${userId}/notifications/test`,
    {}
  )
}

// -------------------------------------------------------
// Hooks
// -------------------------------------------------------
export function useUserProfile(userId: string | undefined) {
  return useQuery({
    queryKey: userKeys.profile(userId ?? ""),
    queryFn: () => fetchUserProfile(userId!),
    enabled: !!userId,
    refetchInterval: (query) => {
      const status = query.state.data?.cf_handle?.sync_status
      return status === "syncing" || status === "pending" ? 2500 : false
    },
  })
}

export function useLinkHandle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, handle }: { userId: string; handle: string }) =>
      linkCodeforcesHandle(userId, handle),
    onSuccess: (updatedUser) => {
      // Invalidate and set the updated profile data directly in cache
      queryClient.setQueryData(userKeys.profile(updatedUser.id), updatedUser)
      // Also invalidate dashboard analytics so it refreshes when sync completes
      queryClient.invalidateQueries({ queryKey: analyticsKeys.dashboard(updatedUser.id) })
    },
  })
}

export function useDelinkHandle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId }: { userId: string }) => delinkCodeforcesHandle(userId),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(userKeys.profile(updatedUser.id), updatedUser)
      queryClient.invalidateQueries({ queryKey: userKeys.profile(updatedUser.id) })
      queryClient.invalidateQueries({ queryKey: analyticsKeys.dashboard(updatedUser.id) })
      queryClient.invalidateQueries({ queryKey: ["recommendations"] })
      queryClient.invalidateQueries({ queryKey: ["upsolve"] })
    },
  })
}

export function useGenerateVerificationToken() {
  return useMutation({
    mutationFn: ({ userId, handle }: { userId: string; handle: string }) =>
      generateVerificationToken(userId, handle),
  })
}

export function useUpdateSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      userId,
      settings,
    }: {
      userId: string
      settings: {
        timezone?: string
        name?: string
        image?: string
        custom_preferences?: UserCustomPreferences
        notification_settings?: NotificationSettings
      }
    }) => updateUserSettings(userId, settings),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(userKeys.profile(updatedUser.id), updatedUser)
    },
  })
}

export function useUserNotifications(
  userId: string | undefined,
  params?: { unread_only?: boolean }
) {
  return useQuery({
    queryKey: [...userKeys.notifications(userId ?? ""), params],
    queryFn: () => fetchUserNotifications(userId!, params),
    enabled: !!userId,
    refetchInterval: 15000, // Poll every 15s for new in-app alerts
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, notificationId }: { userId: string; notificationId: string }) =>
      markNotificationAsRead(userId, notificationId),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: userKeys.notifications(userId) })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId }: { userId: string }) => markAllNotificationsAsRead(userId),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: userKeys.notifications(userId) })
    },
  })
}

export function useTriggerTestNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId }: { userId: string }) => triggerTestNotification(userId),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: userKeys.notifications(userId) })
    },
  })
}

export const analyticsKeys = {
  dashboard: (userId: string) => [...userKeys.profile(userId), "dashboard"] as const,
}

export async function fetchUserDashboard(userId: string): Promise<UserAnalytics> {
  return apiClient.get<UserAnalytics>(`/api/v1/users/${userId}/dashboard`)
}

export function useUserDashboard(userId: string | undefined) {
  return useQuery({
    queryKey: analyticsKeys.dashboard(userId ?? ""),
    queryFn: () => fetchUserDashboard(userId!),
    enabled: !!userId,
    retry: false,
  })
}
