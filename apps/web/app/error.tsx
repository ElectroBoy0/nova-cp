"use client"

import React, { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RotateCcw, LayoutDashboard, Bug, ArrowLeft } from "lucide-react"
import { BugReportDialog } from "@/components/bug-report/bug-report-dialog"

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [showBugDialog, setShowBugDialog] = useState(false)
  const userId = "current_user"

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-foreground selection:bg-rose-500/30">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[300px] w-[550px] -translate-x-1/2 rounded-full bg-rose-600/15 blur-[120px]" />
      </div>

      <div className="w-full max-w-md space-y-6 text-center">
        {/* Warning Icon Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 font-mono text-xs font-medium text-rose-400">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>Application Error</span>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          Something went wrong
        </h1>

        <p className="text-sm leading-relaxed text-muted-foreground">
          An unexpected runtime error occurred in this view. Your saved code and preferences remain
          secure.
        </p>

        {/* Error Digest Box */}
        {error?.message && (
          <div className="custom-scrollbar max-h-28 overflow-y-auto break-all rounded-lg border border-border/60 bg-surface-1/40 p-3.5 text-left font-mono text-[11px] text-muted-foreground">
            <span className="mb-1 block font-semibold text-rose-400">Error Details:</span>
            {error.message}
            {error.digest && (
              <span className="mt-1 block text-muted-foreground/60">Digest: {error.digest}</span>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
          <Button
            onClick={() => reset()}
            variant="default"
            className="w-full gap-2 bg-primary text-primary-foreground shadow-lg shadow-purple-900/20 hover:bg-primary/90 sm:w-auto"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Try Again</span>
          </Button>

          <Button
            asChild
            variant="outline"
            className="w-full gap-2 border-border hover:bg-surface-2 sm:w-auto"
          >
            <Link href="/dashboard">
              <LayoutDashboard className="h-4 w-4" />
              <span>Go to Dashboard</span>
            </Link>
          </Button>

          <Button
            onClick={() => setShowBugDialog(true)}
            variant="ghost"
            className="w-full gap-2 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-400 sm:w-auto"
          >
            <Bug className="h-4 w-4" />
            <span>Report Bug</span>
          </Button>
        </div>

        {/* Back Link */}
        <div className="pt-4">
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Go back to previous page</span>
          </button>
        </div>
      </div>

      {/* Integrated Bug Report Modal */}
      <BugReportDialog userId={userId} open={showBugDialog} onOpenChange={setShowBugDialog} />
    </div>
  )
}
