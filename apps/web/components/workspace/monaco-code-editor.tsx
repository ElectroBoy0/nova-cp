"use client"

import React, { useRef } from "react"
import Editor, { type OnMount } from "@monaco-editor/react"
import { Loader2 } from "lucide-react"
import type { SupportedLanguage } from "@/types/code-execution"

interface MonacoCodeEditorProps {
  language: SupportedLanguage
  value: string
  onChange: (value: string) => void
  fontSize?: number
  onRun?: () => void
  readOnly?: boolean
}

export function MonacoCodeEditor({
  language,
  value,
  onChange,
  fontSize = 14,
  onRun,
  readOnly = false,
}: MonacoCodeEditorProps) {
  const editorRef = useRef<any>(null)

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor

    // Define custom NovaCP dark theme matching Linear/Raycast aesthetic
    monaco.editor.defineTheme("novacp-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "6272a4", fontStyle: "italic" },
        { token: "keyword", foreground: "ff79c6" },
        { token: "string", foreground: "f1fa8c" },
        { token: "number", foreground: "bd93f9" },
        { token: "type", foreground: "8be9fd" },
        { token: "identifier", foreground: "f8f8f2" },
      ],
      colors: {
        "editor.background": "#0d1117",
        "editor.foreground": "#e6edf3",
        "editorCursor.foreground": "#a855f7",
        "editor.lineHighlightBackground": "#161b22",
        "editorLineNumber.foreground": "#484f58",
        "editorLineNumber.activeForeground": "#c9d1d9",
        "editor.selectionBackground": "#3b82f640",
      },
    })

    monaco.editor.setTheme("novacp-dark")

    // Add keyboard shortcut for running code (Cmd+Enter on Mac, Ctrl+Enter on Win/Linux)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      if (onRun) {
        onRun()
      }
    })
  }

  const monacoLanguage = language === "cpp" ? "cpp" : language === "python" ? "python" : "java"

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0d1117]">
      <Editor
        height="100%"
        language={monacoLanguage}
        value={value}
        onChange={(val) => onChange(val || "")}
        onMount={handleEditorDidMount}
        theme="vs-dark"
        options={{
          fontSize,
          fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', 'Fira Code', monospace",
          fontLigatures: true,
          lineNumbers: "on",
          roundedSelection: false,
          scrollBeyondLastLine: false,
          readOnly,
          minimap: { enabled: false },
          automaticLayout: true,
          tabSize: 4,
          insertSpaces: true,
          padding: { top: 12, bottom: 12 },
          suggestOnTriggerCharacters: true,
          bracketPairColorization: { enabled: true },
        }}
        loading={
          <div className="flex h-full w-full items-center justify-center bg-card text-muted-foreground gap-2 text-xs">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>Loading Monaco Editor...</span>
          </div>
        }
      />
    </div>
  )
}
