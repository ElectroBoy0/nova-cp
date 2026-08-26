"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Lock } from "lucide-react"
import { useUserProfile, useUserDashboard } from "@/lib/users"
import Link from "next/link"
import { Button } from "@/components/ui/button"

import { RatingChart } from "@/components/analytics/rating-chart"
import { ActivityHeatmap } from "@/components/analytics/activity-heatmap"

export function AnalyticsClient({ userId }: { userId: string }) {
  const { data: user, isLoading: isUserLoading } = useUserProfile(userId)
  const { data: analytics, isLoading: isAnalyticsLoading } = useUserDashboard(userId)

  const isLoading = isUserLoading || isAnalyticsLoading
  const hasLinkedHandle = !!user?.cf_handle

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
        <Badge
          variant="default"
          className="border-emerald-500/20 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
        >
          Synced
        </Badge>
      </div>

      <div className="stagger-1 grid animate-fade-up grid-cols-1 gap-6">
        {/* Rating Chart */}
        <RatingChart
          history={user?.cf_handle?.rating_history || []}
          currentRating={user?.cf_handle?.rating}
          maxRating={user?.cf_handle?.max_rating}
        />

        {/* Topic Mastery */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm font-semibold text-foreground">Topic Mastery</div>
          </div>

          <div className="space-y-4">
            {isAnalyticsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-2 flex-1 rounded-full" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                ))}
              </div>
            ) : analytics?.topic_mastery && Object.keys(analytics.topic_mastery).length > 0 ? (
              Object.entries(analytics.topic_mastery)
                .sort((a, b) => b[1].solved - a[1].solved)
                .map(([topic, stats]) => {
                  const percentage =
                    stats.attempts > 0 ? Math.round((stats.solved / stats.attempts) * 100) : 0
                  return (
                    <div key={topic} className="flex items-center gap-4">
                      <div className="w-32 truncate text-sm text-muted-foreground" title={topic}>
                        {topic}
                      </div>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="w-12 text-right text-xs font-medium text-foreground">
                        {stats.solved}/{stats.attempts}
                      </div>
                    </div>
                  )
                })
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No submission data found.
              </p>
            )}
          </div>
        </div>

        {/* Practice Activity Heatmap */}
        <ActivityHeatmap userId={userId} />
      </div>
    </div>
  )
}
