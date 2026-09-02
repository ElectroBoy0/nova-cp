"use client"

import React, { useState } from "react"
import {
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  BookOpen,
  Clock,
  HardDrive,
  Lightbulb,
  Loader2,
  Maximize2,
  Minimize2,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MathText } from "@/components/ui/math-text"
import { getProblemStatementDetails } from "@/lib/problem-statement-helper"
import { useProblemStatement } from "@/hooks/use-problems"
import { cn } from "@/lib/utils"
import type { Problem } from "@/types/problems"
import type { TestCase } from "@/types/code-execution"

interface ProblemPanelProps {
  problem?: Problem | null
  onLoadSampleTests?: (samples: TestCase[]) => void
  fontSize?: number
  onFontSizeChange?: (size: number) => void
  isMaximized?: boolean
  onToggleMaximize?: () => void
  onSetWidthPreset?: (ratio: number) => void
}

export function ProblemPanel({
  problem,
  onLoadSampleTests,
  fontSize = 15,
  onFontSizeChange,
  isMaximized = false,
  onToggleMaximize,
  onSetWidthPreset,
}: ProblemPanelProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showHint, setShowHint] = useState(false)

  const { data: stmtData, isLoading: isStmtLoading } = useProblemStatement(problem?.id)

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (!problem) {
    return (
      <div className="flex h-full flex-col items-center justify-center space-y-3 p-6 text-center text-muted-foreground">
        <BookOpen className="h-8 w-8 text-muted-foreground/40" />
        <div>
          <h3 className="text-sm font-semibold text-foreground">No Problem Selected</h3>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">
            Pick a problem from the top selector or navigate from Problem Explorer to view statement
            and testcases.
          </p>
        </div>
      </div>
    )
  }

  const fallbackDetails = getProblemStatementDetails(problem)
  const description = stmtData?.description || fallbackDetails.description
  const inputFormat = stmtData?.input_specification || fallbackDetails.inputFormat
  const outputFormat = stmtData?.output_specification || fallbackDetails.outputFormat
  const timeLimit = stmtData?.time_limit || fallbackDetails.timeLimit
  const memoryLimit = stmtData?.memory_limit || fallbackDetails.memoryLimit
  const sampleTests =
    stmtData?.sample_tests && stmtData.sample_tests.length > 0
      ? stmtData.sample_tests
      : fallbackDetails.sampleTests

  const cfUrl = `https://codeforces.com/problemset/problem/${problem.contest_id}/${problem.index}`

  return (
    <div
      className="h-full space-y-6 overflow-y-auto p-5 text-foreground"
      style={{ fontSize: `${fontSize}px` }}
    >
      {/* Problem Header */}
      <div className="space-y-3 border-b border-border pb-4 text-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="font-mono text-xs font-semibold text-primary">
              {problem.contest_id}
              {problem.index}
            </span>
            <h2 className="text-lg font-bold tracking-tight text-foreground">{problem.name}</h2>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* Font Size Zoom Controls */}
            {onFontSizeChange && (
              <div
                className="flex items-center rounded-md border border-border/80 bg-surface-2/80 p-0.5 shadow-sm"
                title="Adjust problem statement text size"
              >
                <button
                  type="button"
                  onClick={() => onFontSizeChange(Math.max(12, fontSize - 1))}
                  disabled={fontSize <= 12}
                  title="Smaller text (A-)"
                  className="flex h-6 w-6 items-center justify-center rounded text-xs font-semibold text-muted-foreground transition-colors hover:bg-surface-3 hover:text-foreground disabled:opacity-30"
                >
                  A-
                </button>
                <span className="px-1.5 font-mono text-[11px] font-medium text-foreground select-none">
                  {fontSize}px
                </span>
                <button
                  type="button"
                  onClick={() => onFontSizeChange(Math.min(24, fontSize + 1))}
                  disabled={fontSize >= 24}
                  title="Larger text (A+)"
                  className="flex h-6 w-6 items-center justify-center rounded text-xs font-semibold text-muted-foreground transition-colors hover:bg-surface-3 hover:text-foreground disabled:opacity-30"
                >
                  A+
                </button>
              </div>
            )}

            {/* Quick Width Presets in Split Mode */}
            {!isMaximized && onSetWidthPreset && (
              <div className="hidden items-center rounded-md border border-border/80 bg-surface-2/80 p-0.5 text-[11px] font-mono xl:flex">
                <button
                  type="button"
                  onClick={() => onSetWidthPreset(0.5)}
                  title="50% Balanced split"
                  className="rounded px-1.5 py-0.5 text-muted-foreground transition-colors hover:bg-surface-3 hover:text-foreground"
                >
                  50%
                </button>
                <button
                  type="button"
                  onClick={() => onSetWidthPreset(0.65)}
                  title="65% Wide problem view"
                  className="rounded px-1.5 py-0.5 text-muted-foreground transition-colors hover:bg-surface-3 hover:text-foreground"
                >
                  65%
                </button>
              </div>
            )}

            {/* Focus / Maximize Reading Mode Toggle */}
            {onToggleMaximize && (
              <Button
                variant={isMaximized ? "secondary" : "outline"}
                size="sm"
                onClick={onToggleMaximize}
                title={
                  isMaximized
                    ? "Exit Focus Mode (Esc)"
                    : "Maximize Problem Statement (Focus Mode)"
                }
                className={cn(
                  "h-7 gap-1 px-2.5 text-xs transition-colors",
                  isMaximized
                    ? "border border-primary/40 bg-primary/15 text-primary hover:bg-primary/25"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {isMaximized ? (
                  <>
                    <Minimize2 className="h-3.5 w-3.5" />
                    <span>Split View</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="h-3.5 w-3.5" />
                    <span>Focus</span>
                  </>
                )}
              </Button>
            )}

            {/* External CF Link */}
            <a
              href={cfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-7 items-center gap-1 rounded-md border border-border px-2 text-xs text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
              title="Open problem on Codeforces"
            >
              <span>Codeforces</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {/* Badges & Meta */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {problem.rating && (
            <Badge
              variant="outline"
              className="border-purple-500/30 bg-purple-500/10 font-mono text-xs text-purple-400"
            >
              Rating {problem.rating}
            </Badge>
          )}
          <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3" /> {timeLimit}
          </span>
          <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
            <HardDrive className="h-3 w-3" /> {memoryLimit}
          </span>
          {isStmtLoading && (
            <span className="flex animate-pulse items-center gap-1 text-[10px] text-muted-foreground">
              <Loader2 className="h-2.5 w-2.5 animate-spin" /> Syncing CF statement...
            </span>
          )}
        </div>

        {/* Tags */}
        {problem.tags && problem.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {problem.tags.map((tag) => (
              <span
                key={tag}
                className="rounded border border-border/60 bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Live Contest / Fallback Banner */}
        {stmtData?.is_fallback && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
            <span className="font-bold text-amber-400">ℹ</span>
            <div className="space-y-1">
              <p className="font-medium">
                Live statement fetch is delayed (Codeforces high contest load).
              </p>
              <p className="text-[11px] text-amber-300/80">
                You can code freely in the Monaco editor and test against sample testcases below.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Problem Description */}
      <div className="space-y-3 leading-relaxed text-muted-foreground">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
          Problem Description
        </h4>
        <div
          style={{ fontSize: `${fontSize}px`, lineHeight: 1.68 }}
          className="space-y-2 whitespace-pre-line font-sans text-foreground/90"
        >
          <MathText content={description} fontSize={fontSize} />
        </div>
      </div>

      {/* Input Format */}
      {inputFormat && (
        <div className="space-y-2 leading-relaxed">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
            Input Format
          </h4>
          <div
            style={{ fontSize: `${fontSize}px`, lineHeight: 1.68 }}
            className="whitespace-pre-line font-sans text-muted-foreground"
          >
            <MathText content={inputFormat} fontSize={fontSize} />
          </div>
        </div>
      )}

      {/* Output Format */}
      {outputFormat && (
        <div className="space-y-2 leading-relaxed">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
            Output Format
          </h4>
          <div
            style={{ fontSize: `${fontSize}px`, lineHeight: 1.68 }}
            className="whitespace-pre-line font-sans text-muted-foreground"
          >
            <MathText content={outputFormat} fontSize={fontSize} />
          </div>
        </div>
      )}

      {/* Sample Test Cases */}
      {sampleTests.map((sample, idx) => (
        <div key={sample.id || idx} className="space-y-3 border-t border-border/60 pt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              {sample.name || `Sample ${idx + 1}`}
            </h4>
            {onLoadSampleTests && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onLoadSampleTests(sampleTests)}
                className="h-6 px-2 text-[11px]"
              >
                Load into Testcases
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Sample Input */}
            <div className="space-y-1">
              <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground">
                <span>Input</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(sample.input, `in-${idx}`)}
                  className="transition-colors hover:text-foreground"
                  title="Copy sample input"
                >
                  {copiedId === `in-${idx}` ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
              </div>
              <pre
                style={{ fontSize: `${Math.max(11, fontSize - 2)}px` }}
                className="overflow-x-auto whitespace-pre rounded border border-border/80 bg-surface-2/60 p-2.5 font-mono text-foreground"
              >
                {sample.input.trim()}
              </pre>
            </div>

            {/* Sample Output */}
            <div className="space-y-1">
              <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground">
                <span>Expected Output</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(sample.expected_output || "", `out-${idx}`)}
                  className="transition-colors hover:text-foreground"
                  title="Copy sample output"
                >
                  {copiedId === `out-${idx}` ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
              </div>
              <pre
                style={{ fontSize: `${Math.max(11, fontSize - 2)}px` }}
                className="overflow-x-auto whitespace-pre rounded border border-border/80 bg-surface-2/60 p-2.5 font-mono text-foreground"
              >
                {(sample.expected_output || "").trim()}
              </pre>
            </div>
          </div>
        </div>
      ))}

      {/* Algorithmic Hints Toggle */}
      <div className="border-t border-border/60 pt-3">
        <button
          type="button"
          onClick={() => setShowHint(!showHint)}
          className="flex items-center gap-1.5 text-xs font-medium text-amber-400 transition-colors hover:text-amber-300"
        >
          <Lightbulb className="h-3.5 w-3.5" />
          <span>{showHint ? "Hide Algorithmic Hint" : "Need a Hint? (Socratic Guide)"}</span>
        </button>

        {showHint && (
          <div className="mt-2 space-y-1 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">💡 Core Invariant:</p>
            <div className="leading-relaxed">
              <MathText
                content={fallbackDetails.socraticHint}
                fontSize={Math.max(12, fontSize - 1)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Source Attribution & Copyright Notice */}
      <div className="border-t border-border/50 pb-2 pt-4 font-mono text-[10px] leading-relaxed text-muted-foreground/60">
        <p>
          Problem statement & testcases sourced from{" "}
          <a
            href={cfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 underline hover:text-foreground"
          >
            Codeforces {problem.contest_id}
            {problem.index}
            <ExternalLink className="ml-0.5 inline h-2.5 w-2.5" />
          </a>
          . All intellectual property and copyrights belong to Codeforces and their respective
          authors.
        </p>
      </div>
    </div>
  )
}
