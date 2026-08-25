"use client"

import React, { useState } from "react"
import { Plus, Trash2, CheckCircle2, XCircle, AlertTriangle, Clock, Cpu } from "lucide-react"
import { Button } from "@/components/ui/button"
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
    const updated = testCases.map((tc) => (tc.id === currentCase.id ? { ...tc, [field]: value } : tc))
    onChangeTestCases(updated)
  }

  const getStatusBadge = (status?: string) => {
    if (!status || status === "PENDING") return null
    if (status === "PASSED") {
      return (
        <span className="flex items-center gap-1 text-[11px] font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
          <CheckCircle2 className="h-3 w-3" /> Passed
        </span>
      )
    }
    if (status === "WRONG_ANSWER") {
      return (
        <span className="flex items-center gap-1 text-[11px] font-mono font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
          <XCircle className="h-3 w-3" /> Wrong Answer
        </span>
      )
    }
    if (status === "TIME_LIMIT_EXCEEDED") {
      return (
        <span className="flex items-center gap-1 text-[11px] font-mono font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
          <Clock className="h-3 w-3" /> Time Limit Exceeded
        </span>
      )
    }
    return (
      <span className="flex items-center gap-1 text-[11px] font-mono font-semibold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/30">
        <AlertTriangle className="h-3 w-3" /> {status}
      </span>
    )
  }

  return (
    <div className="flex flex-col h-full bg-surface-1/40">
      {/* Testcase Tabs Bar */}
      <div className="flex items-center justify-between border-b border-border/80 px-3 py-1.5 bg-surface-1/80">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
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
                className={`group flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-all ${
                  isActive
                    ? "bg-surface-2 text-foreground font-semibold border border-border shadow-xs"
                    : "text-muted-foreground hover:bg-surface-2/50 hover:text-foreground"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
                <span>{tc.name || `Case ${index + 1}`}</span>
                {testCases.length > 1 && (
                  <Trash2
                    onClick={(e) => handleDeleteTestCase(tc.id, e)}
                    className="h-3 w-3 opacity-0 group-hover:opacity-100 hover:text-rose-400 transition-opacity ml-1"
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
              <span className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
                <Clock className="h-3 w-3" /> {currentCase.time_ms}ms
              </span>
            )}
            {currentCase.memory_kb !== undefined && currentCase.memory_kb > 0 && (
              <span className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
                <Cpu className="h-3 w-3" /> {currentCase.memory_kb}KB
              </span>
            )}
          </div>
        )}
      </div>

      {/* Inputs & Outputs */}
      {currentCase ? (
        <div className="flex-1 p-3 grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto">
          {/* Input */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-[11px] font-mono font-medium text-muted-foreground">Input (stdin)</label>
            <textarea
              rows={4}
              value={currentCase.input}
              onChange={(e) => handleUpdateCurrent("input", e.target.value)}
              placeholder="Paste input testcase data..."
              className="flex-1 w-full p-2.5 rounded bg-[#090d13] border border-border/80 font-mono text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          {/* Expected & Actual Outputs */}
          <div className="flex flex-col space-y-2">
            <div className="space-y-1">
              <label className="text-[11px] font-mono font-medium text-muted-foreground">
                Expected Output (optional)
              </label>
              <textarea
                rows={2}
                value={currentCase.expected_output || ""}
                onChange={(e) => handleUpdateCurrent("expected_output", e.target.value)}
                placeholder="Expected output for automated pass/fail diffing..."
                className="w-full p-2.5 rounded bg-[#090d13] border border-border/80 font-mono text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>

            {currentCase.actual_output !== undefined && (
              <div className="flex-1 space-y-1">
                <label className="text-[11px] font-mono font-medium text-muted-foreground">Actual Output (stdout)</label>
                <pre
                  className={`w-full p-2.5 rounded border font-mono text-xs overflow-x-auto min-h-[50px] ${
                    currentCase.status === "PASSED"
                      ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
                      : currentCase.status === "WRONG_ANSWER"
                        ? "bg-rose-950/20 border-rose-500/30 text-rose-300"
                        : "bg-[#090d13] border-border text-foreground"
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
