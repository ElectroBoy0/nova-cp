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
      <div className="flex-1 p-6 flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-up">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-6">
          <LinkIcon className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold mb-2 text-foreground">Find Your Rival</h2>
        <p className="text-muted-foreground max-w-md mb-8">
          Enter a Codeforces handle to compare stats, view side-by-side rating history, 
          and discover the most important problems they've solved that you haven't.
        </p>
        <CompareSearch onSearch={handleSearch} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 p-6 flex flex-col animate-fade-up">
        <div className="mb-8">
          <CompareSearch onSearch={handleSearch} initialValue={rivalHandle} />
        </div>
        <div className="max-w-xl rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-destructive flex items-start gap-3">
          <AlertCircle className="h-5 w-5 mt-0.5" />
          <div>
            <h4 className="font-medium mb-1">Comparison Failed</h4>
            <p className="text-sm text-destructive/90">
              {error.message || `Could not fetch data for ${rivalHandle}. Make sure the handle is correct and exists on Codeforces.`}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading || !data) {
    return (
      <div className="flex-1 p-6 space-y-6">
        <div className="mb-4">
          <CompareSearch onSearch={handleSearch} initialValue={rivalHandle} isLoading={true} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[300px] w-full rounded-xl" />
          <Skeleton className="h-[300px] w-full rounded-xl" />
        </div>
        <Skeleton className="h-[500px] w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-up">
        <div className="flex items-center gap-4 w-full max-w-sm">
          <CompareSearch onSearch={handleSearch} initialValue={rivalHandle} />
        </div>
        <div className="flex items-center gap-3">
          {data.shared_problems_count > 0 && (
            <Badge variant="outline" className="text-muted-foreground font-normal">
              {data.shared_problems_count} Shared Problems
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={handleShare} className="gap-2">
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-up stagger-1">
        <HeadToHead 
          userStats={data.user_overview} 
          rivalStats={data.rival_overview} 
        />
        <TopicRadar 
          data={data.topic_comparison} 
          userHandle={data.user_overview.handle} 
          rivalHandle={data.rival_overview.handle} 
        />
      </div>

      <div className="animate-fade-up stagger-2">
        <RatingRace 
          history={data.rating_history} 
          userHandle={data.user_overview.handle} 
          rivalHandle={data.rival_overview.handle} 
        />
      </div>

      <div className="animate-fade-up stagger-3">
        <TheGap 
          problems={data.gap_problems} 
          userId={userId} 
        />
      </div>
    </div>
  )
}
