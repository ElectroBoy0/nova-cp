"use client"

import { useState } from "react"
import { ProblemFilters } from "@/components/problems/problem-filters"
import { ProblemTable } from "@/components/problems/problem-table"
import { useProblems } from "@/hooks/use-problems"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

export function ProblemsClient({ userId }: { userId?: string }) {
  const [filters, setFilters] = useState({
    search: "",
    minRating: 800,
    maxRating: 3500,
    tags: "",
  })
  const [page, setPage] = useState(0)
  const limit = 50

  const { data, isLoading } = useProblems({
    search: filters.search,
    min_rating: filters.minRating,
    max_rating: filters.maxRating,
    tags: filters.tags,
    limit,
    offset: page * limit,
  })

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Problem Explorer</h2>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-64 shrink-0">
          <ProblemFilters filters={filters} setFilters={(f: typeof filters) => { setFilters(f); setPage(0); }} />
        </div>

        <div className="flex-1 space-y-4">
          <ProblemTable problems={data?.items || []} isLoading={isLoading} userId={userId} />
          
          {data && data.total > limit && (
            <div className="flex items-center justify-end space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <div className="text-sm text-muted-foreground">
                Page {page + 1} of {Math.ceil(data.total / limit)}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={(page + 1) * limit >= data.total}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
