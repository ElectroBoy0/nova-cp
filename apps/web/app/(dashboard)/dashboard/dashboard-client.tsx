"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { useRecommendations } from "@/hooks/use-problems"
import { RecommendationWidget } from "@/components/problems/recommendation-widget"
import { BarChart3, Trophy, Star, Flame, ArrowRight, Link2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useUserProfile, useUserDashboard, useLinkHandle, analyticsKeys } from "@/lib/users"
import { useContests } from "@/hooks/use-contests"
import { PlatformBadge } from "@/components/contests/platform-badge"
import { useEffect, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { OnboardingDialog } from "@/components/onboarding/onboarding-dialog"
import type { Contest } from "@/types/contests"

export function DashboardClient({ userId, firstName }: { userId: string; firstName: string }) {
  const { data: user, isLoading: isUserLoading } = useUserProfile(userId)
  const { data: analytics, isLoading: isDashboardLoading } = useUserDashboard(userId)
  const linkMutation = useLinkHandle()
  const queryClient = useQueryClient()

  const syncStatus = user?.cf_handle?.sync_status
  const prevSyncStatus = useRef(syncStatus)

  useEffect(() => {
    if (prevSyncStatus.current === "syncing" && syncStatus === "completed") {
      queryClient.invalidateQueries({ queryKey: analyticsKeys.dashboard(userId) })
    }
    prevSyncStatus.current = syncStatus
  }, [syncStatus, queryClient, userId])

  const { data: recommendations, isPending: isLoadingRecommendations } = useRecommendations(
    user?.id ?? ""
  )

  const isInitialLoading = isDashboardLoading || isUserLoading
  const hasLinkedHandle = !!user?.cf_handle
  const rating = user?.cf_handle?.rating ?? "—"

  // Real stats
  const totalSolved = analytics?.total_solved ?? "—"
  const totalContests = analytics?.contest_count ?? "—"
  const streak = analytics?.current_streak_days ?? "—"

  // Upcoming Contests
  const { data: contestsData, isLoading: isContestsLoading } = useContests({
    status: "upcoming",
    limit: 3,
  })
  const upcomingContests = contestsData?.contests?.slice(0, 3) || []

  // Live Contests
  const { data: liveContestsData } = useContests({ status: "running", limit: 3 })
  const liveContests = liveContestsData?.contests || []

  const rawRatingHistory = user?.cf_handle?.rating_history || []
  const ratingHistory = rawRatingHistory.map((r) =>
    typeof r === "number" ? r : (r as { new_rating?: number }).new_rating || 0
  )

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  }

  const handleSyncNow = () => {
    if (user?.cf_handle?.handle) {
      linkMutation.mutate({ userId, handle: user.cf_handle.handle })
    }
  }

  return (
    <div className="flex-1 p-6">
      {/* ---- Greeting & Header Action ---- */}
      <div className="mb-10 flex animate-fade-up items-start justify-between">
        <div>
          <h2 className="mb-1 text-balance text-3xl font-semibold tracking-tight text-foreground">
            Good to see you, {firstName} 👋
          </h2>
          <p className="text-sm text-muted-foreground">
            {hasLinkedHandle
              ? "Ready to train? Here is your personalized dashboard."
              : "Link your Codeforces handle to unlock your personalized dashboard."}
          </p>
        </div>

        {hasLinkedHandle && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleSyncNow}
            disabled={user.cf_handle?.sync_status === "syncing" || linkMutation.isPending}
          >
            <RefreshCw
              className={`h-4 w-4 ${user.cf_handle?.sync_status === "syncing" || linkMutation.isPending ? "animate-spin" : ""}`}
            />
            {user.cf_handle?.sync_status === "syncing" || linkMutation.isPending
              ? "Syncing..."
              : "Sync Data"}
          </Button>
        )}
      </div>

      {/* ---- Live Contest Banner ---- */}
      {liveContests.length > 0 && (
        <div className="mb-8 flex animate-fade-up items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-emerald-400">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3 shrink-0" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {liveContests.length === 1
                  ? "A contest is live right now!"
                  : "Multiple contests are live right now!"}
              </p>
              <p className="text-xs text-muted-foreground">
                {liveContests[0]?.platform} - {liveContests[0]?.contest_name}
                {liveContests.length > 1 && ` (+${liveContests.length - 1} more)`}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
          >
            <Link href="/contests">View Contests</Link>
          </Button>
        </div>
      )}

      {/* ---- Live Sync Banner ---- */}
      {(user?.cf_handle?.sync_status === "syncing" || linkMutation.isPending) && (
        <div className="mb-8 flex animate-fade-up items-center justify-between rounded-xl border border-sky-500/30 bg-sky-500/10 px-5 py-3 text-sky-400">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-5 w-5 animate-spin text-sky-400" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                Syncing Codeforces Submissions
              </p>
              <p className="text-xs text-muted-foreground">
                Fetching your latest submissions and recalculating topic mastery...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ---- No Handle CTA ---- */}
      {!hasLinkedHandle && !isInitialLoading && (
        <div className="stagger-1 mb-8 animate-fade-up rounded-xl border border-primary/30 bg-primary/5 px-5 py-4">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Link2 className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <h3 className="mb-1 text-sm font-semibold text-foreground">
                Link your Codeforces handle
              </h3>
              <p className="mb-4 text-sm text-muted-foreground">
                We&apos;ll analyze your entire submission history and surface your biggest growth
                opportunity in under 60 seconds.
              </p>
              <Button asChild size="sm" className="gap-1.5">
                <Link href="/settings">
                  Link Handle
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Stat Pills ---- */}
      <div className="stagger-2 mb-8 grid animate-fade-up grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: "Current Rating",
            value: rating,
            icon: BarChart3,
            color: "text-violet-400",
            isRating: true,
          },
          { label: "Problems Solved", value: totalSolved, icon: Star, color: "text-sky-400" },
          { label: "Contests", value: totalContests, icon: Trophy, color: "text-emerald-400" },
          { label: "Day Streak", value: streak, icon: Flame, color: "text-amber-400" },
        ].map((stat) => {
          const Icon = stat.icon

          let sparklinePoints = ""
          if (stat.isRating && ratingHistory.length >= 2) {
            const min = Math.min(...ratingHistory)
            const max = Math.max(...ratingHistory)
            const range = max - min || 1
            sparklinePoints = ratingHistory
              .map((val: number, i: number) => {
                const x = (i / (ratingHistory.length - 1)) * 100
                const y = 100 - ((val - min) / range) * 100
                return `${x},${y}`
              })
              .join(" ")
          }

          return (
            <div
              key={stat.label}
              className="relative overflow-hidden rounded-xl border border-border/40 bg-surface-1/50 p-4 transition-colors hover:border-border/80"
            >
              {stat.isRating && sparklinePoints && (
                <svg
                  className="absolute bottom-0 left-0 h-1/2 w-full text-violet-400 opacity-10"
                  preserveAspectRatio="none"
                  viewBox="0 0 100 100"
                >
                  <polyline
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    vectorEffect="non-scaling-stroke"
                    points={sparklinePoints}
                  />
                </svg>
              )}
              <div className="relative mb-2 flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {stat.label}
                </span>
                <Icon className={`h-4 w-4 ${stat.color}`} aria-hidden="true" />
              </div>
              <div className="relative font-mono text-2xl font-semibold text-foreground">
                {isInitialLoading ? <Skeleton className="h-8 w-16" /> : stat.value}
              </div>
            </div>
          )
        })}
      </div>

      {/* ---- Main Grid ---- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column (65%) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Recommendations Section */}
          <div className="stagger-3 animate-fade-up space-y-4">
            <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Smart Recommendations
            </h3>
            <RecommendationWidget
              userId={userId}
              recommendations={recommendations}
              isLoading={isLoadingRecommendations}
            />
          </div>
        </div>

        {/* Right column (35%) */}
        <div className="space-y-6">
          {/* Upcoming Contests Widget */}
          <div className="stagger-4 animate-fade-up rounded-xl border border-border/40 bg-card">
            <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-foreground">Upcoming Contests</h3>
              </div>
              <Button variant="ghost" size="sm" asChild className="h-7 gap-1 text-xs">
                <Link href="/contests">
                  View all
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              </Button>
            </div>
            <div className="p-5">
              <div className="space-y-3">
                {isContestsLoading ? (
                  [1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border border-border/50 bg-surface-2/50 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-lg" />
                        <div className="space-y-1.5">
                          <Skeleton className="h-3.5 w-40" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                      <Skeleton className="h-7 w-20 rounded-md" />
                    </div>
                  ))
                ) : upcomingContests.length > 0 ? (
                  upcomingContests.map((contest: Contest, idx: number) => (
                    <a
                      key={`${contest.platform || "contest"}-${contest.id || idx}-${idx}`}
                      href={contest.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center justify-between rounded-lg border border-border/50 bg-surface-2/30 p-3 transition-colors hover:bg-surface-2/80"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-background">
                          <Trophy className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-emerald-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                            {contest.contest_name}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {formatDate(contest.start_time)}
                          </p>
                        </div>
                      </div>
                      <div className="ml-4 shrink-0">
                        <PlatformBadge platform={contest.platform} size="sm" />
                      </div>
                    </a>
                  ))
                ) : (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No upcoming contests found.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Topic Mastery Widget */}
          <div className="stagger-5 flex h-[300px] animate-fade-up flex-col rounded-xl border border-border/40 bg-card">
            <div className="flex shrink-0 items-center justify-between border-b border-border/50 px-5 py-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-foreground">Topic Mastery</h3>
              </div>
              <Button variant="ghost" size="sm" asChild className="h-7 gap-1 text-xs">
                <a href="/dashboard/topics">
                  View All
                  <ArrowRight className="h-3 w-3" />
                </a>
              </Button>
            </div>
            <div className="flex flex-1 flex-col overflow-hidden p-5">
              {isInitialLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-3 w-12" />
                      </div>
                      <Skeleton className="h-1.5 w-full rounded-full" />
                    </div>
                  ))}
                </div>
              ) : analytics?.topic_mastery ? (
                <div className="custom-scrollbar space-y-4 overflow-y-auto pr-2">
                  {Object.entries(analytics.topic_mastery)
                    .sort((a, b) => b[1].solved - a[1].solved)
                    .slice(0, 5)
                    .map(([topic, stats]) => {
                      const percentage =
                        stats.attempts > 0 ? Math.round((stats.solved / stats.attempts) * 100) : 0
                      return (
                        <div key={topic} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="truncate pr-2 text-xs text-muted-foreground">
                              {topic}
                            </span>
                            <span className="text-xs font-medium text-foreground">
                              {stats.solved}/{stats.attempts}
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                            <div
                              className="h-full rounded-full bg-emerald-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                </div>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center text-center">
                  <p className="text-sm text-muted-foreground">
                    {hasLinkedHandle ? "Syncing data..." : "Link handle to see your top topics"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3-Step Onboarding Modal for New Users */}
      <OnboardingDialog user={user ?? null} />
    </div>
  )
}
