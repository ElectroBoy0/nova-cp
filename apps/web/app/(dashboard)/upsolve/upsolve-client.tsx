"use client"

import { useState } from "react"
import Link from "next/link"
import { useUpsolveQueue, useUpsolveStats, useUpdateUpsolveStatus, useGenerateUpsolve } from "@/hooks/use-upsolve"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { CheckCircle2, Circle, Clock, Target, RotateCw, NotebookPen, BookOpen, Trophy, Terminal } from "lucide-react"
import { NoteModal } from "@/components/problems/note-modal"

export function UpsolveClient({ userId }: { userId: string }) {
  const [statusFilter, setStatusFilter] = useState("all")
  const [noteModalProblem, setNoteModalProblem] = useState<{id: string, name: string} | null>(null)
  const { data: stats, isLoading: isStatsLoading } = useUpsolveStats(userId)
  const { data: queueData, isLoading: isQueueLoading } = useUpsolveQueue(userId, { 
    status: statusFilter !== "all" ? statusFilter : undefined 
  })
  
  const updateStatus = useUpdateUpsolveStatus()
  const generateQueue = useGenerateUpsolve()

  const handleStatusChange = (itemId: string, newStatus: string) => {
    updateStatus.mutate({ userId, itemId, status: newStatus })
  }

  return (
    <div className="space-y-8">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 animate-fade-up">
        {[
          { label: "Total Missed", value: stats?.total_items, icon: Target, color: "text-amber-400" },
          { label: "Pending", value: (stats?.not_started ?? 0) + (stats?.attempted ?? 0), icon: Clock, color: "text-sky-400" },
          { label: "Upsolved", value: stats?.solved, icon: CheckCircle2, color: "text-emerald-400" },
          { label: "Upsolve Ratio", value: stats ? `${Math.round(stats.upsolve_ratio * 100)}%` : null, icon: Target, color: "text-violet-400" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border/40 bg-surface-1/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{stat.label}</span>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <div className="text-2xl font-mono font-semibold">
              {isStatsLoading ? <Skeleton className="h-8 w-16" /> : stat.value ?? 0}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between animate-fade-up stagger-1">
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="not_started">Not Started</TabsTrigger>
            <TabsTrigger value="attempted">Attempted</TabsTrigger>
            <TabsTrigger value="solved">Solved</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => generateQueue.mutate(userId)}
          disabled={generateQueue.isPending}
          className="gap-2"
        >
          <RotateCw className={`h-3 w-3 ${generateQueue.isPending ? "animate-spin" : ""}`} />
          Refresh Queue
        </Button>
      </div>

      {/* Queue List */}
      <div className="space-y-4 animate-fade-up stagger-2">
        {isQueueLoading ? (
          [1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
        ) : queueData?.items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center text-muted-foreground bg-surface-1/30 space-y-4 max-w-lg mx-auto">
            <div className="p-3 rounded-full bg-primary/10 border border-primary/20 text-primary w-fit mx-auto">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-foreground">No Unsolved Problems!</h3>
              <p className="text-xs text-muted-foreground">
                {statusFilter === "all"
                  ? "You're all caught up from your recent contests. Practice targeted problems from the explorer or discover upcoming contests."
                  : `No problems currently match the '${statusFilter}' filter.`}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button asChild size="sm" className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
                <Link href="/problems">
                  <BookOpen className="h-4 w-4" />
                  <span>Explore Problems</span>
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="gap-2 border-border hover:bg-surface-2">
                <Link href="/contests">
                  <Trophy className="h-4 w-4 text-purple-400" />
                  <span>Contest Center</span>
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          queueData?.items.map((item, idx) => (
            <div 
              key={`${item.id || idx}-${idx}`} 
              className={`flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center p-5 rounded-xl border transition-colors ${
                item.status === "solved" 
                  ? "border-emerald-500/20 bg-emerald-500/5" 
                  : "border-border/40 bg-card hover:border-border/80"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{item.contest_name}</span>
                  <span>•</span>
                  <span>{item.reason}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Link 
                    href={`/solve?problemId=${item.contest_id}${item.problem_index}`}
                    className="text-lg font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                  >
                    <span>{item.problem_index}. {item.problem_name}</span>
                  </Link>
                  {item.problem_rating && (
                    <Badge variant="outline" className={
                      item.problem_rating < 1200 ? "border-green-500/30 text-green-400" :
                      item.problem_rating < 1600 ? "border-cyan-500/30 text-cyan-400" :
                      item.problem_rating < 2000 ? "border-blue-500/30 text-blue-400" :
                      item.problem_rating < 2400 ? "border-violet-500/30 text-violet-400" :
                      "border-red-500/30 text-red-400"
                    }>
                      {item.problem_rating}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {item.tags.map((tag) => (
                    <span key={tag} className="text-[10px] text-muted-foreground bg-surface-2 px-2 py-0.5 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto">
                {item.status !== "solved" && (
                  <Button asChild size="sm" className="flex-1 sm:flex-none gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30">
                    <Link href={`/solve?problemId=${item.contest_id}${item.problem_index}`}>
                      <Terminal className="h-3.5 w-3.5" />
                      <span>Solve Workspace</span>
                    </Link>
                  </Button>
                )}
                {item.status === "not_started" && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 sm:flex-none gap-2 text-xs"
                    onClick={() => handleStatusChange(item.id, "attempted")}
                  >
                    <Circle className="h-3 w-3" />
                    Mark Attempted
                  </Button>
                )}
                {item.status !== "solved" && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 sm:flex-none gap-2 text-xs border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10"
                    onClick={() => handleStatusChange(item.id, "solved")}
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Mark Solved
                  </Button>
                )}
                {item.status === "solved" && (
                  <div className="flex items-center gap-2 text-sm text-emerald-400 px-4 py-2 bg-emerald-500/10 rounded-md border border-emerald-500/20">
                    <CheckCircle2 className="h-4 w-4" />
                    Solved {item.solved_at && new Date(item.solved_at).toLocaleDateString()}
                  </div>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="flex-1 sm:flex-none gap-2 text-xs"
                  onClick={() => setNoteModalProblem({ id: `CF_${item.contest_id}_${item.problem_index}`, name: item.problem_name })}
                >
                  <NotebookPen className="h-3 w-3" />
                  Notes
                </Button>
              </div>
            </div>
          ))
        )}
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
