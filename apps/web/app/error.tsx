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
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 selection:bg-rose-500/30">
      {/* Ambient background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[550px] h-[300px] bg-rose-600/15 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-md w-full text-center space-y-6">
        {/* Warning Icon Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-rose-500/10 border border-rose-500/30 text-rose-400">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>Application Error</span>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          Something went wrong
        </h1>

        <p className="text-sm text-muted-foreground leading-relaxed">
          An unexpected runtime error occurred in this view. Your saved code and preferences remain secure.
        </p>

        {/* Error Digest Box */}
        {error?.message && (
          <div className="p-3.5 rounded-lg border border-border/60 bg-surface-1/40 text-left font-mono text-[11px] text-muted-foreground break-all max-h-28 overflow-y-auto custom-scrollbar">
            <span className="text-rose-400 font-semibold block mb-1">Error Details:</span>
            {error.message}
            {error.digest && <span className="block text-muted-foreground/60 mt-1">Digest: {error.digest}</span>}
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            onClick={() => reset()}
            variant="default"
            className="w-full sm:w-auto gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-purple-900/20"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Try Again</span>
          </Button>

          <Button asChild variant="outline" className="w-full sm:w-auto gap-2 border-border hover:bg-surface-2">
            <Link href="/dashboard">
              <LayoutDashboard className="h-4 w-4" />
              <span>Go to Dashboard</span>
            </Link>
          </Button>

          <Button
            onClick={() => setShowBugDialog(true)}
            variant="ghost"
            className="w-full sm:w-auto gap-2 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10"
          >
            <Bug className="h-4 w-4" />
            <span>Report Bug</span>
          </Button>
        </div>

        {/* Back Link */}
        <div className="pt-4">
          <button
            onClick={() => window.history.back()}
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Go back to previous page</span>
          </button>
        </div>
      </div>

      {/* Integrated Bug Report Modal */}
      <BugReportDialog
        userId={userId}
        open={showBugDialog}
        onOpenChange={setShowBugDialog}
      />
    </div>
  )
}
