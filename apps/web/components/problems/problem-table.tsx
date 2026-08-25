"use client"

import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Star, NotebookPen, Terminal } from "lucide-react"
import type { Problem } from "@/types/problems"
import { Skeleton } from "@/components/ui/skeleton"
import { useAddBookmark } from "@/hooks/use-bookmarks"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { NoteModal } from "@/components/problems/note-modal"

interface ProblemTableProps {
  problems: Problem[]
  isLoading: boolean
  userId?: string
}

export function ProblemTable({ problems, isLoading, userId }: ProblemTableProps) {
  const addBookmark = useAddBookmark()
  const [noteModalProblem, setNoteModalProblem] = useState<{id: string, name: string} | null>(null)

  const handleBookmark = (problemId: string) => {
    if (!userId) return
    addBookmark.mutate({ userId, data: { problem_id: problemId } })
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  if (problems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border rounded-md border-dashed">
        <p className="text-muted-foreground">No problems found matching your criteria.</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="hidden md:table-cell">Rating</TableHead>
            <TableHead className="hidden lg:table-cell">Tags</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {problems.map((problem, i) => (
            <TableRow key={`${problem.platform || 'cf'}-${problem.id || i}-${i}`}>
              <TableCell className="font-medium text-muted-foreground">
                {problem.contest_id}{problem.index}
              </TableCell>
              <TableCell>
                <div className="font-medium">{problem.name}</div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {problem.rating ? (
                  <Badge variant="outline" className={getRatingColor(problem.rating)}>
                    {problem.rating}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <div className="flex flex-wrap gap-1">
                  {problem.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs font-normal">
                      {tag}
                    </Badge>
                  ))}
                  {problem.tags.length > 3 && (
                    <Badge variant="secondary" className="text-xs font-normal opacity-50">
                      +{problem.tags.length - 3}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleBookmark(problem.id)}
                    disabled={!userId || addBookmark.isPending}
                    title="Bookmark problem"
                    className="h-7 w-7 text-muted-foreground hover:text-amber-400"
                  >
                    <Star className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setNoteModalProblem({ id: problem.id, name: problem.name })}
                    disabled={!userId}
                    title="Add/Edit Note"
                    className="h-7 w-7 text-muted-foreground hover:text-primary"
                  >
                    <NotebookPen className="h-3.5 w-3.5" />
                  </Button>
                  <Link
                    href={`/solve?problemId=${problem.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 transition-colors"
                  >
                    <Terminal className="h-3 w-3" />
                    Solve
                  </Link>
                  <a
                    href={problem.url}
                    target="_blank"
                    rel="noreferrer"
                    title="Open on Codeforces"
                    className="inline-flex items-center justify-center rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

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

function getRatingColor(rating: number): string {
  if (rating < 1200) return "text-gray-500 border-gray-500"
  if (rating < 1400) return "text-green-500 border-green-500"
  if (rating < 1600) return "text-cyan-500 border-cyan-500"
  if (rating < 1900) return "text-blue-500 border-blue-500"
  if (rating < 2100) return "text-purple-500 border-purple-500"
  if (rating < 2300) return "text-orange-500 border-orange-500"
  if (rating < 2400) return "text-orange-400 border-orange-400"
  return "text-red-500 border-red-500"
}
