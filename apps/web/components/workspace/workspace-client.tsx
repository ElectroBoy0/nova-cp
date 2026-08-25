"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import {
  Play,
  RotateCcw,
  ExternalLink,
  Layers,
  Loader2,
  Keyboard,
} from "lucide-react"
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
    problems.find((p) => p.id === problemIdParam || `${p.contest_id}${p.index}` === problemIdParam) ??
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
      if ((e.key === "/" && (e.metaKey || e.ctrlKey)) || (e.key === "?" && !e.metaKey && !e.ctrlKey && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA")) {
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
        "flex h-screen w-full flex-col bg-background text-foreground overflow-hidden",
        (isDraggingHorizontal || isDraggingVertical) && "select-none cursor-col-resize"
      )}
    >
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-surface-1 px-4 z-10">
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
            className="px-2.5 py-1 text-xs font-mono font-medium rounded-md bg-surface-2 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary max-w-[220px] sm:max-w-xs truncate"
          >
            {problems.map((p) => (
              <option key={p.id} value={p.id}>
                {p.contest_id}{p.index} · {p.name} {p.rating ? `(${p.rating})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
            className="px-2.5 py-1 text-xs font-mono font-medium rounded-md bg-surface-2 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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
            className="text-muted-foreground hover:text-foreground text-xs gap-1 h-7"
          >
            <RotateCcw className="h-3 w-3" />
            <span className="hidden sm:inline">Reset</span>
          </Button>

          <select
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="hidden md:block px-2 py-1 text-xs font-mono rounded bg-surface-2 border border-border text-muted-foreground focus:outline-none"
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
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-8 px-3 gap-1.5 shadow-sm active:scale-[0.98] transition-transform"
          >
            {runCodeMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-current" />
            )}
            <span>Run Code</span>
            <kbd className="hidden lg:inline ml-1 px-1 py-0.2 rounded bg-primary-foreground/20 text-[10px] font-mono">
              ⌘↵
            </kbd>
          </Button>

          {currentProblem && (
            <a
              href={`https://codeforces.com/problemset/problem/${currentProblem.contest_id}/${currentProblem.index}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-surface-2 transition-colors"
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
            className="text-muted-foreground hover:text-foreground h-8 w-8"
          >
            <Keyboard className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {leftPanelVisible && (
          <div
            style={{ width: `${leftPanelWidth}px` }}
            className="hidden md:block h-full overflow-hidden shrink-0 bg-surface-1/30"
          >
            <ProblemPanel problem={currentProblem} onLoadSampleTests={(samples) => setTestCases(samples)} />
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
              "hidden md:flex w-1.5 hover:w-2 -mr-1 z-30 cursor-col-resize items-center justify-center transition-all group shrink-0",
              isDraggingHorizontal ? "bg-primary w-2" : "hover:bg-primary/50 bg-border/60"
            )}
          >
            <div className="h-8 w-1 rounded-full bg-muted-foreground/30 group-hover:bg-primary-foreground/80 transition-colors" />
          </div>
        )}

        <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
          <div
            style={{ height: `${editorHeightPercent}%` }}
            className="min-h-[160px] overflow-hidden shrink-0"
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
              "h-1.5 hover:h-2 z-20 cursor-row-resize flex items-center justify-center transition-all group shrink-0 border-t border-border/50",
              isDraggingVertical ? "bg-primary h-2" : "hover:bg-primary/50 bg-surface-2/60"
            )}
          >
            <div className="w-8 h-1 rounded-full bg-muted-foreground/30 group-hover:bg-primary-foreground/80 transition-colors" />
          </div>

          <div className="flex-1 min-h-[140px] overflow-hidden">
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
        <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border-border/80 p-0 gap-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-5 pb-3 border-b border-border/60 bg-surface-1/40">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1 rounded-md bg-primary/10 text-primary border border-primary/20">
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

          <div className="p-5 space-y-2.5 text-xs font-mono">
            <div className="flex items-center justify-between p-2 rounded-lg bg-surface-1/50 border border-border/40">
              <span className="font-sans text-muted-foreground">Execute Code (Sandbox)</span>
              <div className="flex items-center gap-1">
                <kbd className="px-2 py-0.5 rounded bg-muted border border-border text-[11px] font-bold text-foreground">⌘</kbd>
                <kbd className="px-2 py-0.5 rounded bg-muted border border-border text-[11px] font-bold text-foreground">↵ Enter</kbd>
              </div>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-surface-1/50 border border-border/40">
              <span className="font-sans text-muted-foreground">Command Palette / Search</span>
              <div className="flex items-center gap-1">
                <kbd className="px-2 py-0.5 rounded bg-muted border border-border text-[11px] font-bold text-foreground">⌘</kbd>
                <kbd className="px-2 py-0.5 rounded bg-muted border border-border text-[11px] font-bold text-foreground">K</kbd>
              </div>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-surface-1/50 border border-border/40">
              <span className="font-sans text-muted-foreground">Toggle Problem Statement</span>
              <div className="flex items-center gap-1">
                <kbd className="px-2 py-0.5 rounded bg-muted border border-border text-[11px] font-bold text-foreground">⌘</kbd>
                <kbd className="px-2 py-0.5 rounded bg-muted border border-border text-[11px] font-bold text-foreground">B</kbd>
              </div>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-surface-1/50 border border-border/40">
              <span className="font-sans text-muted-foreground">Open Control Center</span>
              <div className="flex items-center gap-1">
                <kbd className="px-2 py-0.5 rounded bg-muted border border-border text-[11px] font-bold text-foreground">⌘</kbd>
                <kbd className="px-2 py-0.5 rounded bg-muted border border-border text-[11px] font-bold text-foreground">S</kbd>
              </div>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-surface-1/50 border border-border/40">
              <span className="font-sans text-muted-foreground">Close Modals / Overlays</span>
              <kbd className="px-2 py-0.5 rounded bg-muted border border-border text-[11px] font-bold text-foreground">ESC</kbd>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-surface-1/50 border border-border/40">
              <span className="font-sans text-muted-foreground">Toggle Shortcuts Guide</span>
              <div className="flex items-center gap-1">
                <kbd className="px-2 py-0.5 rounded bg-muted border border-border text-[11px] font-bold text-foreground">⌘</kbd>
                <kbd className="px-2 py-0.5 rounded bg-muted border border-border text-[11px] font-bold text-foreground">/</kbd>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
