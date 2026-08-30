import React, { useRef, useEffect } from "react"
import Editor, { type OnMount } from "@monaco-editor/react"
import { Loader2 } from "lucide-react"
import type { SupportedLanguage } from "@/types/code-execution"
import type { Snippet } from "@/types/snippets"
import { getAvailableSnippets } from "@/lib/default-snippets"

interface MonacoCodeEditorProps {
  language: SupportedLanguage
  value: string
  onChange: (value: string) => void
  fontSize?: number
  onRun?: () => void
  readOnly?: boolean
  userSnippets?: Snippet[]
}

export function MonacoCodeEditor({
  language,
  value,
  onChange,
  fontSize = 14,
  onRun,
  readOnly = false,
  userSnippets = [],
}: MonacoCodeEditorProps) {
  const editorRef = useRef<any>(null)
  const monacoRef = useRef<any>(null)
  const providerRef = useRef<any>(null)

  const monacoLanguage = language === "cpp" ? "cpp" : language === "python" ? "python" : "java"

  // Register or update snippet completion provider for active language
  useEffect(() => {
    if (!monacoRef.current) return

    const monaco = monacoRef.current

    // Dispose previous completion item provider if existing
    if (providerRef.current) {
      providerRef.current.dispose()
      providerRef.current = null
    }

    const availableSnippets = getAvailableSnippets(language, userSnippets)

    providerRef.current = monaco.languages.registerCompletionItemProvider(monacoLanguage, {
      provideCompletionItems: (model: any, position: any) => {
        const word = model.getWordUntilPosition(position)
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        }

        const suggestions = availableSnippets.flatMap((snippet) => {
          // Primary trigger item (e.g. "dsu", "segtree", "fastio")
          const mainItem = {
            label: {
              label: snippet.trigger,
              description: snippet.title,
            },
            kind: monaco.languages.CompletionItemKind.Snippet,
            documentation: {
              value: `### ${snippet.title} (${snippet.category})\n\n${snippet.description}\n\n\`\`\`${monacoLanguage}\n${snippet.code}\n\`\`\``,
            },
            detail: `⚡ Snippet: ${snippet.title}`,
            insertText: snippet.code,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
            sortText: `0_${snippet.trigger}`,
            filterText: `${snippet.trigger} ${snippet.title} ${snippet.aliases.join(" ")}`,
          }

          // Alias items (e.g. typing full title or acronyms)
          const aliasItems = (snippet.aliases || []).map((alias) => ({
            label: {
              label: alias,
              description: `Snippet: ${snippet.title}`,
            },
            kind: monaco.languages.CompletionItemKind.Snippet,
            documentation: {
              value: `### ${snippet.title} (${snippet.category})\n\n${snippet.description}\n\n\`\`\`${monacoLanguage}\n${snippet.code}\n\`\`\``,
            },
            detail: `⚡ Snippet: ${snippet.title}`,
            insertText: snippet.code,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
            sortText: `1_${alias}`,
            filterText: `${alias} ${snippet.title} ${snippet.trigger}`,
          }))

          return [mainItem, ...aliasItems]
        })

        return { suggestions }
      },
    })

    return () => {
      if (providerRef.current) {
        providerRef.current.dispose()
        providerRef.current = null
      }
    }
  }, [language, monacoLanguage, userSnippets])

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco

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
          bracketPairColorization: { enabled: true },
          // Sublime Text & VS Code style snippet expansion
          suggestOnTriggerCharacters: true,
          quickSuggestions: { other: true, comments: false, strings: false },
          tabCompletion: "on",
          acceptSuggestionOnEnter: "on",
          snippetSuggestions: "top",
          suggest: {
            showSnippets: true,
            snippetsPreventQuickSuggestions: false,
            insertMode: "insert",
          },
          wordBasedSuggestions: "currentDocument",
        }}
        loading={
          <div className="flex h-full w-full items-center justify-center gap-2 bg-card text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>Loading Monaco Editor...</span>
          </div>
        }
      />
    </div>
  )
}
