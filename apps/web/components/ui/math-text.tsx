"use client"

import React, { useMemo } from "react"
import katex from "katex"
import { cn } from "@/lib/utils"

interface MathTextProps {
  content?: string
  className?: string
}

/**
 * Parses and renders LaTeX math notation ($$$...$$$, $$...$$, $...$)
 * alongside Markdown formatting (**bold**, *italic*, `code`, lists) with KaTeX.
 */
export function MathText({ content = "", className }: MathTextProps) {
  const renderedHtml = useMemo(() => {
    if (!content) return ""

    const mathTokens: string[] = []

    const decodeHtmlEntities = (str: string) =>
      str
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")

    // Regular expression matching math delimiters in order of specificity:
    const regex =
      /(\${6}[\s\S]*?\${6}|\${3}[\s\S]*?\${3}|\${2}[\s\S]*?\${2}|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$[^\$\n]+?\$)/g

    // Step 1: Replace math delimiters with collision-proof placeholders and render KaTeX
    const tokenized = content.replace(regex, (match) => {
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
        const rendered = katex.renderToString(cleanedMath, {
          displayMode,
          throwOnError: false,
        })
        const token = `\uE000MATH_${mathTokens.length}\uE001`
        mathTokens.push(rendered)
        return token
      } catch (err) {
        console.error("KaTeX rendering error:", err)
        return match
      }
    })

    // Step 2: Parse Markdown formatting (only if not already containing raw HTML tags)
    let formatted = tokenized
    // Inline code: `code`
    formatted = formatted.replace(/`([^`]+)`/g, "<code>$1</code>")
    // Bold: **text** or __text__ (ensure doesn't match single or non-paired underscores)
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    formatted = formatted.replace(/\b__([^_]+)__\b/g, "<strong>$1</strong>")
    // Italic: *text*
    formatted = formatted.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>")

    // Numbered lists at start of line: "1. ", "2. "
    formatted = formatted.replace(
      /(^|\n)(\d+)\.\s+/g,
      "$1<strong class='text-amber-500 font-semibold'>$2. </strong>"
    )

    // Paragraph breaks: convert double newline to paragraph space, single newline to br if no tags
    if (!formatted.includes("<p>") && !formatted.includes("<div>")) {
      formatted = formatted
        .split(/\n{2,}/)
        .map((p) => `<p class="mb-2 last:mb-0">${p.replace(/\n/g, "<br />")}</p>`)
        .join("")
    }

    // Step 3: Re-insert KaTeX tokens accurately
    formatted = formatted.replace(
      /\uE000MATH_(\d+)\uE001/g,
      (_, id) => mathTokens[Number(id)] ?? ""
    )

    return formatted
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
