"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Search, X } from "lucide-react"

interface ProblemFiltersProps {
  filters: {
    search: string
    minRating: number
    maxRating: number
    tags: string
  }
  setFilters: (filters: ProblemFiltersProps["filters"]) => void
}

export function ProblemFilters({ filters, setFilters }: ProblemFiltersProps) {
  const handleRatingChange = (value: number[]) => {
    setFilters({ ...filters, minRating: value[0] ?? 800, maxRating: value[1] ?? 3500 })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Search</Label>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Problem name..."
            className="pl-9"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between">
          <Label>Rating Range</Label>
          <span className="text-sm text-muted-foreground">
            {filters.minRating} - {filters.maxRating}
          </span>
        </div>
        <Slider
          min={800}
          max={3500}
          step={100}
          value={[filters.minRating, filters.maxRating]}
          onValueChange={handleRatingChange}
          className="my-4"
        />
      </div>

      <div className="space-y-2">
        <Label>Tags</Label>
        <Input
          placeholder="e.g. dp, math, greedy"
          value={filters.tags}
          onChange={(e) => setFilters({ ...filters, tags: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">Comma-separated tags</p>
      </div>

      <Button
        variant="outline"
        className="w-full"
        onClick={() => setFilters({ search: "", minRating: 800, maxRating: 3500, tags: "" })}
      >
        <X className="mr-2 h-4 w-4" />
        Clear Filters
      </Button>
    </div>
  )
}
