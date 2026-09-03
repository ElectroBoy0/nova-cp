"use client"

import React, { useState, useEffect, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  ExternalLink,
  Check,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  AlertTriangle,
  KeyRound,
  ArrowRight,
} from "lucide-react"
import { toast } from "sonner"
import type { Problem } from "@/types/problems"
import {
  submitToCodeforces,
  checkLatestCFSubmission,
  type CFSubmissionVerdict,
} from "@/lib/codeforces-submit"

interface CFSubmitModalProps {
  isOpen: boolean
  onClose: () => void
  problem: Problem | null
  code: string
  language: string
  userId?: string
  cfHandle?: string
  savedCookie?: string
  onSaveCookie?: (cookie: string) => void
  onAccepted?: (verdict: CFSubmissionVerdict) => void
}

export function CFSubmitModal({
  isOpen,
  onClose,
  problem,
  code,
  language,
  userId,
  cfHandle,
  savedCookie = "",
  onSaveCookie,
  onAccepted,
}: CFSubmitModalProps) {
  const [cookieInput, setCookieInput] = useState(savedCookie)
  const [showInlineCookieInput, setShowInlineCookieInput] = useState(false)
  const [isSubmittingDirect, setIsSubmittingDirect] = useState(false)
  const [directError, setDirectError] = useState<string | null>(null)
  const [isWatching, setIsWatching] = useState(false)
  const [latestVerdict, setLatestVerdict] = useState<CFSubmissionVerdict | null>(null)
  const initialSubIdRef = useRef<number | null>(null)

  const isAuthConfigured = Boolean(savedCookie || cookieInput.trim())

  useEffect(() => {
    if (savedCookie) {
      setCookieInput(savedCookie)
    }
  }, [savedCookie])

  // Record newest submission ID when modal opens to detect future submissions
  useEffect(() => {
    if (!isOpen || !problem || !problem.contest_id || !cfHandle) return

    let isMounted = true
    checkLatestCFSubmission(cfHandle, problem.contest_id, problem.index).then((sub) => {
      if (isMounted && sub) {
        initialSubIdRef.current = sub.id
      }
    })

    return () => {
      isMounted = false
    }
  }, [isOpen, problem, cfHandle])

  // Poll for live verdict updates
  useEffect(() => {
    if (!isWatching || !problem || !problem.contest_id || !cfHandle) return

    const interval = setInterval(async () => {
      if (!problem.contest_id) return
      const sub = await checkLatestCFSubmission(cfHandle, problem.contest_id, problem.index)
      if (!sub) return

      // Only track if it's a newer submission than the initial baseline
      if (!initialSubIdRef.current || sub.id > initialSubIdRef.current) {
        setLatestVerdict(sub)

        if (sub.verdict && sub.verdict !== "TESTING") {
          setIsWatching(false)
          if (sub.verdict === "OK") {
            toast.success(`Solution Accepted on Codeforces! (${sub.timeConsumedMillis}ms)`)
            if (onAccepted) onAccepted(sub)
          } else if (sub.verdict === "WRONG_ANSWER") {
            toast.error(`Wrong Answer on test ${sub.passedTestCount + 1}`)
          } else if (sub.verdict === "TIME_LIMIT_EXCEEDED") {
            toast.error(`Time Limit Exceeded on test ${sub.passedTestCount + 1}`)
          } else if (sub.verdict === "COMPILATION_ERROR") {
            toast.error("Compilation Error on Codeforces")
          }
        }
      }
    }, 2500)

    return () => clearInterval(interval)
  }, [isWatching, problem, cfHandle, onAccepted])

  if (!problem) return null

  const cfSubmitUrl = `https://codeforces.com/contest/${problem.contest_id}/submit/${problem.index}`

  const handleOpenSubmitForm = async () => {
    if (!problem.contest_id) {
      toast.error("Problem contest ID is missing")
      return
    }

    try {
      await navigator.clipboard.writeText(code)
      toast.success("Code copied to clipboard!")
    } catch {
      toast.warning("Could not copy code automatically. Please copy from the editor.")
    }

    setIsWatching(true)
    setLatestVerdict(null)
    window.open(cfSubmitUrl, "_blank")
  }

  const handleDirectSubmit = async () => {
    if (!problem.contest_id) {
      toast.error("Problem contest ID is missing")
      return
    }

    const activeCookie = cookieInput.trim() || savedCookie.trim()
    if (!activeCookie) {
      setDirectError("Codeforces authentication required.")
      setShowInlineCookieInput(true)
      return
    }

    try {
      setIsSubmittingDirect(true)
      setDirectError(null)

      if (onSaveCookie && cookieInput.trim()) {
        onSaveCookie(cookieInput.trim())
      }

      await submitToCodeforces({
        user_id: userId,
        contest_id: problem.contest_id,
        problem_index: problem.index,
        code,
        language,
        session_cookie: activeCookie,
      })

      toast.success("Solution submitted to Codeforces in background!")
      setIsWatching(true)
      setLatestVerdict(null)
    } catch (err: any) {
      setDirectError(err.message || "Direct submission failed.")
      toast.error(err.message || "Failed to submit to Codeforces")
    } finally {
      setIsSubmittingDirect(false)
    }
  }

  const lineCount = code.split("\n").length
  const byteCount = new Blob([code]).size

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl border-border/80 bg-[#0d1117] p-5 text-foreground shadow-xl sm:rounded-lg">
        {/* HEADER */}
        <DialogHeader className="space-y-1 text-left">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="rounded border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 font-mono text-xs font-semibold text-blue-400">
                {problem.contest_id}
                {problem.index}
              </span>
              <DialogTitle className="text-base font-semibold tracking-tight text-foreground">
                Submit to Codeforces
              </DialogTitle>
            </div>
            {cfHandle && (
              <span className="rounded border border-border/60 bg-surface-1 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                Handle: <strong className="text-foreground">{cfHandle}</strong>
              </span>
            )}
          </div>
          <p className="font-mono text-xs font-medium text-foreground/90">
            {problem.contest_id}
            {problem.index} · {problem.name}
          </p>
          <DialogDescription className="text-xs text-muted-foreground">
            Your current solution is ready to submit.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-3 space-y-3">
          {/* CODE DETAILS BAR */}
          <div className="flex items-center justify-between rounded-md border border-border/70 bg-surface-1/50 px-3 py-2 font-mono text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Language:</span>
              <span className="font-semibold text-foreground">
                {language.toUpperCase()} (C++20 / PyPy / Java)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Code size:</span>
              <span className="text-foreground">
                {lineCount} lines ({byteCount} B)
              </span>
            </div>
          </div>

          {/* OPTION 1 — PRIMARY (Submit directly in background) */}
          <div className="rounded-lg border border-blue-500/40 bg-blue-950/20 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-blue-400" />
                <h3 className="text-xs font-semibold text-foreground">
                  Submit directly in background
                </h3>
              </div>
              <span className="rounded border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-blue-400">
                Recommended
              </span>
            </div>

            <p className="mt-1 text-xs text-muted-foreground">
              Submit your solution to Codeforces without leaving NovaCP. Your submission is sent in
              the background and the verdict is tracked here.
            </p>

            {/* If Auth is Configured */}
            {isAuthConfigured && (
              <div className="mt-3 space-y-2">
                <Button
                  type="button"
                  onClick={handleDirectSubmit}
                  disabled={isSubmittingDirect}
                  className="w-full gap-2 bg-blue-600 font-medium text-white hover:bg-blue-500"
                  size="sm"
                >
                  {isSubmittingDirect ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Submitting in Background...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="h-3.5 w-3.5" />
                      <span>Submit in Background</span>
                    </>
                  )}
                </Button>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1 font-mono text-emerald-400">
                    <Check className="h-3 w-3" /> Codeforces authentication configured
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowInlineCookieInput(!showInlineCookieInput)}
                    className="font-mono text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                  >
                    {showInlineCookieInput ? "Hide details" : "Update cookie"}
                  </button>
                </div>
              </div>
            )}

            {/* If Auth is NOT Configured: Inline Authentication Notice */}
            {!isAuthConfigured && (
              <div className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
                <div className="flex items-start gap-2 text-amber-300">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  <div className="space-y-1">
                    <p className="font-semibold text-amber-200">
                      Codeforces authentication required
                    </p>
                    <p className="text-[11px] leading-relaxed text-amber-300/80">
                      Configure your Codeforces session in Settings to enable background submissions.
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 border-amber-500/40 bg-amber-500/20 text-xs font-medium text-amber-100 hover:bg-amber-500/30"
                    onClick={() => window.open("/settings?tab=integrations", "_blank")}
                  >
                    <span>Configure Authentication</span>
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>

                  <button
                    type="button"
                    onClick={() => setShowInlineCookieInput(!showInlineCookieInput)}
                    className="font-mono text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                  >
                    {showInlineCookieInput ? "Cancel manual paste" : "Paste cookie here directly"}
                  </button>
                </div>
              </div>
            )}

            {/* Optional Inline Cookie Input */}
            {showInlineCookieInput && (
              <div className="mt-3 space-y-2 rounded-md border border-border/70 bg-[#090d13] p-3 text-xs">
                <div className="flex items-center justify-between font-mono text-[10px] uppercase text-muted-foreground">
                  <span>Session Cookie (JSESSIONID / 39ce7)</span>
                  <KeyRound className="h-3 w-3" />
                </div>
                <input
                  type="password"
                  value={cookieInput}
                  onChange={(e) => setCookieInput(e.target.value)}
                  placeholder="Paste JSESSIONID=...; 39ce7=..."
                  className="w-full rounded border border-border bg-[#05080c] px-2.5 py-1.5 font-mono text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleDirectSubmit}
                  disabled={!cookieInput.trim() || isSubmittingDirect}
                  className="h-7 w-full bg-blue-600 text-xs text-white hover:bg-blue-500"
                >
                  Save & Submit in Background
                </Button>
              </div>
            )}

            {directError && (
              <p className="mt-2 rounded bg-rose-500/10 p-2 font-mono text-[11px] text-rose-400">
                {directError}
              </p>
            )}
          </div>

          {/* OPTION 2 — SECONDARY (Open Codeforces Submit Form) */}
          <div className="rounded-lg border border-border/70 bg-surface-1/40 p-4">
            <div className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-xs font-semibold text-foreground">
                Open Codeforces Submit Form
              </h3>
            </div>

            <p className="mt-1 text-xs text-muted-foreground">
              Open the Codeforces submission page with this problem selected. Your code is copied
              automatically.
            </p>

            <div className="mt-3 space-y-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenSubmitForm}
                className="w-full gap-1.5 border-border/80 bg-surface-2/60 text-xs font-medium text-foreground hover:bg-surface-3 hover:text-foreground"
              >
                <span>Open Submit Form</span>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Code is copied to your clipboard — just paste and submit.</span>
                <span className="font-mono text-[10px] text-muted-foreground/70">
                  Opens in new tab
                </span>
              </div>
            </div>
          </div>

          {/* LATEST VERDICT SECTION */}
          {(isWatching || latestVerdict) && (
            <div className="rounded-lg border border-border/80 bg-[#090d13] p-3.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-medium text-muted-foreground">
                  Codeforces Live Verdict
                </span>
                {latestVerdict && (
                  <a
                    href={`https://codeforces.com/contest/${problem.contest_id}/submission/${latestVerdict.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 font-mono text-[11px] text-blue-400 hover:underline"
                  >
                    <span>Submission #{latestVerdict.id}</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </div>

              {latestVerdict ? (
                <div className="mt-1.5 flex items-center gap-2 font-mono text-xs">
                  {latestVerdict.verdict === "OK" ? (
                    <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      Accepted ({latestVerdict.timeConsumedMillis}ms,{" "}
                      {Math.round(latestVerdict.memoryConsumedBytes / 1024)}KB)
                    </span>
                  ) : latestVerdict.verdict === "WRONG_ANSWER" ? (
                    <span className="flex items-center gap-1.5 font-semibold text-rose-400">
                      <XCircle className="h-4 w-4 text-rose-400" />
                      Wrong Answer on test {latestVerdict.passedTestCount + 1}
                    </span>
                  ) : latestVerdict.verdict === "TIME_LIMIT_EXCEEDED" ? (
                    <span className="flex items-center gap-1.5 font-semibold text-amber-400">
                      <Clock className="h-4 w-4 text-amber-400" />
                      Time Limit Exceeded on test {latestVerdict.passedTestCount + 1}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-foreground">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                      {latestVerdict.verdict || `Running on test ${latestVerdict.passedTestCount + 1}`}
                    </span>
                  )}
                </div>
              ) : (
                <div className="mt-1.5 flex items-center gap-2 font-mono text-xs text-blue-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Waiting for submission to appear on Codeforces...</span>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
