"use client"

import React, { useState } from "react"
import { Terminal, CheckCircle2, XCircle, AlertTriangle, Clock, Cpu, Play, Loader2, Sparkles, FileCode2 } from "lucide-react"
import { TestcasesPanel } from "./testcases-panel"
import type { CodeRunResponse, TestCase } from "@/types/code-execution"

interface TerminalPanelProps {
  testCases: TestCase[]
  onChangeTestCases: (testCases: TestCase[]) => void
  lastRunResult?: CodeRunResponse | null
  isRunning?: boolean
}

export function TerminalPanel({
  testCases,
  onChangeTestCases,
  lastRunResult,
  isRunning = false,
}: TerminalPanelProps) {
  const [activeTab, setActiveTab] = useState<"tests" | "console" | "compiler">("tests")

  const getOverallStatusPill = () => {
    if (isRunning) {
      return (
        <span className="flex items-center gap-1.5 text-xs font-mono font-semibold text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-md border border-purple-500/30 animate-pulse">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Running Sandboxed Execution...
        </span>
      )
    }

    if (!lastRunResult) {
      return (
        <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1.5">
          <Play className="h-3 w-3 text-muted-foreground/60" /> Ready to run (⌘+Enter)
        </span>
      )
    }

    if (lastRunResult.status === "ACCEPTED") {
      return (
        <span className="flex items-center gap-1.5 text-xs font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/30">
          <CheckCircle2 className="h-3.5 w-3.5" /> All Tests Passed ({lastRunResult.total_time_ms}ms)
        </span>
      )
    }

    if (lastRunResult.status === "WRONG_ANSWER") {
      return (
        <span className="flex items-center gap-1.5 text-xs font-mono font-semibold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-md border border-rose-500/30">
          <XCircle className="h-3.5 w-3.5" /> Wrong Answer
        </span>
      )
    }

    if (lastRunResult.status === "COMPILATION_ERROR") {
      return (
        <span className="flex items-center gap-1.5 text-xs font-mono font-semibold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-md border border-rose-500/30">
          <AlertTriangle className="h-3.5 w-3.5" /> Compilation Error
        </span>
      )
    }

    if (lastRunResult.status === "TIME_LIMIT_EXCEEDED") {
      return (
        <span className="flex items-center gap-1.5 text-xs font-mono font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/30">
          <Clock className="h-3.5 w-3.5" /> Time Limit Exceeded
        </span>
      )
    }

    return (
      <span className="flex items-center gap-1.5 text-xs font-mono font-semibold text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-md border border-orange-500/30">
        <AlertTriangle className="h-3.5 w-3.5" /> {lastRunResult.status}
      </span>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[#0a0e14] border-t border-border">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-border/80 px-4 py-2 bg-surface-1">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("tests")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              activeTab === "tests"
                ? "bg-surface-2 text-foreground font-semibold border border-border"
                : "text-muted-foreground hover:text-foreground hover:bg-surface-2/40"
            }`}
          >
            <span>Custom Testcases</span>
            <span className="px-1.5 py-0.2 rounded-full bg-surface-1 border text-[10px] font-mono">
              {testCases.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("console")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              activeTab === "console"
                ? "bg-surface-2 text-foreground font-semibold border border-border"
                : "text-muted-foreground hover:text-foreground hover:bg-surface-2/40"
            }`}
          >
            <Terminal className="h-3.5 w-3.5" />
            <span>Output Console</span>
          </button>

          {lastRunResult?.compile_output && (
            <button
              type="button"
              onClick={() => setActiveTab("compiler")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors text-rose-400 ${
                activeTab === "compiler"
                  ? "bg-rose-500/10 font-semibold border border-rose-500/30"
                  : "hover:bg-rose-500/10"
              }`}
            >
              <FileCode2 className="h-3.5 w-3.5" />
              <span>Compiler Diagnostics</span>
            </button>
          )}
        </div>

        {/* Status Pill & Summary Metrics */}
        <div className="flex items-center gap-3">
          {lastRunResult && (
            <div className="hidden sm:flex items-center gap-3 text-[11px] font-mono text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> {lastRunResult.total_time_ms}ms
              </span>
              <span className="flex items-center gap-1">
                <Cpu className="h-3 w-3" /> {lastRunResult.peak_memory_kb}KB
              </span>
            </div>
          )}
          {getOverallStatusPill()}
        </div>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "tests" && (
          <TestcasesPanel testCases={testCases} onChangeTestCases={onChangeTestCases} />
        )}

        {activeTab === "console" && (
          <div className="h-full p-4 overflow-y-auto font-mono text-xs text-foreground/90 space-y-2 bg-[#090d13]">
            {lastRunResult ? (
              <>
                <div className="text-muted-foreground text-[11px]">
                  [NovaCP Execution Sandbox] Language execution completed with status:{" "}
                  <strong className="text-foreground">{lastRunResult.status}</strong>
                </div>
                {lastRunResult.test_cases.map((tc, idx) => (
                  <div key={tc.id} className="p-3 rounded bg-surface-1/60 border border-border space-y-1">
                    <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                      <span>Test Case #{idx + 1} ({tc.id})</span>
                      <span className="font-semibold">{tc.status} · {tc.time_ms}ms</span>
                    </div>
                    {tc.actual_output && (
                      <div className="pt-1">
                        <span className="text-[10px] text-muted-foreground">stdout:</span>
                        <pre className="text-emerald-300 whitespace-pre-wrap">{tc.actual_output}</pre>
                      </div>
                    )}
                    {tc.stderr && (
                      <div className="pt-1">
                        <span className="text-[10px] text-rose-400">stderr:</span>
                        <pre className="text-rose-300 whitespace-pre-wrap">{tc.stderr}</pre>
                      </div>
                    )}
                  </div>
                ))}
              </>
            ) : (
              <div className="text-muted-foreground">
                No execution logs yet. Write code and hit Run Code to see execution output.
              </div>
            )}
          </div>
        )}

        {activeTab === "compiler" && (
          <div className="h-full p-4 overflow-y-auto font-mono text-xs bg-rose-950/20 text-rose-300 space-y-1">
            <div className="font-semibold pb-1 border-b border-rose-500/20">Compiler Output:</div>
            <pre className="whitespace-pre-wrap">{lastRunResult?.compile_output || "No compilation errors."}</pre>
          </div>
        )}
      </div>
    </div>
  )
}
