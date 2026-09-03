"use client"

import React, { useState } from "react"
import { Plus, Trash2, CheckCircle2, XCircle, AlertTriangle, Clock, Cpu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { TestCase } from "@/types/code-execution"

interface TestcasesPanelProps {
  testCases: TestCase[]
  onChangeTestCases: (testCases: TestCase[]) => void
}

export function TestcasesPanel({ testCases, onChangeTestCases }: TestcasesPanelProps) {
  const [activeTab, setActiveTab] = useState<string>(testCases[0]?.id || "1")

  const currentCase = testCases.find((tc) => tc.id === activeTab) || testCases[0]

  const handleAddTestCase = () => {
    const newId = `custom-${Date.now()}`
    const newCase: TestCase = {
      id: newId,
      name: `Test ${testCases.length + 1}`,
      input: "",
      expected_output: "",
    }
    const updated = [...testCases, newCase]
    onChangeTestCases(updated)
    setActiveTab(newId)
  }

  const handleDeleteTestCase = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (testCases.length <= 1) return
    const updated = testCases.filter((tc) => tc.id !== id)
    onChangeTestCases(updated)
    if (activeTab === id && updated[0]) {
      setActiveTab(updated[0].id)
    }
  }

  const handleUpdateCurrent = (field: "input" | "expected_output", value: string) => {
    if (!currentCase) return
    const updated = testCases.map((tc) =>
      tc.id === currentCase.id ? { ...tc, [field]: value } : tc
    )
    onChangeTestCases(updated)
  }

  const getStatusBadge = (status?: string) => {
    if (!status || status === "PENDING") return null
    if (status === "PASSED") {
      return (
        <span className="flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-emerald-400">
          <CheckCircle2 className="h-3 w-3" /> Passed
        </span>
      )
    }
    if (status === "WRONG_ANSWER") {
      return (
        <span className="flex items-center gap-1 rounded border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-rose-400">
          <XCircle className="h-3 w-3" /> Wrong Answer
        </span>
      )
    }
    if (status === "TIME_LIMIT_EXCEEDED") {
      return (
        <span className="flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-amber-400">
          <Clock className="h-3 w-3" /> Time Limit Exceeded
        </span>
      )
    }
    return (
      <span className="flex items-center gap-1 rounded border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-orange-400">
        <AlertTriangle className="h-3 w-3" /> {status}
      </span>
    )
  }

  return (
    <div className="flex h-full flex-col bg-surface-1/40">
      {/* Testcase Tabs Bar */}
      <div className="flex items-center justify-between border-b border-border/80 bg-surface-1/80 px-3 py-1.5">
        <div className="scrollbar-none flex items-center gap-1.5 overflow-x-auto">
          {testCases.map((tc, index) => {
            const isActive = tc.id === (currentCase?.id || activeTab)
            const dotColor =
              tc.status === "PASSED"
                ? "bg-emerald-400"
                : tc.status === "WRONG_ANSWER"
                  ? "bg-rose-400"
                  : tc.status === "TIME_LIMIT_EXCEEDED"
                    ? "bg-amber-400"
                    : tc.status === "RUNTIME_ERROR"
                      ? "bg-orange-400"
                      : "bg-muted-foreground/40"

            return (
              <button
                key={tc.id}
                type="button"
                onClick={() => setActiveTab(tc.id)}
                className={`group flex items-center gap-1.5 rounded px-2.5 py-1 font-mono text-xs transition-all ${
                  isActive
                    ? "shadow-xs border border-border bg-surface-2 font-semibold text-foreground"
                    : "text-muted-foreground hover:bg-surface-2/50 hover:text-foreground"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
                <span>{tc.name || `Case ${index + 1}`}</span>
                {testCases.length > 1 && (
                  <Trash2
                    onClick={(e) => handleDeleteTestCase(tc.id, e)}
                    className="ml-1 h-3 w-3 opacity-0 transition-opacity hover:text-rose-400 group-hover:opacity-100"
                  />
                )}
              </button>
            )
          })}

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleAddTestCase}
            aria-label="Add testcase"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Status Pill & Runtime info */}
        {currentCase && (
          <div className="flex items-center gap-2">
            {getStatusBadge(currentCase.status)}
            {currentCase.time_ms !== undefined && currentCase.time_ms > 0 && (
              <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                <Clock className="h-3 w-3" /> {currentCase.time_ms}ms
              </span>
            )}
            {currentCase.memory_kb !== undefined && currentCase.memory_kb > 0 && (
              <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                <Cpu className="h-3 w-3" /> {currentCase.memory_kb}KB
              </span>
            )}
          </div>
        )}
      </div>

      {/* Inputs & Outputs */}
      {currentCase ? (
        <div className="grid flex-1 grid-cols-1 gap-3 overflow-y-auto p-3 md:grid-cols-2">
          {/* Input */}
          <div className="flex flex-col space-y-1.5">
            <label className="font-mono text-[11px] font-medium text-muted-foreground">
              Input (stdin)
            </label>
            <textarea
              rows={4}
              value={currentCase.input}
              onChange={(e) => handleUpdateCurrent("input", e.target.value)}
              placeholder="Paste input testcase data..."
              className="w-full flex-1 resize-none rounded border border-border/80 bg-[#090d13] p-2.5 font-mono text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Expected & Actual Outputs */}
          <div className="flex flex-col space-y-2">
            <div className={cn("space-y-1 flex flex-col", currentCase.actual_output === undefined ? "flex-1" : "")}>
              <label className="font-mono text-[11px] font-medium text-muted-foreground">
                Expected Output (optional)
              </label>
              <textarea
                rows={currentCase.actual_output !== undefined ? 4 : 6}
                value={currentCase.expected_output || ""}
                onChange={(e) => handleUpdateCurrent("expected_output", e.target.value)}
                placeholder="Expected output for automated pass/fail diffing..."
                className={cn(
                  "w-full rounded border border-border/80 bg-[#090d13] p-2.5 font-mono text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary",
                  currentCase.actual_output === undefined
                    ? "flex-1 min-h-[120px] resize-none"
                    : "min-h-[90px] resize-y"
                )}
              />
            </div>

            {currentCase.actual_output !== undefined && (
              <div className="flex flex-1 flex-col space-y-1">
                <label className="font-mono text-[11px] font-medium text-muted-foreground">
                  Actual Output (stdout)
                </label>
                <pre
                  className={`min-h-[80px] flex-1 w-full overflow-x-auto overflow-y-auto rounded border p-2.5 font-mono text-xs ${
                    currentCase.status === "PASSED"
                      ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-300"
                      : currentCase.status === "WRONG_ANSWER"
                        ? "border-rose-500/30 bg-rose-950/20 text-rose-300"
                        : "border-border bg-[#090d13] text-foreground"
                  }`}
                >
                  {currentCase.actual_output || "(empty stdout)"}
                </pre>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
