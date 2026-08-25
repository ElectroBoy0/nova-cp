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
        <Skeleton className="h-48 w-full mb-6 rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  if (!hasLinkedHandle) {
    return (
      <div className="flex-1 p-6 flex flex-col items-center justify-center min-h-[50vh] text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
          <Lock className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Analytics Locked</h3>
        <p className="text-muted-foreground max-w-md mb-6">
          Link your Codeforces handle to unlock deep performance analytics, rating history, and topic mastery breakdown.
        </p>
        <Button asChild>
          <Link href="/settings">Link Handle</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="animate-fade-up flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Performance Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Your Codeforces rating history and topic mastery.
          </p>
        </div>
        <Badge variant="default" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20">
          Synced
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 animate-fade-up stagger-1">
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
                  const percentage = stats.attempts > 0 ? Math.round((stats.solved / stats.attempts) * 100) : 0
                  return (
                    <div key={topic} className="flex items-center gap-4">
                      <div className="w-32 text-sm text-muted-foreground truncate" title={topic}>{topic}</div>
                      <div className="flex-1 h-2 bg-surface-2 overflow-hidden rounded-full">
                        <div 
                          className="h-full bg-emerald-500 rounded-full" 
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
              <p className="text-center text-sm text-muted-foreground py-4">
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
