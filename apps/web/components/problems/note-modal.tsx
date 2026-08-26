import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useNote, useUpsertNote, useDeleteNote } from "@/hooks/use-bookmarks"
import { NotebookPen, Trash2, Loader2 } from "lucide-react"

interface NoteModalProps {
  userId: string | undefined
  problemId: string
  problemName: string
  isOpen: boolean
  onClose: () => void
}

export function NoteModal({ userId, problemId, problemName, isOpen, onClose }: NoteModalProps) {
  const [content, setContent] = useState("")

  const { data: note, isLoading } = useNote(userId, problemId)
  const upsertNote = useUpsertNote()
  const deleteNote = useDeleteNote()

  // Reset local state when note data loads or modal opens
  useEffect(() => {
    if (note) {
      setContent(note.content)
    } else {
      setContent("")
    }
  }, [note, isOpen])

  const handleSave = () => {
    if (!userId) return
    upsertNote.mutate({ userId, problemId, content }, { onSuccess: onClose })
  }

  const handleDelete = () => {
    if (!userId) return
    deleteNote.mutate({ userId, problemId }, { onSuccess: onClose })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <NotebookPen className="h-5 w-5 text-primary" />
            Notes: {problemName}
          </DialogTitle>
          <DialogDescription>
            Jot down your thought process, key ideas, or bugs you encountered.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="e.g. The key insight was to sort the array first, then use two pointers..."
              className="min-h-[150px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          )}
        </div>

        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            disabled={!note || deleteNote.isPending}
            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            title="Delete Note"
          >
            <Trash2 className="h-4 w-4" />
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={upsertNote.isPending || !content.trim()}>
              {upsertNote.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Note
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
