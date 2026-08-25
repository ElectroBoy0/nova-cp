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
    <div className="flex-1 min-h-[70vh] flex flex-col items-center justify-center p-6 text-foreground">
      <div className="max-w-md w-full text-center space-y-5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-rose-500/10 border border-rose-500/30 text-rose-400">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>Dashboard Error</span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Unable to render this view
        </h1>

        <p className="text-sm text-muted-foreground leading-relaxed">
          An error occurred while loading this section of your workspace.
        </p>

        {error?.message && (
          <div className="p-3 rounded-lg border border-border/60 bg-surface-1/40 text-left font-mono text-[11px] text-muted-foreground break-all max-h-24 overflow-y-auto custom-scrollbar">
            <span className="text-rose-400 font-semibold block mb-1">Details:</span>
            {error.message}
          </div>
        )}

        <div className="pt-2 flex items-center justify-center gap-3">
          <Button
            onClick={() => reset()}
            size="sm"
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Try Again</span>
          </Button>

          <Button asChild variant="outline" size="sm" className="gap-2 border-border hover:bg-surface-2">
            <Link href="/dashboard">
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span>Go to Arena</span>
            </Link>
          </Button>

          <Button
            onClick={() => setShowBugDialog(true)}
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10"
          >
            <Bug className="h-3.5 w-3.5" />
            <span>Report</span>
          </Button>
        </div>
      </div>

      <BugReportDialog
        userId="current_user"
        open={showBugDialog}
        onOpenChange={setShowBugDialog}
      />
    </div>
  )
}
