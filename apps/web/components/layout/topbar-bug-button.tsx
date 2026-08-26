"use client"

import { useState } from "react"
import { Bug } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BugReportDialog } from "@/components/bug-report/bug-report-dialog"

export function TopbarBugButton({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setOpen(true)}
        aria-label="Report bug"
        title="Report an issue or bug"
        className="text-muted-foreground hover:text-foreground"
      >
        <Bug className="h-4 w-4" aria-hidden="true" />
      </Button>

      <BugReportDialog userId={userId} open={open} onOpenChange={setOpen} />
    </>
  )
}
