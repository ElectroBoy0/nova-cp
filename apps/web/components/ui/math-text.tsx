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

    // Regular expression matching math delimiters in order of specificity:
    // 1. $$$$$$...$$$$$$ (Codeforces display/block math with 6 dollar signs)
    // 2. $$$...$$$ (Codeforces inline math with 3 dollar signs)
    // 3. $$...$$ (Standard display/block math with 2 dollar signs)
    // 4. \[...\] (Standard LaTeX display math)
    // 5. \(...\) (Standard LaTeX inline math)
    // 6. $...$ (Standard inline math with 1 dollar sign)
    const regex =
      /(\${6}[\s\S]*?\${6}|\${3}[\s\S]*?\${3}|\${2}[\s\S]*?\${2}|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$[^\$\n]+?\$)/g

    const decodeHtmlEntities = (str: string) =>
      str
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")

    return content.replace(regex, (match) => {
      try {
        let math = ""
        let displayMode = false

        if (match.startsWith("$$$$$$") && match.endsWith("$$$$$$")) {
          math = match.slice(6, -6).trim()
          displayMode = true
        } else if (match.startsWith("$$$") && match.endsWith("$$$")) {
          math = match.slice(3, -3).trim()
          displayMode = false
        } else if (match.startsWith("$$") && match.endsWith("$$")) {
          math = match.slice(2, -2).trim()
          displayMode = true
        } else if (match.startsWith("\\[") && match.endsWith("\\]")) {
          math = match.slice(2, -2).trim()
          displayMode = true
        } else if (match.startsWith("\\(") && match.endsWith("\\)")) {
          math = match.slice(2, -2).trim()
          displayMode = false
        } else if (match.startsWith("$") && match.endsWith("$")) {
          math = match.slice(1, -1).trim()
          displayMode = false
        }

        if (!math) return match

        const cleanedMath = decodeHtmlEntities(math)
        return katex.renderToString(cleanedMath, {
          displayMode,
          throwOnError: false,
        })
      } catch (err) {
        console.error("KaTeX rendering error:", err)
        return match
      }
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
