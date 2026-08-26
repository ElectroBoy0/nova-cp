"use client"

import { useState, useEffect } from "react"
import { useDebounce } from "use-debounce"
import { Search, Star, Copy, Check, Code2, Trash2, Edit2, Plus, BookOpen } from "lucide-react"

import {
  useSnippets,
  useCreateSnippet,
  useUpdateSnippet,
  useDeleteSnippet,
  useToggleFavorite,
} from "@/hooks/use-snippets"
import type { Snippet } from "@/types/snippets"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const LANGUAGES = ["cpp", "python", "java"]
const CATEGORIES = ["templates", "data_structures", "graphs", "math", "techniques"]

export function SnippetsClient({ userId }: { userId: string }) {
  // State
  const [search, setSearch] = useState("")
  const [debouncedSearch] = useDebounce(search, 300)
  const [language, setLanguage] = useState<string>("")
  const [category] = useState<string>("")
  const [filter, setFilter] = useState<"all" | "favorites" | "mine">("all")
  const [selectedSnippetId, setSelectedSnippetId] = useState<string | null>(null)

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [snippetToEdit, setSnippetToEdit] = useState<Snippet | null>(null)

  // API Hooks
  const { data, isLoading } = useSnippets(userId, {
    search: debouncedSearch,
    language: language || undefined,
    category: category || undefined,
    favorites_only: filter === "favorites" ? true : undefined,
    my_snippets_only: filter === "mine" ? true : undefined,
  })

  const snippets = data?.items || []
  const selectedSnippet = snippets.find((s) => s.id === selectedSnippetId) || snippets[0] || null

  const toggleFavMutation = useToggleFavorite()
  const deleteMutation = useDeleteSnippet()

  // Copy state
  const [copied, setCopied] = useState(false)

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        document.getElementById("snippet-search")?.focus()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const handleCopy = async (code: string) => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleToggleFavorite = (snippetId: string) => {
    toggleFavMutation.mutate({ userId, snippetId })
  }

  const handleDelete = (snippetId: string) => {
    if (confirm("Are you sure you want to delete this snippet?")) {
      deleteMutation.mutate({ userId, snippetId })
      if (selectedSnippetId === snippetId) {
        setSelectedSnippetId(null)
      }
    }
  }

  return (
    <div className="flex h-full flex-col md:flex-row">
      {/* LEFT SIDEBAR (Filters & List) */}
      <div className="flex w-full shrink-0 flex-col border-r border-border bg-surface-1/50 md:w-80">
        <div className="space-y-4 p-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Code2 className="h-5 w-5 text-primary" />
              Library
            </h2>
            <Button size="icon-sm" variant="outline" onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="snippet-search"
              placeholder="Search snippets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9"
            />
            <div className="absolute right-2 top-2 rounded border border-border bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted-foreground">
              ⌘K
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              className="h-7 flex-1 text-xs"
              onClick={() => setFilter("all")}
            >
              All
            </Button>
            <Button
              variant={filter === "mine" ? "default" : "outline"}
              size="sm"
              className="h-7 flex-1 text-xs"
              onClick={() => setFilter("mine")}
            >
              Mine
            </Button>
            <Button
              variant={filter === "favorites" ? "default" : "outline"}
              size="sm"
              className="h-7 flex-1 text-xs"
              onClick={() => setFilter("favorites")}
            >
              <Star className="mr-1 h-3 w-3" /> Favs
            </Button>
          </div>

          <div className="flex flex-wrap gap-1">
            <Badge
              variant={language === "" ? "default" : "outline"}
              className="cursor-pointer text-[10px]"
              onClick={() => setLanguage("")}
            >
              All Langs
            </Badge>
            {LANGUAGES.map((l) => (
              <Badge
                key={l}
                variant={language === l ? "default" : "outline"}
                className="cursor-pointer text-[10px] capitalize"
                onClick={() => setLanguage(l)}
              >
                {l}
              </Badge>
            ))}
          </div>
        </div>
        <Separator />

        {/* SNIPPET LIST */}
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
          ) : snippets.length === 0 ? (
            <div className="flex flex-col items-center p-8 text-center text-sm text-muted-foreground">
              <BookOpen className="mb-2 h-8 w-8 opacity-20" />
              No snippets found.
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {snippets.map((s, idx) => {
                const isSelected = selectedSnippet?.id === s.id
                return (
                  <button
                    key={`${s.id}-${idx}`}
                    onClick={() => setSelectedSnippetId(s.id)}
                    className={cn(
                      "flex w-full flex-col items-start gap-1 rounded-md p-3 text-left transition-colors",
                      isSelected
                        ? "border border-border bg-accent/80"
                        : "border border-transparent hover:bg-accent/40"
                    )}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="truncate pr-2 text-sm font-medium">{s.title}</span>
                      {s.is_favorited && (
                        <Star className="h-3.5 w-3.5 shrink-0 fill-yellow-500 text-yellow-500" />
                      )}
                    </div>
                    <div className="mt-1 flex w-full items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="h-4 shrink-0 px-1.5 py-0 text-[9px] capitalize"
                      >
                        {s.language}
                      </Badge>
                      <span className="truncate text-xs text-muted-foreground">{s.category}</span>
                      {s.is_official && (
                        <span className="ml-auto text-[10px] font-medium text-primary/70">
                          Official
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* RIGHT PANEL (Snippet Detail) */}
      <div className="relative flex min-w-0 flex-1 flex-col bg-background">
        {selectedSnippet ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border p-6">
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-3">
                  <h1 className="truncate text-xl font-bold text-foreground">
                    {selectedSnippet.title}
                  </h1>
                  {selectedSnippet.is_official && (
                    <Badge
                      variant="outline"
                      className="border-primary/30 bg-primary/10 text-[10px] text-primary"
                    >
                      Official
                    </Badge>
                  )}
                  {!selectedSnippet.is_official && selectedSnippet.user_id === userId && (
                    <Badge variant="outline" className="text-[10px]">
                      My Snippet
                    </Badge>
                  )}
                </div>
                {selectedSnippet.description && (
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {selectedSnippet.description}
                  </p>
                )}
                <div className="mt-3 flex items-center gap-3">
                  <span className="text-xs capitalize text-muted-foreground">
                    Lang: <strong className="text-foreground">{selectedSnippet.language}</strong>
                  </span>
                  <span className="text-xs capitalize text-muted-foreground">
                    Category:{" "}
                    <strong className="text-foreground">
                      {selectedSnippet.category.replace("_", " ")}
                    </strong>
                  </span>
                  {selectedSnippet.complexity && (
                    <span className="text-xs text-muted-foreground">
                      Time/Space:{" "}
                      <strong className="text-foreground">{selectedSnippet.complexity}</strong>
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleToggleFavorite(selectedSnippet.id)}
                  className={cn(
                    selectedSnippet.is_favorited &&
                      "border-yellow-500/50 bg-yellow-500/10 text-yellow-500"
                  )}
                >
                  <Star
                    className={cn("h-4 w-4", selectedSnippet.is_favorited && "fill-yellow-500")}
                  />
                </Button>

                {!selectedSnippet.is_official && selectedSnippet.user_id === userId && (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setSnippetToEdit(selectedSnippet)
                        setIsEditModalOpen(true)
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(selectedSnippet.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}

                <Button
                  onClick={() => handleCopy(selectedSnippet.code)}
                  className="min-w-[100px] gap-2"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>

            {/* Code & Notes Content */}
            <ScrollArea className="flex-1 p-6">
              <div className="mx-auto max-w-4xl space-y-6">
                <div className="relative overflow-hidden rounded-lg border border-border bg-[#0d1117]">
                  <div className="flex items-center justify-between border-b border-border bg-[#161b22] px-4 py-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {selectedSnippet.language}
                    </span>
                  </div>
                  <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-[#e6edf3]">
                    <code>{selectedSnippet.code}</code>
                  </pre>
                </div>

                {selectedSnippet.usage_notes && (
                  <div className="rounded-lg border border-border bg-surface-1 p-4">
                    <h3 className="mb-2 text-sm font-semibold">Usage Notes</h3>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {selectedSnippet.usage_notes}
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </>
        ) : (
          <ScrollArea className="flex-1 p-6">
            <div className="mx-auto max-w-3xl space-y-6">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
                    <Code2 className="h-5 w-5 text-primary" />
                    Standard Competitive Programming Boilerplates
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Select any snippet from the sidebar or copy these essential CP templates
                    directly.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="gap-1.5 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Custom Snippet</span>
                </Button>
              </div>

              {/* Boilerplate 1: Fast I/O */}
              <div className="space-y-2.5 rounded-xl border border-border/60 bg-surface-1/40 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-400"
                    >
                      C++20
                    </Badge>
                    <span className="text-sm font-semibold text-foreground">
                      Fast I/O & Competitive Template
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `#include <bits/stdc++.h>\nusing namespace std;\n\nvoid solve() {\n    // your logic here\n}\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    int t = 1;\n    if (cin >> t) {\n        while (t--) solve();\n    }\n    return 0;\n}`
                      )
                      toast.success("Fast I/O template copied to clipboard!")
                    }}
                  >
                    <Copy className="h-3 w-3" />
                    <span>Copy</span>
                  </Button>
                </div>
                <pre className="overflow-x-auto rounded-lg border border-border/40 bg-surface-2/60 p-3 font-mono text-xs text-muted-foreground">
                  <code>{`#include <bits/stdc++.h>
using namespace std;

void solve() {
    // your solution logic here
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    int t = 1;
    if (cin >> t) {
        while (t--) solve();
    }
    return 0;
}`}</code>
                </pre>
              </div>

              {/* Boilerplate 2: Iterative Segment Tree */}
              <div className="space-y-2.5 rounded-xl border border-border/60 bg-surface-1/40 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="border-purple-500/30 bg-purple-500/10 text-[10px] text-purple-400"
                    >
                      Data Structures
                    </Badge>
                    <span className="text-sm font-semibold text-foreground">
                      Iterative Segment Tree (Point Update, Range Sum)
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `struct SegTree {\n    int n;\n    vector<long long> tree;\n    SegTree(int n) : n(n), tree(2 * n, 0) {}\n    void update(int pos, long long val) {\n        for (tree[pos += n] = val; pos > 1; pos >>= 1)\n            tree[pos >> 1] = tree[pos] + tree[pos ^ 1];\n    }\n    long long query(int l, int r) {\n        long long res = 0;\n        for (l += n, r += n + 1; l < r; l >>= 1, r >>= 1) {\n            if (l & 1) res += tree[l++];\n            if (r & 1) res += tree[--r];\n        }\n        return res;\n    }\n};`
                      )
                      toast.success("Segment Tree template copied to clipboard!")
                    }}
                  >
                    <Copy className="h-3 w-3" />
                    <span>Copy</span>
                  </Button>
                </div>
                <pre className="overflow-x-auto rounded-lg border border-border/40 bg-surface-2/60 p-3 font-mono text-xs text-muted-foreground">
                  <code>{`struct SegTree {
    int n;
    vector<long long> tree;
    SegTree(int n) : n(n), tree(2 * n, 0) {}
    void update(int pos, long long val) {
        for (tree[pos += n] = val; pos > 1; pos >>= 1)
            tree[pos >> 1] = tree[pos] + tree[pos ^ 1];
    }
    long long query(int l, int r) {
        long long res = 0;
        for (l += n, r += n + 1; l < r; l >>= 1, r >>= 1) {
            if (l & 1) res += tree[l++];
            if (r & 1) res += tree[--r];
        }
        return res;
    }
};`}</code>
                </pre>
              </div>

              {/* Boilerplate 3: Binary Exponentiation & Modulo Inverse */}
              <div className="space-y-2.5 rounded-xl border border-border/60 bg-surface-1/40 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="border-sky-500/30 bg-sky-500/10 text-[10px] text-sky-400"
                    >
                      Math
                    </Badge>
                    <span className="text-sm font-semibold text-foreground">
                      Binary Exponentiation & Modulo Inverse
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `long long power(long long base, long long exp, long long mod = 1000000007) {\n    long long res = 1;\n    base %= mod;\n    while (exp > 0) {\n        if (exp % 2 == 1) res = (res * base) % mod;\n        base = (base * base) % mod;\n        exp /= 2;\n    }\n    return res;\n}\nlong long modInverse(long long n, long long mod = 1000000007) {\n    return power(n, mod - 2, mod);\n}`
                      )
                      toast.success("Modulo Arithmetic template copied to clipboard!")
                    }}
                  >
                    <Copy className="h-3 w-3" />
                    <span>Copy</span>
                  </Button>
                </div>
                <pre className="overflow-x-auto rounded-lg border border-border/40 bg-surface-2/60 p-3 font-mono text-xs text-muted-foreground">
                  <code>{`long long power(long long base, long long exp, long long mod = 1000000007) {
    long long res = 1;
    base %= mod;
    while (exp > 0) {
        if (exp % 2 == 1) res = (res * base) % mod;
        base = (base * base) % mod;
        exp /= 2;
    }
    return res;
}

long long modInverse(long long n, long long mod = 1000000007) {
    return power(n, mod - 2, mod);
}`}</code>
                </pre>
              </div>
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Modals */}
      <SnippetModal
        userId={userId}
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        mode="create"
      />
      {snippetToEdit && (
        <SnippetModal
          userId={userId}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false)
            setSnippetToEdit(null)
          }}
          mode="edit"
          snippet={snippetToEdit}
        />
      )}
    </div>
  )
}

