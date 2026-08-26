"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Play, RotateCcw, ExternalLink, Layers, Loader2, Keyboard } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { ProblemPanel } from "./problem-panel"
import { MonacoCodeEditor } from "./monaco-code-editor"
import { TerminalPanel } from "./terminal-panel"
import { DEFAULT_TEMPLATES, LANGUAGE_OPTIONS } from "@/lib/code-templates"
import { getProblemStatementDetails } from "@/lib/problem-statement-helper"
import { useRunCode } from "@/lib/code-execution"
import { useProblems } from "@/hooks/use-problems"
import { playSuccessSound } from "@/lib/sound"
import type { SupportedLanguage, TestCase, CodeRunResponse } from "@/types/code-execution"
import type { Problem } from "@/types/problems"

interface WorkspaceClientProps {
  userId?: string
  initialProblemId?: string
}

export function WorkspaceClient({ userId, initialProblemId }: WorkspaceClientProps) {
  const searchParams = useSearchParams()
  const router = useRouter()

  const problemIdParam = searchParams.get("problemId") || initialProblemId || ""

  // Fetch problem details if problemId is set
  const { data: problemsData } = useProblems({ limit: 100 })
  const problems = problemsData?.items || []

  const currentProblem: Problem | null =
    problems.find(
      (p) => p.id === problemIdParam || `${p.contest_id}${p.index}` === problemIdParam
    ) ??
    problems[0] ??
    null

  // Language & Code State
  const [language, setLanguage] = useState<SupportedLanguage>("cpp")
  const [code, setCode] = useState<string>(DEFAULT_TEMPLATES.cpp)
  const [fontSize, setFontSize] = useState<number>(14)
  const [leftPanelVisible, setLeftPanelVisible] = useState<boolean>(true)

  // Custom Testcases initialized from current problem
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [lastRunResult, setLastRunResult] = useState<CodeRunResponse | null>(null)
  const runCodeMutation = useRunCode()

  // Split Panel Width & Height Resizing
  const [leftPanelWidth, setLeftPanelWidth] = useState<number>(480)
  const [editorHeightPercent, setEditorHeightPercent] = useState<number>(58)
  const [isDraggingHorizontal, setIsDraggingHorizontal] = useState(false)
  const [isDraggingVertical, setIsDraggingVertical] = useState(false)

  // Load saved dimensions
  useEffect(() => {
    const savedWidth = localStorage.getItem("novacp_workspace_left_width")
    if (savedWidth) {
      const parsed = Number(savedWidth)
      if (parsed >= 280 && parsed <= 1200) setLeftPanelWidth(parsed)
    }
    const savedHeight = localStorage.getItem("novacp_workspace_editor_height")
    if (savedHeight) {
      const parsed = Number(savedHeight)
      if (parsed >= 25 && parsed <= 85) setEditorHeightPercent(parsed)
    }
  }, [])

  // Drag listeners
  useEffect(() => {
    if (!isDraggingHorizontal && !isDraggingVertical) return

    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingHorizontal) {
        const minWidth = 280
        const maxWidth = Math.max(minWidth, window.innerWidth - 380)
        const newWidth = Math.min(Math.max(e.clientX, minWidth), maxWidth)
        setLeftPanelWidth(newWidth)
        localStorage.setItem("novacp_workspace_left_width", String(newWidth))
      } else if (isDraggingVertical) {
        const headerHeight = 48
        const availableHeight = window.innerHeight - headerHeight
        const relativeY = e.clientY - headerHeight
        const newPercent = Math.min(Math.max((relativeY / availableHeight) * 100, 25), 80)
        setEditorHeightPercent(newPercent)
        localStorage.setItem("novacp_workspace_editor_height", String(newPercent))
      }
    }

    const handleMouseUp = () => {
      setIsDraggingHorizontal(false)
      setIsDraggingVertical(false)
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDraggingHorizontal, isDraggingVertical])

  // Update test cases when problem changes
  useEffect(() => {
    if (currentProblem) {
      const details = getProblemStatementDetails(currentProblem)
      setTestCases(details.sampleTests)
      setLastRunResult(null)
    }
  }, [currentProblem?.id])

  useEffect(() => {
    const storageKey = `novacp_workspace_${currentProblem?.id || "scratch"}_${language}`
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      setCode(saved)
    } else {
      setCode(DEFAULT_TEMPLATES[language])
    }
  }, [currentProblem?.id, language])

  const handleCodeChange = (newCode: string) => {
    setCode(newCode)
    const storageKey = `novacp_workspace_${currentProblem?.id || "scratch"}_${language}`
    localStorage.setItem(storageKey, newCode)
  }

  // Reset starter boilerplate
  const handleResetTemplate = () => {
    const defaultBoilerplate = DEFAULT_TEMPLATES[language]
    setCode(defaultBoilerplate)
    const storageKey = `novacp_workspace_${currentProblem?.id || "scratch"}_${language}`
    localStorage.setItem(storageKey, defaultBoilerplate)
  }

  // Run user code
  const handleRunCode = useCallback(async () => {
    if (runCodeMutation.isPending) return
    try {
      const result = await runCodeMutation.mutateAsync({
        language,
        code,
        test_cases: testCases.map((tc) => ({
          id: tc.id,
          input: tc.input,
          expected_output: tc.expected_output,
        })),
        time_limit_ms: 2000,
        memory_limit_mb: 256,
      })
      setLastRunResult(result)

      if (result.status === "ACCEPTED") {
        playSuccessSound()
      }

      if (result.test_cases && result.test_cases.length > 0) {
        const updated: TestCase[] = testCases.map((tc) => {
          const res = result.test_cases.find((r) => r.id === tc.id)
          if (!res) return tc
          return {
            ...tc,
            actual_output: res.actual_output,
            status: res.status,
            time_ms: res.time_ms,
            memory_kb: res.memory_kb,
            stderr: res.stderr ?? undefined,
          }
        })
        setTestCases(updated)
      }
    } catch (err: any) {
      console.error("Run code error:", err)
    }
  }, [runCodeMutation, language, code, testCases])

  // Keyboard Shortcuts Registration
  const [showShortcutsModal, setShowShortcutsModal] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘↵ or Ctrl+Enter -> Run Code
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        handleRunCode()
        return
      }

      // ⌘B -> Toggle Left Problem Statement Panel
      if (e.key === "b" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setLeftPanelVisible((prev) => !prev)
        return
      }

      // ⌘/ or Shift+? -> Toggle Shortcuts Guide
      if (
        (e.key === "/" && (e.metaKey || e.ctrlKey)) ||
        (e.key === "?" &&
          !e.metaKey &&
          !e.ctrlKey &&
          document.activeElement?.tagName !== "INPUT" &&
          document.activeElement?.tagName !== "TEXTAREA")
      ) {
        e.preventDefault()
        setShowShortcutsModal((prev) => !prev)
        return
      }

      // ESC -> Close shortcuts modal if open
      if (e.key === "Escape" && showShortcutsModal) {
        setShowShortcutsModal(false)
        return
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleRunCode, showShortcutsModal])

  const handleSelectProblem = (id: string) => {
    router.push(`/solve?problemId=${id}`)
  }

  return (
    <div
      className={cn(
        "flex h-screen w-full flex-col overflow-hidden bg-background text-foreground",
        (isDraggingHorizontal || isDraggingVertical) && "cursor-col-resize select-none"
      )}
    >
      <header className="z-10 flex h-12 shrink-0 items-center justify-between border-b border-border bg-surface-1 px-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setLeftPanelVisible(!leftPanelVisible)}
            title={leftPanelVisible ? "Hide Problem Statement" : "Show Problem Statement"}
            className="text-muted-foreground hover:text-foreground"
          >
            <Layers className="h-4 w-4" />
          </Button>

          <select
            value={currentProblem?.id || ""}
            onChange={(e) => handleSelectProblem(e.target.value)}
            className="max-w-[220px] truncate rounded-md border border-border bg-surface-2 px-2.5 py-1 font-mono text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:max-w-xs"
          >
            {problems.map((p) => (
              <option key={p.id} value={p.id}>
                {p.contest_id}
                {p.index} · {p.name} {p.rating ? `(${p.rating})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
            className="rounded-md border border-border bg-surface-2 px-2.5 py-1 font-mono text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetTemplate}
            title="Reset boilerplate"
            className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3" />
            <span className="hidden sm:inline">Reset</span>
          </Button>

          <select
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="hidden rounded border border-border bg-surface-2 px-2 py-1 font-mono text-xs text-muted-foreground focus:outline-none md:block"
          >
            <option value={12}>12px</option>
            <option value={14}>14px</option>
            <option value={16}>16px</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleRunCode}
            disabled={runCodeMutation.isPending}
            className="h-8 gap-1.5 bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-sm transition-transform hover:bg-primary/90 active:scale-[0.98]"
          >
            {runCodeMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-current" />
            )}
            <span>Run Code</span>
            <kbd className="py-0.2 ml-1 hidden rounded bg-primary-foreground/20 px-1 font-mono text-[10px] lg:inline">
              ⌘↵
            </kbd>
          </Button>

          {currentProblem && (
            <a
              href={`https://codeforces.com/problemset/problem/${currentProblem.contest_id}/${currentProblem.index}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground sm:flex"
            >
              <span>Submit on CF</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          )}

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setShowShortcutsModal(true)}
            title="Keyboard Shortcuts (⌘/ or ?)"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <Keyboard className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="relative flex flex-1 overflow-hidden">
        {leftPanelVisible && (
          <div
            style={{ width: `${leftPanelWidth}px` }}
            className="hidden h-full shrink-0 overflow-hidden bg-surface-1/30 md:block"
          >
            <ProblemPanel
              problem={currentProblem}
              onLoadSampleTests={(samples) => setTestCases(samples)}
            />
          </div>
        )}

        {leftPanelVisible && (
          <div
            onMouseDown={(e) => {
              e.preventDefault()
              setIsDraggingHorizontal(true)
            }}
            onDoubleClick={() => setLeftPanelWidth(480)}
            className={cn(
              "group z-30 -mr-1 hidden w-1.5 shrink-0 cursor-col-resize items-center justify-center transition-all hover:w-2 md:flex",
              isDraggingHorizontal ? "w-2 bg-primary" : "bg-border/60 hover:bg-primary/50"
            )}
          >
            <div className="h-8 w-1 rounded-full bg-muted-foreground/30 transition-colors group-hover:bg-primary-foreground/80" />
          </div>
        )}

        <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
          <div
            style={{ height: `${editorHeightPercent}%` }}
            className="min-h-[160px] shrink-0 overflow-hidden"
          >
            <MonacoCodeEditor
              language={language}
              value={code}
              onChange={handleCodeChange}
              fontSize={fontSize}
              onRun={handleRunCode}
            />
          </div>

          <div
            onMouseDown={(e) => {
              e.preventDefault()
              setIsDraggingVertical(true)
            }}
            onDoubleClick={() => setEditorHeightPercent(58)}
            className={cn(
              "group z-20 flex h-1.5 shrink-0 cursor-row-resize items-center justify-center border-t border-border/50 transition-all hover:h-2",
              isDraggingVertical ? "h-2 bg-primary" : "bg-surface-2/60 hover:bg-primary/50"
            )}
          >
            <div className="h-1 w-8 rounded-full bg-muted-foreground/30 transition-colors group-hover:bg-primary-foreground/80" />
          </div>

          <div className="min-h-[140px] flex-1 overflow-hidden">
            <TerminalPanel
              testCases={testCases}
              onChangeTestCases={setTestCases}
              lastRunResult={lastRunResult}
              isRunning={runCodeMutation.isPending}
            />
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Dialog */}
      <Dialog open={showShortcutsModal} onOpenChange={setShowShortcutsModal}>
        <DialogContent className="gap-0 overflow-hidden border-border/80 bg-card/95 p-0 shadow-2xl backdrop-blur-xl sm:max-w-md">
          <DialogHeader className="border-b border-border/60 bg-surface-1/40 p-5 pb-3">
            <div className="mb-1 flex items-center gap-2">
              <div className="rounded-md border border-primary/20 bg-primary/10 p-1 text-primary">
                <Keyboard className="h-4 w-4" />
              </div>
              <DialogTitle className="text-base font-bold text-foreground">
                Workspace Hotkeys
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Essential keyboard shortcuts for rapid competitive programming workflows.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2.5 p-5 font-mono text-xs">
            <div className="flex items-center justify-between rounded-lg border border-border/40 bg-surface-1/50 p-2">
              <span className="font-sans text-muted-foreground">Execute Code (Sandbox)</span>
              <div className="flex items-center gap-1">
                <kbd className="rounded border border-border bg-muted px-2 py-0.5 text-[11px] font-bold text-foreground">
                  ⌘
                </kbd>
                <kbd className="rounded border border-border bg-muted px-2 py-0.5 text-[11px] font-bold text-foreground">
                  ↵ Enter
                </kbd>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/40 bg-surface-1/50 p-2">
              <span className="font-sans text-muted-foreground">Command Palette / Search</span>
              <div className="flex items-center gap-1">
                <kbd className="rounded border border-border bg-muted px-2 py-0.5 text-[11px] font-bold text-foreground">
                  ⌘
                </kbd>
                <kbd className="rounded border border-border bg-muted px-2 py-0.5 text-[11px] font-bold text-foreground">
                  K
                </kbd>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/40 bg-surface-1/50 p-2">
              <span className="font-sans text-muted-foreground">Toggle Problem Statement</span>
              <div className="flex items-center gap-1">
                <kbd className="rounded border border-border bg-muted px-2 py-0.5 text-[11px] font-bold text-foreground">
                  ⌘
                </kbd>
                <kbd className="rounded border border-border bg-muted px-2 py-0.5 text-[11px] font-bold text-foreground">
                  B
                </kbd>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/40 bg-surface-1/50 p-2">
              <span className="font-sans text-muted-foreground">Open Control Center</span>
              <div className="flex items-center gap-1">
                <kbd className="rounded border border-border bg-muted px-2 py-0.5 text-[11px] font-bold text-foreground">
                  ⌘
                </kbd>
                <kbd className="rounded border border-border bg-muted px-2 py-0.5 text-[11px] font-bold text-foreground">
                  S
                </kbd>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/40 bg-surface-1/50 p-2">
              <span className="font-sans text-muted-foreground">Close Modals / Overlays</span>
              <kbd className="rounded border border-border bg-muted px-2 py-0.5 text-[11px] font-bold text-foreground">
                ESC
              </kbd>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/40 bg-surface-1/50 p-2">
              <span className="font-sans text-muted-foreground">Toggle Shortcuts Guide</span>
              <div className="flex items-center gap-1">
                <kbd className="rounded border border-border bg-muted px-2 py-0.5 text-[11px] font-bold text-foreground">
                  ⌘
                </kbd>
                <kbd className="rounded border border-border bg-muted px-2 py-0.5 text-[11px] font-bold text-foreground">
                  /
                </kbd>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
