"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"

export function TopbarSearch() {
  const handleOpenCommandPalette = React.useCallback(() => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }))
  }, [])

  return (
    <div className="hidden max-w-md flex-1 items-center px-6 md:flex">
      <Button
        variant="outline"
        className="relative h-9 w-full justify-start rounded-[0.5rem] border-border/60 bg-background text-sm text-muted-foreground hover:bg-accent/50 sm:pr-12"
        onClick={handleOpenCommandPalette}
      >
        <span className="hidden lg:inline-flex">
          <Search className="mr-2 h-4 w-4" /> Search or jump to...
        </span>
        <span className="inline-flex lg:hidden">
          <Search className="mr-2 h-4 w-4" /> Search...
        </span>
        <kbd className="pointer-events-none absolute right-[0.3rem] top-[0.3rem] hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
    </div>
  )
}
