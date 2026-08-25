"use client"

import { useState } from "react"
import Link from "next/link"
import { useCollections, useBookmarks, useCreateCollection, useDeleteCollection, useRemoveBookmark, useMoveBookmark } from "@/hooks/use-bookmarks"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Folder, FolderPlus, Trash2, Library, Hash, Star, NotebookPen, FolderOutput, Terminal, ExternalLink, BookOpen } from "lucide-react"
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
  const [noteModalProblem, setNoteModalProblem] = useState<{id: string, name: string} | null>(null)

  const { data: collections, isLoading: isCollectionsLoading } = useCollections(userId)
  const { data: bookmarksData, isLoading: isBookmarksLoading } = useBookmarks(userId, {
    collection_id: selectedCollection === "all" ? undefined : selectedCollection
  })

  const createCollection = useCreateCollection()
  const deleteCollection = useDeleteCollection()
  const removeBookmark = useRemoveBookmark()
  const moveBookmark = useMoveBookmark()

  const handleCreateCollection = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCollectionName.trim()) return
    createCollection.mutate({ userId, data: { name: newCollectionName.trim() } }, {
      onSuccess: () => {
        setIsCreating(false)
        setNewCollectionName("")
      }
    })
  }

  return (
    <div className="flex h-full flex-col md:flex-row">
      {/* Left Sidebar - Collections */}
      <div className="w-full border-r border-border/40 bg-surface-1/30 p-4 md:w-64 flex flex-col shrink-0">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Collections</h2>
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

        <div className="space-y-1 flex-1 overflow-y-auto custom-scrollbar">
          <button
            onClick={() => setSelectedCollection("all")}
            className={`w-full flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
              selectedCollection === "all" 
                ? "bg-primary/10 text-primary font-medium" 
                : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            }`}
          >
            <div className="flex items-center gap-2">
              <Library className="h-4 w-4" />
              <span>All Bookmarks</span>
            </div>
          </button>

          {isCollectionsLoading ? (
            Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-9 w-full rounded-md mt-1" />)
          ) : (
            collections?.map((col, idx) => (
              <div
                key={`${col.id}-${idx}`}
                className={`group flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                  selectedCollection === col.id 
                    ? "bg-primary/10 text-primary font-medium" 
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
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-xs opacity-50">{col.problem_count}</span>
                  <button
                    onClick={() => deleteCollection.mutate({ userId, collectionId: col.id })}
                    className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                    title="Delete collection"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content - Bookmarks */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        <div className="mx-auto max-w-[1000px] space-y-4">
          <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
            {selectedCollection === "all" ? (
              <><Library className="h-6 w-6 text-primary" /> All Bookmarks</>
            ) : (
              <><Folder className="h-6 w-6 text-primary" /> {collections?.find(c => c.id === selectedCollection)?.name}</>
            )}
          </h1>

          {isBookmarksLoading ? (
            Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
          ) : bookmarksData?.items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center text-muted-foreground bg-surface-1/30 space-y-4 max-w-lg mx-auto">
              <div className="p-3 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 w-fit mx-auto">
                <Star className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-foreground">No Bookmarked Problems</h3>
                <p className="text-xs text-muted-foreground">
                  Bookmark problems from the Problem Explorer to practice them here and organize them into custom collections.
                </p>
              </div>
              <Button asChild size="sm" className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
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
                className="flex items-center justify-between p-4 rounded-xl border border-border/40 bg-card hover:border-border/80 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <Link 
                      href={`/solve?problemId=${bookmark.problem_id || bookmark.problem.id}`}
                      className="text-base font-medium text-foreground hover:text-primary transition-colors flex items-center gap-2"
                    >
                      <span>{bookmark.problem.index}. {bookmark.problem.name}</span>
                    </Link>
                    {bookmark.problem.rating && (
                      <Badge variant="outline" className={
                        bookmark.problem.rating < 1200 ? "border-green-500/30 text-green-400" :
                        bookmark.problem.rating < 1600 ? "border-cyan-500/30 text-cyan-400" :
                        bookmark.problem.rating < 2000 ? "border-blue-500/30 text-blue-400" :
                        bookmark.problem.rating < 2400 ? "border-violet-500/30 text-violet-400" :
                        "border-red-500/30 text-red-400"
                      }>
                        {bookmark.problem.rating}
                      </Badge>
                    )}
                    <a
                      href={bookmark.problem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground transition-colors p-1"
                      title="Open problem on Codeforces"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div className="flex gap-2 flex-wrap mt-2">
                    {bookmark.problem.tags.map((tag) => (
                      <span key={tag} className="text-[10px] text-muted-foreground bg-surface-2 px-2 py-0.5 rounded flex items-center gap-1">
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
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 transition-colors active:scale-95 shadow-sm"
                    title="Solve in Solve Workspace"
                  >
                    <Terminal className="h-3.5 w-3.5" />
                    <span>Solve</span>
                  </Link>

                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                    onClick={() => setNoteModalProblem({ id: bookmark.problem_id, name: bookmark.problem.name })}
                    title="Add/Edit Note"
                  >
                    <NotebookPen className="h-4 w-4" />
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-muted-foreground hover:text-primary hover:bg-primary/10"
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
                        onClick={() => moveBookmark.mutate({ userId, bookmarkId: bookmark.id, collectionId: null })}
                      >
                        <Library className="mr-2 h-4 w-4" />
                        <span>All Bookmarks</span>
                      </DropdownMenuItem>
                      {collections?.map((col, idx) => (
                        <DropdownMenuItem 
                          key={`${col.id}-${idx}`}
                          disabled={selectedCollection === col.id}
                          onClick={() => moveBookmark.mutate({ userId, bookmarkId: bookmark.id, collectionId: col.id })}
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
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
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
