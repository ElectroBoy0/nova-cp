"use client"

import { useState } from "react"
import Link from "next/link"
import {
  useCollections,
  useBookmarks,
  useCreateCollection,
  useDeleteCollection,
  useRemoveBookmark,
  useMoveBookmark,
} from "@/hooks/use-bookmarks"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Folder,
  FolderPlus,
  Trash2,
  Library,
  Hash,
  Star,
  NotebookPen,
  FolderOutput,
  Terminal,
  ExternalLink,
  BookOpen,
} from "lucide-react"
import { NoteModal } from "@/components/problems/note-modal"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function BookmarksClient({ userId }: { userId: string }) {
  const [selectedCollection, setSelectedCollection] = useState<string | "all">("all")
  const [isCreating, setIsCreating] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState("")
  const [noteModalProblem, setNoteModalProblem] = useState<{ id: string; name: string } | null>(
    null
  )

  const { data: collections, isLoading: isCollectionsLoading } = useCollections(userId)
  const { data: bookmarksData, isLoading: isBookmarksLoading } = useBookmarks(userId, {
    collection_id: selectedCollection === "all" ? undefined : selectedCollection,
  })

  const createCollection = useCreateCollection()
  const deleteCollection = useDeleteCollection()
  const removeBookmark = useRemoveBookmark()
  const moveBookmark = useMoveBookmark()

  const handleCreateCollection = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCollectionName.trim()) return
    createCollection.mutate(
      { userId, data: { name: newCollectionName.trim() } },
      {
        onSuccess: () => {
          setIsCreating(false)
          setNewCollectionName("")
        },
      }
    )
  }

  return (
    <div className="flex h-full flex-col md:flex-row">
      {/* Left Sidebar - Collections */}
      <div className="flex w-full shrink-0 flex-col border-r border-border/40 bg-surface-1/30 p-4 md:w-64">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Collections
          </h2>
          <Button variant="ghost" size="icon-sm" onClick={() => setIsCreating(true)}>
            <FolderPlus className="h-4 w-4" />
          </Button>
        </div>

        {isCreating && (
          <form onSubmit={handleCreateCollection} className="mb-4 flex items-center gap-2">
            <Input
              size={1}
              autoFocus
              placeholder="Name..."
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              className="h-8 text-sm"
            />
            <Button type="submit" size="sm" className="h-8" disabled={createCollection.isPending}>
              Add
            </Button>
          </form>
        )}

        <div className="custom-scrollbar flex-1 space-y-1 overflow-y-auto">
          <button
            onClick={() => setSelectedCollection("all")}
            className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
              selectedCollection === "all"
                ? "bg-primary/10 font-medium text-primary"
                : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            }`}
          >
            <div className="flex items-center gap-2">
              <Library className="h-4 w-4" />
              <span>All Bookmarks</span>
            </div>
          </button>

          {isCollectionsLoading
            ? Array(3)
                .fill(0)
                .map((_, i) => <Skeleton key={i} className="mt-1 h-9 w-full rounded-md" />)
            : collections?.map((col, idx) => (
                <div
                  key={`${col.id}-${idx}`}
                  className={`group flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                    selectedCollection === col.id
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                  }`}
                >
                  <button
                    onClick={() => setSelectedCollection(col.id)}
                    className="flex flex-1 items-center gap-2 truncate"
                  >
                    <Folder className="h-4 w-4 shrink-0" />
                    <span className="truncate">{col.name}</span>
                  </button>
                  <div className="ml-2 flex shrink-0 items-center gap-2">
                    <span className="text-xs opacity-50">{col.problem_count}</span>
                    <button
                      onClick={() => deleteCollection.mutate({ userId, collectionId: col.id })}
                      className="opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                      title="Delete collection"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
        </div>
      </div>

      {/* Main Content - Bookmarks */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        <div className="mx-auto max-w-[1000px] space-y-4">
          <h1 className="mb-6 flex items-center gap-2 text-2xl font-bold">
            {selectedCollection === "all" ? (
              <>
                <Library className="h-6 w-6 text-primary" /> All Bookmarks
              </>
            ) : (
              <>
                <Folder className="h-6 w-6 text-primary" />{" "}
                {collections?.find((c) => c.id === selectedCollection)?.name}
              </>
            )}
          </h1>

          {isBookmarksLoading ? (
            Array(5)
              .fill(0)
              .map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
          ) : bookmarksData?.items.length === 0 ? (
            <div className="mx-auto max-w-lg space-y-4 rounded-2xl border border-dashed border-border/80 bg-surface-1/30 p-12 text-center text-muted-foreground">
              <div className="mx-auto w-fit rounded-full border border-amber-500/20 bg-amber-500/10 p-3 text-amber-400">
                <Star className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-foreground">No Bookmarked Problems</h3>
                <p className="text-xs text-muted-foreground">
                  Bookmark problems from the Problem Explorer to practice them here and organize
                  them into custom collections.
                </p>
              </div>
              <Button
                asChild
                size="sm"
                className="gap-2 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
              >
                <Link href="/problems">
                  <BookOpen className="h-4 w-4" />
                  <span>Browse Problem Explorer</span>
                </Link>
              </Button>
            </div>
          ) : (
            bookmarksData?.items.map((bookmark, idx) => (
              <div
                key={`${bookmark.id}-${idx}`}
                className="flex items-center justify-between rounded-xl border border-border/40 bg-card p-4 transition-colors hover:border-border/80"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/solve?problemId=${bookmark.problem_id || bookmark.problem.id}`}
                      className="flex items-center gap-2 text-base font-medium text-foreground transition-colors hover:text-primary"
                    >
                      <span>
                        {bookmark.problem.index}. {bookmark.problem.name}
                      </span>
                    </Link>
                    {bookmark.problem.rating && (
                      <Badge
                        variant="outline"
                        className={
                          bookmark.problem.rating < 1200
                            ? "border-green-500/30 text-green-400"
                            : bookmark.problem.rating < 1600
                              ? "border-cyan-500/30 text-cyan-400"
                              : bookmark.problem.rating < 2000
                                ? "border-blue-500/30 text-blue-400"
                                : bookmark.problem.rating < 2400
                                  ? "border-violet-500/30 text-violet-400"
                                  : "border-red-500/30 text-red-400"
                        }
                      >
                        {bookmark.problem.rating}
                      </Badge>
                    )}
                    <a
                      href={bookmark.problem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-muted-foreground transition-colors hover:text-foreground"
                      title="Open problem on Codeforces"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {bookmark.problem.tags.map((tag) => (
                      <span
                        key={tag}
                        className="flex items-center gap-1 rounded bg-surface-2 px-2 py-0.5 text-[10px] text-muted-foreground"
                      >
                        <Hash className="h-2.5 w-2.5" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Solve in Workspace Button */}
                  <Link
                    href={`/solve?problemId=${bookmark.problem_id || bookmark.problem.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary shadow-sm transition-colors hover:bg-primary/20 active:scale-95"
                    title="Solve in Solve Workspace"
                  >
                    <Terminal className="h-3.5 w-3.5" />
                    <span>Solve</span>
                  </Link>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:bg-primary/10 hover:text-primary"
                    onClick={() =>
                      setNoteModalProblem({ id: bookmark.problem_id, name: bookmark.problem.name })
                    }
                    title="Add/Edit Note"
                  >
                    <NotebookPen className="h-4 w-4" />
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:bg-primary/10 hover:text-primary"
                        title="Move to collection"
                      >
                        <FolderOutput className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Move to Collection</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        disabled={selectedCollection === "all"}
                        onClick={() =>
                          moveBookmark.mutate({
                            userId,
                            bookmarkId: bookmark.id,
                            collectionId: null,
                          })
                        }
                      >
                        <Library className="mr-2 h-4 w-4" />
                        <span>All Bookmarks</span>
                      </DropdownMenuItem>
                      {collections?.map((col, idx) => (
                        <DropdownMenuItem
                          key={`${col.id}-${idx}`}
                          disabled={selectedCollection === col.id}
                          onClick={() =>
                            moveBookmark.mutate({
                              userId,
                              bookmarkId: bookmark.id,
                              collectionId: col.id,
                            })
                          }
                        >
                          <Folder className="mr-2 h-4 w-4" />
                          <span>{col.name}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => removeBookmark.mutate({ userId, bookmarkId: bookmark.id })}
                    title="Remove bookmark"
                  >
                    <Star className="h-4 w-4 fill-current text-amber-400 hover:text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <NoteModal
        userId={userId}
        problemId={noteModalProblem?.id || ""}
        problemName={noteModalProblem?.name || ""}
        isOpen={!!noteModalProblem}
        onClose={() => setNoteModalProblem(null)}
      />
    </div>
  )
}
