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
  Copy,
  Check,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Send,
  Sparkles,
  KeyRound,
  ShieldCheck,
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
  const [showCookieConfig, setShowCookieConfig] = useState(!savedCookie)
  const [copied, setCopied] = useState(false)
  const [isSubmittingDirect, setIsSubmittingDirect] = useState(false)
  const [directError, setDirectError] = useState<string | null>(null)
  const [isWatching, setIsWatching] = useState(false)
  const [latestVerdict, setLatestVerdict] = useState<CFSubmissionVerdict | null>(null)
  const initialSubIdRef = useRef<number | null>(null)

  useEffect(() => {
    if (savedCookie) {
      setCookieInput(savedCookie)
      setShowCookieConfig(false)
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
            toast.success(`🎉 Solution Accepted on Codeforces! (${sub.timeConsumedMillis}ms)`)
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

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success("Code copied to clipboard!")
    } catch {
      toast.error("Failed to copy code.")
    }
  }

  const handleAssistedSubmit = async () => {
    if (!problem.contest_id) {
      toast.error("Problem contest ID is missing")
      return
    }
    await handleCopyCode()
    setIsWatching(true)
    setLatestVerdict(null)
    window.open(cfSubmitUrl, "_blank")
    toast.info("Opening Codeforces submit page. Paste (⌘V / Ctrl+V) and click Submit!")
  }

  const handleDirectSubmit = async () => {
    if (!problem.contest_id) {
      toast.error("Problem contest ID is missing")
      return
    }

    if (!cookieInput.trim()) {
      setDirectError("Please enter your Codeforces session cookie (JSESSIONID / 39ce7).")
      setShowCookieConfig(true)
      return
    }

    try {
      setIsSubmittingDirect(true)
      setDirectError(null)

      if (onSaveCookie) {
        onSaveCookie(cookieInput.trim())
      }

      await submitToCodeforces({
        user_id: userId,
        contest_id: problem.contest_id,
        problem_index: problem.index,
        code,
        language,
        session_cookie: cookieInput.trim(),
      })

      toast.success("🚀 Successfully submitted code directly to Codeforces!")
      setIsWatching(true)
      setLatestVerdict(null)
    } catch (err: any) {
      setDirectError(err.message || "Direct submission failed.")
      toast.error(err.message || "Failed to submit to Codeforces")
    } finally {
      setIsSubmittingDirect(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl border-border bg-[#0d1117] p-6 text-foreground shadow-2xl">
        <DialogHeader className="space-y-2 text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-xs font-semibold text-primary">
                {problem.contest_id}
                {problem.index}
              </span>
              <DialogTitle className="text-base font-semibold text-foreground">
                Submit to Codeforces
              </DialogTitle>
            </div>
            {cfHandle && (
              <span className="font-mono text-xs text-muted-foreground">
                Handle: <span className="font-semibold text-foreground">{cfHandle}</span>
              </span>
            )}
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Submit your solution for <strong className="text-foreground">{problem.name}</strong>{" "}
            directly or via the Codeforces portal.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {/* Solution Stats Summary */}
          <div className="flex items-center justify-between rounded-lg border border-border/70 bg-surface-1/40 p-3 text-xs">
            <div>
              <span className="text-muted-foreground">Language: </span>
              <span className="font-mono font-semibold text-foreground">
                {language.toUpperCase()} (C++20 / PyPy / Java)
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Code size: </span>
              <span className="font-mono font-semibold text-foreground">
                {code.split("\n").length} lines ({new Blob([code]).size} bytes)
              </span>
            </div>
          </div>

          {/* Option A: Direct 1-Click Submission */}
          <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4 text-primary" />
                <h4 className="text-xs font-semibold text-foreground">
                  Direct 1-Click Submission
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowCookieConfig(!showCookieConfig)}
                className="flex items-center gap-1 font-mono text-[11px] text-primary transition-colors hover:underline"
              >
                <KeyRound className="h-3 w-3" />
                <span>{showCookieConfig ? "Hide Cookie" : "Configure Cookie"}</span>
              </button>
            </div>

            <p className="text-[11px] text-muted-foreground">
              Submits directly to Codeforces without opening browser tabs.
            </p>

            {showCookieConfig && (
              <div className="mt-2 space-y-2 rounded-lg border border-border/60 bg-[#0a0e14] p-3 text-xs">
                <div className="flex items-center justify-between">
                  <label className="font-mono text-[10px] font-medium uppercase text-muted-foreground">
                    Codeforces Session Cookie (JSESSIONID / 39ce7)
                  </label>
                  <a
                    href="https://codeforces.com"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    <span>Inspect on CF</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>
                <input
                  type="password"
                  value={cookieInput}
                  onChange={(e) => setCookieInput(e.target.value)}
                  placeholder="Paste JSESSIONID=...; 39ce7=... from browser DevTools"
                  className="w-full rounded border border-border bg-[#090d13] px-3 py-1.5 font-mono text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="text-[10px] leading-relaxed text-muted-foreground/70">
                  Tip: Open DevTools on codeforces.com (F12) → Application → Cookies → copy{" "}
                  <code>JSESSIONID</code> and <code>39ce7</code>.
                </p>
              </div>
            )}

            {directError && (
              <p className="rounded bg-rose-500/10 p-2 font-mono text-[11px] text-rose-400">
                {directError}
              </p>
            )}

            <Button
              type="button"
              onClick={handleDirectSubmit}
              disabled={isSubmittingDirect}
              className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              size="sm"
            >
              {isSubmittingDirect ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Submitting to Codeforces...</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>Submit Code Directly</span>
                </>
              )}
            </Button>
          </div>

          {/* Option B: Assisted Browser Submission */}
          <div className="space-y-2 rounded-xl border border-border/70 bg-surface-1/50 p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <h4 className="text-xs font-semibold text-foreground">
                Assisted Browser Submission (Zero-Setup)
              </h4>
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Automatically copies your code to clipboard, opens the Codeforces submit form for{" "}
              <strong>
                {problem.contest_id}
                {problem.index}
              </strong>
              , and activates live verdict tracking.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyCode}
                className="gap-1.5 text-xs"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy Code</span>
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAssistedSubmit}
                className="flex-1 gap-1.5 text-xs"
              >
                <span>Copy & Open Codeforces Submit Form</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Live Verdict Tracking Box */}
          {(isWatching || latestVerdict) && (
            <div className="space-y-2 rounded-xl border border-border bg-[#090d13] p-3.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-medium text-muted-foreground">
                  Codeforces Live Verdict
                </span>
                {latestVerdict && (
                  <a
                    href={`https://codeforces.com/contest/${problem.contest_id}/submission/${latestVerdict.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 font-mono text-[11px] text-primary hover:underline"
                  >
                    <span>Submission #{latestVerdict.id}</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </div>

              {latestVerdict ? (
                <div className="flex items-center gap-2 pt-1 font-mono text-xs">
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
                      <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                      {latestVerdict.verdict || `Running on test ${latestVerdict.passedTestCount + 1}`}
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 pt-1 font-mono text-xs text-purple-400">
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
