"use client"

import React, { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RotateCcw, LayoutDashboard, Bug } from "lucide-react"
import { BugReportDialog } from "@/components/bug-report/bug-report-dialog"

export default function DashboardErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [showBugDialog, setShowBugDialog] = useState(false)

  return (
    <div className="flex min-h-[70vh] flex-1 flex-col items-center justify-center p-6 text-foreground">
      <div className="w-full max-w-md space-y-5 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 font-mono text-xs font-medium text-rose-400">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>Dashboard Error</span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Unable to render this view
        </h1>

        <p className="text-sm leading-relaxed text-muted-foreground">
          An error occurred while loading this section of your workspace.
        </p>

        {error?.message && (
          <div className="custom-scrollbar max-h-24 overflow-y-auto break-all rounded-lg border border-border/60 bg-surface-1/40 p-3 text-left font-mono text-[11px] text-muted-foreground">
            <span className="mb-1 block font-semibold text-rose-400">Details:</span>
            {error.message}
          </div>
        )}

        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            onClick={() => reset()}
            size="sm"
            className="gap-2 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Try Again</span>
          </Button>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="gap-2 border-border hover:bg-surface-2"
          >
            <Link href="/dashboard">
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span>Go to Arena</span>
            </Link>
          </Button>

          <Button
            onClick={() => setShowBugDialog(true)}
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-400"
          >
            <Bug className="h-3.5 w-3.5" />
            <span>Report</span>
          </Button>
        </div>
      </div>

      <BugReportDialog userId="current_user" open={showBugDialog} onOpenChange={setShowBugDialog} />
    </div>
  )
}
