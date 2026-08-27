"use client"

import { useEffect, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Lock, RefreshCw } from "lucide-react"
import {
  useUserProfile,
  useUserDashboard,
  useLinkHandle,
  analyticsKeys,
  userKeys,
} from "@/lib/users"
import Link from "next/link"
import { Button } from "@/components/ui/button"

import { RatingChart } from "@/components/analytics/rating-chart"
import { RatingDistributionChart } from "@/components/analytics/rating-distribution-chart"
import { TopicMasteryChart } from "@/components/analytics/topic-mastery-chart"
import { ActivityHeatmap } from "@/components/analytics/activity-heatmap"

export function AnalyticsClient({ userId }: { userId: string }) {
  const { data: user, isLoading: isUserLoading } = useUserProfile(userId)
  const { data: analytics, isLoading: isAnalyticsLoading } = useUserDashboard(userId)
  const linkMutation = useLinkHandle()
  const queryClient = useQueryClient()

  const syncStatus = user?.cf_handle?.sync_status
  const prevSyncStatus = useRef(syncStatus)

  useEffect(() => {
    if (prevSyncStatus.current === "syncing" && syncStatus === "completed") {
      queryClient.invalidateQueries({ queryKey: analyticsKeys.dashboard(userId) })
      queryClient.invalidateQueries({ queryKey: userKeys.profile(userId) })
    }
    prevSyncStatus.current = syncStatus
  }, [syncStatus, queryClient, userId])

  const isLoading = isUserLoading || isAnalyticsLoading
  const hasLinkedHandle = !!user?.cf_handle
  const isSyncing = syncStatus === "syncing" || linkMutation.isPending

  const handleManualSync = () => {
    if (user?.cf_handle?.handle && !isSyncing) {
      linkMutation.mutate({ userId, handle: user.cf_handle.handle })
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 p-6">
        <Skeleton className="mb-6 h-48 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  if (!hasLinkedHandle) {
    return (
      <div className="flex min-h-[50vh] flex-1 flex-col items-center justify-center p-6 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Lock className="h-8 w-8 text-primary" />
        </div>
        <h3 className="mb-2 text-xl font-semibold">Analytics Locked</h3>
        <p className="mb-6 max-w-md text-muted-foreground">
          Link your Codeforces handle to unlock deep performance analytics, rating history, and
          topic mastery breakdown.
        </p>
        <Button asChild>
          <Link href="/settings">Link Handle</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex animate-fade-up items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Performance Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Your Codeforces rating history and topic mastery.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="h-8 gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Syncing..." : "Sync Data"}
          </Button>
          <Badge
            variant="default"
            className={
              isSyncing
                ? "border-amber-500/20 bg-amber-500/10 text-amber-500"
                : "border-emerald-500/20 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
            }
          >
            {isSyncing ? "Syncing..." : "Synced"}
          </Badge>
        </div>
      </div>

      <div className="stagger-1 grid animate-fade-up grid-cols-1 gap-6">
        {/* Rating Chart */}
        <RatingChart
          history={user?.cf_handle?.rating_history || []}
          currentRating={user?.cf_handle?.rating}
          maxRating={user?.cf_handle?.max_rating}
        />

        {/* Difficulty Rating Spectrum */}
        <RatingDistributionChart
          distribution={analytics?.rating_distribution}
          totalSolved={analytics?.total_solved}
        />

        {/* Topic Mastery & Skill Map */}
        <TopicMasteryChart topicMastery={analytics?.topic_mastery} isLoading={isAnalyticsLoading} />

        {/* Practice Activity Heatmap */}
        <ActivityHeatmap userId={userId} />
      </div>
    </div>
  )
}
