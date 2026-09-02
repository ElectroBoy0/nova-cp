"use client"

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Play, RotateCcw, ExternalLink, Layers, Loader2, Keyboard, Minimize2 } from "lucide-react"
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
import { useProblems, useProblemStatement, useProblemSearch } from "@/hooks/use-problems"
import { useSnippets } from "@/hooks/use-snippets"
import { ProblemSearchCombobox } from "./problem-search-combobox"
import { SolveTimer } from "./solve-timer"
import { recordSolveSession } from "@/lib/solve-history"
import { loadTimerState } from "@/lib/solve-timer"
import { playSuccessSound } from "@/lib/sound"
import type { SupportedLanguage, TestCase, CodeRunResponse } from "@/types/code-execution"
import type { Problem, ProblemSearchResult } from "@/types/problems"

interface WorkspaceClientProps {
  userId?: string
  initialProblemId?: string
}

export function WorkspaceClient({ userId, initialProblemId }: WorkspaceClientProps) {
  const searchParams = useSearchParams()
  const router = useRouter()

  const problemIdParam = searchParams.get("problemId") || initialProblemId || ""
  const searchQueryParam =
    searchParams.get("search") || searchParams.get("name") || searchParams.get("problemName") || ""

  // Fetch initial problem set for default fallback
  const { data: problemsData } = useProblems({ limit: 50 })
  const problems = problemsData?.items || []

  // Dynamic search if query parameter provided
  const { data: searchResults } = useProblemSearch({
    q: searchQueryParam,
    limit: 5,
  })

  const [selectedProblem, setSelectedProblem] = useState<Problem | ProblemSearchResult | null>(null)

  // Auto-select problem matching search query if no specific problemIdParam is given
  useEffect(() => {
    if (
      !problemIdParam &&
      searchQueryParam &&
      searchResults?.results &&
      searchResults.results.length > 0
    ) {
      const exact = searchResults.results.find(
        (p: ProblemSearchResult) =>
          (p.name || p.title || "").toLowerCase() === searchQueryParam.toLowerCase()
      )
      setSelectedProblem(exact || searchResults.results[0] || null)
    }
  }, [searchResults, problemIdParam, searchQueryParam])

  // Load problem statement if problemIdParam or selectedProblem is specified
  const effectiveProblemId =
    problemIdParam ||
    (selectedProblem?.contest_id && selectedProblem?.index
      ? `${selectedProblem.contest_id}${selectedProblem.index}`
      : selectedProblem?.id)
  const { data: stmtData } = useProblemStatement(effectiveProblemId || undefined)

  // Load user custom snippets for editor auto-completion
  const { data: snippetsData } = useSnippets(userId, { limit: 100 })
  const userSnippets = snippetsData?.items || []

  const currentProblem: Problem | null = useMemo(() => {
    if (selectedProblem) {
      return {
        id: selectedProblem.id,
        platform: selectedProblem.platform,
        platform_problem_id: selectedProblem.platform_problem_id,
        contest_id: selectedProblem.contest_id,
        index: selectedProblem.index,
        name: selectedProblem.name,
        rating: selectedProblem.rating,
        tags: selectedProblem.tags || [],
        url: selectedProblem.url,
        solved_count: selectedProblem.solved_count,
      }
    }
    if (problemIdParam) {
      const found = problems.find(
        (p) => p.id === problemIdParam || `${p.contest_id}${p.index}` === problemIdParam
      )
      if (found) return found

      if (stmtData) {
        return {
          id: stmtData.problem_id || problemIdParam,
          platform: "codeforces",
          platform_problem_id: `CF_${stmtData.contest_id}_${stmtData.index}`,
          contest_id: stmtData.contest_id,
          index: stmtData.index,
          name: stmtData.name || stmtData.title,
          rating: stmtData.rating,
          tags: stmtData.tags || [],
          url:
            stmtData.cf_url ||
            `https://codeforces.com/contest/${stmtData.contest_id}/problem/${stmtData.index}`,
          solved_count: null,
        }
      }
    }
    return problems[0] ?? null
  }, [selectedProblem, problemIdParam, problems, stmtData])

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

  // Problem font size & focus maximize state
  const [problemFontSize, setProblemFontSize] = useState<number>(15)
  const [isProblemMaximized, setIsProblemMaximized] = useState<boolean>(false)

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
    const savedProblemFontSize = localStorage.getItem("novacp_workspace_problem_font_size")
    if (savedProblemFontSize) {
      const parsed = Number(savedProblemFontSize)
      if (parsed >= 12 && parsed <= 24) setProblemFontSize(parsed)
    }
  }, [])

  const leftWidthRef = useRef(leftPanelWidth)
  leftWidthRef.current = leftPanelWidth

  const editorHeightRef = useRef(editorHeightPercent)
  editorHeightRef.current = editorHeightPercent

  // Escape key exits problem maximized focus mode, and trigger Monaco layout update
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isProblemMaximized) {
        setIsProblemMaximized(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isProblemMaximized])

  useEffect(() => {
    // When focus/maximize toggles, notify Monaco to resize layout immediately
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event("resize"))
    }, 50)
    return () => clearTimeout(timer)
  }, [isProblemMaximized, leftPanelVisible])

  // Drag listeners with rAF and debounced storage for buttery smooth 120fps resizing
  useEffect(() => {
    if (!isDraggingHorizontal && !isDraggingVertical) return

    let rafId: number | null = null

    const handleMouseMove = (e: MouseEvent) => {
      if (rafId !== null) return

      rafId = requestAnimationFrame(() => {
        rafId = null
        if (isDraggingHorizontal) {
          const minWidth = 280
          const maxWidth = Math.max(minWidth, window.innerWidth - 380)
          const newWidth = Math.min(Math.max(e.clientX, minWidth), maxWidth)
          leftWidthRef.current = newWidth
          setLeftPanelWidth(newWidth)
        } else if (isDraggingVertical) {
          const headerHeight = 48
          const availableHeight = window.innerHeight - headerHeight
          const relativeY = e.clientY - headerHeight
          const newPercent = Math.min(Math.max((relativeY / availableHeight) * 100, 25), 80)
          editorHeightRef.current = newPercent
          setEditorHeightPercent(newPercent)
        }
      })
    }

    const handleMouseUp = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      setIsDraggingHorizontal(false)
      setIsDraggingVertical(false)
      localStorage.setItem("novacp_workspace_left_width", String(leftWidthRef.current))
      localStorage.setItem("novacp_workspace_editor_height", String(editorHeightRef.current))
      window.dispatchEvent(new Event("resize"))
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId)
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

  const handleSelectProblem = (problem: Problem | ProblemSearchResult) => {
    setSelectedProblem(problem)
    const probParam = problem.contest_id ? `${problem.contest_id}${problem.index}` : problem.id
    router.replace(`/solve?problemId=${probParam}`, { scroll: false })
  }

  return (
    <div
      className={cn(
        "flex h-screen w-full flex-col overflow-hidden bg-background text-foreground",
        (isDraggingHorizontal || isDraggingVertical) && "cursor-col-resize select-none"
      )}
    >
      <header className="z-10 flex h-12 shrink-0 items-center justify-between border-b border-border bg-surface-1 px-4">
        <div className="flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              if (isProblemMaximized) {
                setIsProblemMaximized(false)
              } else {
                setLeftPanelVisible(!leftPanelVisible)
              }
            }}
            title={leftPanelVisible ? "Hide Problem Statement" : "Show Problem Statement"}
            className="text-muted-foreground hover:text-foreground"
          >
            <Layers className="h-4 w-4" />
          </Button>

          {isProblemMaximized && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsProblemMaximized(false)}
              className="h-7 gap-1 border-primary/40 bg-primary/10 text-xs font-medium text-primary hover:bg-primary/20"
              title="Restore side-by-side editor (Esc)"
            >
              <Minimize2 className="h-3.5 w-3.5" />
              <span>Exit Focus Mode</span>
            </Button>
          )}

          <ProblemSearchCombobox
            currentProblem={currentProblem}
            onSelectProblem={handleSelectProblem}
            userId={userId}
          />
        </div>

        <div className="flex items-center gap-2">
          <SolveTimer
            problemId={currentProblem?.id || problemIdParam || "default"}
            problemName={currentProblem?.name || "Problem"}
            virtualContestEndTime={
              searchParams.get("virtualContestEndTime")
                ? Number(searchParams.get("virtualContestEndTime"))
                : null
            }
          />

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
              onClick={() => {
                const saved = loadTimerState(currentProblem.id)
                const duration = saved?.elapsedSolvingSeconds || saved?.seconds || 0
                recordSolveSession({
                  problemId: currentProblem.id,
                  problemName: currentProblem.name,
                  durationSeconds: duration,
                  startedAt: saved?.sessionStartedAt || new Date().toISOString(),
                  mode: saved?.mode || "count_up",
                  status: "submitted",
                  language,
                })
              }}
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
            style={isProblemMaximized ? undefined : { width: `${leftPanelWidth}px` }}
            className={cn(
              "h-full overflow-hidden bg-surface-1/30",
              !isDraggingHorizontal && "transition-[width] duration-150 ease-out",
              isProblemMaximized ? "w-full flex-1" : "hidden shrink-0 md:block"
            )}
          >
            <ProblemPanel
              problem={currentProblem}
              onLoadSampleTests={(samples) => setTestCases(samples)}
              fontSize={problemFontSize}
              onFontSizeChange={(newSize) => {
                setProblemFontSize(newSize)
                localStorage.setItem("novacp_workspace_problem_font_size", String(newSize))
              }}
              isMaximized={isProblemMaximized}
              onToggleMaximize={() => setIsProblemMaximized((prev) => !prev)}
              onSetWidthPreset={(ratio) => {
                setIsProblemMaximized(false)
                const newWidth = Math.min(
                  Math.max(Math.round(window.innerWidth * ratio), 280),
                  window.innerWidth - 380
                )
                setLeftPanelWidth(newWidth)
                localStorage.setItem("novacp_workspace_left_width", String(newWidth))
              }}
            />
          </div>
        )}

        {leftPanelVisible && !isProblemMaximized && (
          <div
            onMouseDown={(e) => {
              e.preventDefault()
              setIsDraggingHorizontal(true)
            }}
            onDoubleClick={() => setLeftPanelWidth(Math.round(window.innerWidth * 0.5))}
            className={cn(
              "group z-30 -mr-1 hidden w-1.5 shrink-0 cursor-col-resize items-center justify-center transition-all hover:w-2 md:flex",
              isDraggingHorizontal ? "w-2 bg-primary" : "bg-border/60 hover:bg-primary/50"
            )}
          >
            <div className="h-8 w-1 rounded-full bg-muted-foreground/30 transition-colors group-hover:bg-primary-foreground/80" />
          </div>
        )}

        {/* Keep editor mounted in DOM so toggling focus mode is instantaneous (0ms) without cold-starting Monaco */}
        <div
          className={cn(
            "flex h-full min-w-0 flex-1 flex-col overflow-hidden",
            isProblemMaximized && "hidden"
          )}
        >
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
              userSnippets={userSnippets}
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

        {/* High-speed capture overlay during drag to prevent Monaco/text event hijacking */}
        {(isDraggingHorizontal || isDraggingVertical) && (
          <div
            className={cn(
              "fixed inset-0 z-50 select-none bg-transparent",
              isDraggingHorizontal ? "cursor-col-resize" : "cursor-row-resize"
            )}
          />
        )}
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