function SnippetModal({
  userId,
  isOpen,
  onClose,
  mode,
  snippet,
}: {
  userId: string
  isOpen: boolean
  onClose: () => void
  mode: "create" | "edit"
  snippet?: Snippet
}) {
  const [title, setTitle] = useState(snippet?.title || "")
  const [description, setDescription] = useState(snippet?.description || "")
  const [language, setLanguage] = useState(snippet?.language || "cpp")
  const [category, setCategory] = useState(snippet?.category || "templates")
  const [code, setCode] = useState(snippet?.code || "")
  const [complexity, setComplexity] = useState(snippet?.complexity || "")
  const [usageNotes, setUsageNotes] = useState(snippet?.usage_notes || "")

  const createMutation = useCreateSnippet()
  const updateMutation = useUpdateSnippet()

  // Reset form when modal opens/closes or snippet changes
  useEffect(() => {
    if (isOpen) {
      setTitle(snippet?.title || "")
      setDescription(snippet?.description || "")
      setLanguage(snippet?.language || "cpp")
      setCategory(snippet?.category || "templates")
      setCode(snippet?.code || "")
      setComplexity(snippet?.complexity || "")
      setUsageNotes(snippet?.usage_notes || "")
    }
  }, [isOpen, snippet])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !code) return

    const data = {
      title,
      description: description || undefined,
      language,
      category,
      code,
      complexity: complexity || undefined,
      usage_notes: usageNotes || undefined,
    }

    if (mode === "create") {
      createMutation.mutate(
        { userId, data },
        {
          onSuccess: () => onClose(),
        }
      )
    } else if (mode === "edit" && snippet) {
      updateMutation.mutate(
        { userId, snippetId: snippet.id, data },
        {
          onSuccess: () => onClose(),
        }
      )
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New Snippet" : "Edit Snippet"}</DialogTitle>
          <DialogDescription>
            {mode === "create" ? "Create a new private snippet." : "Update your private snippet."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label>Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. DSU with Rollback"
                required
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label>Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description"
              />
            </div>

            <div className="space-y-2">
              <Label>Language *</Label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm capitalize shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Category *</Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm capitalize shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Time/Space Complexity</Label>
              <Input
                value={complexity}
                onChange={(e) => setComplexity(e.target.value)}
                placeholder="e.g. O(N log N)"
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label>Usage Notes</Label>
              <Input
                value={usageNotes}
                onChange={(e) => setUsageNotes(e.target.value)}
                placeholder="e.g. 1-indexed, modify the merge function"
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label>Code *</Label>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                rows={10}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Paste your code here..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !title || !code}>
              {isPending ? "Saving..." : "Save Snippet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
