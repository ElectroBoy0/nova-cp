"use client"

import * as React from "react"
import { Search, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface CompareSearchProps {
  onSearch: (handle: string) => void
  isLoading?: boolean
  initialValue?: string
}

export function CompareSearch({ onSearch, isLoading, initialValue = "" }: CompareSearchProps) {
  const [handle, setHandle] = React.useState(initialValue)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (handle.trim()) {
      onSearch(handle.trim())
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm items-center space-x-2">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Enter rival Codeforces handle..."
          className="pl-9"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          disabled={isLoading}
        />
      </div>
      <Button type="submit" disabled={isLoading || !handle.trim()}>
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Compare"}
      </Button>
    </form>
  )
}
