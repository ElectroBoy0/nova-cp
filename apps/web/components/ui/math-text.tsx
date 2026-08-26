"use client"

import React, { useMemo } from "react"
import katex from "katex"
import { cn } from "@/lib/utils"

interface MathTextProps {
  content: string
  className?: string
}

/**
 * Parses and renders LaTeX math notation ($$$...$$$, $$...$$, $...$)
 * alongside HTML tags (p, ul, ol, li, code, strong, em) with KaTeX.
 */
export function MathText({ content, className }: MathTextProps) {
  const renderedHtml = useMemo(() => {
    if (!content) return ""

    // Regular expression matching $$$codeforces math$$$, $$block math$$, or $inline math$
    const regex = /(\$\$\$[\s\S]*?\$\$\$|\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g

    return content.replace(regex, (match) => {
      try {
        if (match.startsWith("$$$") && match.endsWith("$$$")) {
          const math = match.slice(3, -3).trim()
          return katex.renderToString(math, {
            displayMode: false,
            throwOnError: false,
          })
        } else if (match.startsWith("$$") && match.endsWith("$$")) {
          const math = match.slice(2, -2).trim()
          return katex.renderToString(math, {
            displayMode: true,
            throwOnError: false,
          })
        } else if (match.startsWith("$") && match.endsWith("$")) {
          const math = match.slice(1, -1).trim()
          return katex.renderToString(math, {
            displayMode: false,
            throwOnError: false,
          })
        }
      } catch (err) {
        console.error("KaTeX rendering error:", err)
        return match
      }
      return match
    })
  }, [content])

  return (
    <div
      className={cn(
        "font-sans text-xs leading-relaxed text-foreground/90",
        "[&_p:last-child]:mb-0 [&_p]:mb-2.5",
        "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5",
        "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5",
        "[&_li]:leading-relaxed",
        "[&_code]:rounded [&_code]:border [&_code]:border-border [&_code]:bg-surface-2 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[11px]",
        "[&_strong]:font-semibold [&_strong]:text-foreground",
        "[&_em]:italic",
        className
      )}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  )
}
