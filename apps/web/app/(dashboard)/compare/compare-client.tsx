"use client"

import * as React from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { useCompare } from "@/lib/compare"
import { CompareSearch } from "@/components/compare/compare-search"
import { HeadToHead } from "@/components/compare/head-to-head"
import { RatingRace } from "@/components/compare/rating-race"
import { TopicRadar } from "@/components/compare/topic-radar"
import { TheGap } from "@/components/compare/the-gap"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, Link as LinkIcon, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

export function CompareClient({ userId }: { userId: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const rivalHandle = searchParams.get("rival")

  const { data, isLoading, error } = useCompare(userId, rivalHandle)

  const handleSearch = (handle: string) => {
    const params = new URLSearchParams(searchParams)
    params.set("rival", handle)
    router.push(`${pathname}?${params.toString()}`)
  }

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href)
      toast.success("Comparison link copied to clipboard")
    }
  }

  if (!rivalHandle) {
    return (
      <div className="flex min-h-[60vh] flex-1 animate-fade-up flex-col items-center justify-center p-6 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <LinkIcon className="h-8 w-8 text-primary" />
        </div>
        <h2 className="mb-2 text-2xl font-semibold text-foreground">Find Your Rival</h2>
        <p className="mb-8 max-w-md text-muted-foreground">
          Enter a Codeforces handle to compare stats, view side-by-side rating history, and discover
          the most important problems they've solved that you haven't.
        </p>
        <CompareSearch onSearch={handleSearch} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-1 animate-fade-up flex-col p-6">
        <div className="mb-8">
          <CompareSearch onSearch={handleSearch} initialValue={rivalHandle} />
        </div>
        <div className="flex max-w-xl items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-destructive">
          <AlertCircle className="mt-0.5 h-5 w-5" />
          <div>
            <h4 className="mb-1 font-medium">Comparison Failed</h4>
            <p className="text-sm text-destructive/90">
              {error.message ||
                `Could not fetch data for ${rivalHandle}. Make sure the handle is correct and exists on Codeforces.`}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading || !data) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="mb-4">
          <CompareSearch onSearch={handleSearch} initialValue={rivalHandle} isLoading={true} />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-[300px] w-full rounded-xl" />
          <Skeleton className="h-[300px] w-full rounded-xl" />
        </div>
        <Skeleton className="h-[500px] w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex animate-fade-up flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex w-full max-w-sm items-center gap-4">
          <CompareSearch onSearch={handleSearch} initialValue={rivalHandle} />
        </div>
        <div className="flex items-center gap-3">
          {data.shared_problems_count > 0 && (
            <Badge variant="outline" className="font-normal text-muted-foreground">
              {data.shared_problems_count} Shared Problems
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={handleShare} className="gap-2">
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>
      </div>

      <div className="stagger-1 grid animate-fade-up grid-cols-1 gap-6 lg:grid-cols-2">
        <HeadToHead userStats={data.user_overview} rivalStats={data.rival_overview} />
        <TopicRadar
          data={data.topic_comparison}
          userHandle={data.user_overview.handle}
          rivalHandle={data.rival_overview.handle}
        />
      </div>

      <div className="stagger-2 animate-fade-up">
        <RatingRace
          history={data.rating_history}
          userHandle={data.user_overview.handle}
          rivalHandle={data.rival_overview.handle}
        />
      </div>

      <div className="stagger-3 animate-fade-up">
        <TheGap problems={data.gap_problems} userId={userId} />
      </div>
    </div>
  )
}
