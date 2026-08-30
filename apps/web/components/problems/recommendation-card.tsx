import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExternalLink, Target, Clock, CheckCircle2, RefreshCw, Terminal } from "lucide-react"
import type { ProblemRecommendation } from "@/types/problems"
import { HintDrawer } from "./hint-drawer"

interface RecommendationCardProps {
  rec: ProblemRecommendation
  userId?: string
  onSolve: (problemId: string, recommendationType: string) => void
  onSkip?: (problemId: string, recommendationType: string) => void
  onMarkSolved?: (problemId: string, recommendationType: string) => void
}

export function RecommendationCard({
  rec,
  userId,
  onSolve,
  onSkip,
  onMarkSolved,
}: RecommendationCardProps) {
  const typeLabels: Record<string, string> = {
    todays_mission: "Today's Mission",
    continue: "Continue Working",
    skill_builder: "Skill Builder",
    stretch: "Stretch Challenge",
    speed_review: "Speed & Review",
  }

  const recType =
    rec.explanation?.recommendation_type || (rec.explanation as any)?.bucket || "skill_builder"
  const reason =
    rec.explanation?.reason_summary ||
    (rec.explanation as any)?.reasoning ||
    (rec.problem?.tags?.length
      ? `Practice problem targeting ${rec.problem.tags
          .slice(0, 2)
          .map((t) => t.toUpperCase())
          .join(", ")}.`
      : "Targeted practice tailored to your rating level.")
  const outcome =
    rec.explanation?.expected_learning_outcome ||
    `Master problem concepts at the ${rec.problem?.rating || "current"} rating level.`
  const estTime = rec.explanation?.estimated_solve_time_minutes || 20

  const solveParam = rec.problem?.contest_id
    ? `${rec.problem.contest_id}${rec.problem.index}`
    : rec.problem?.id || ""

  return (
    <Card className="group relative flex h-full flex-col overflow-hidden border-border transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
      <CardHeader className="p-5 pb-3">
        <div className="mb-2 flex items-start justify-between">
          <Badge variant={recType === "todays_mission" ? "default" : "secondary"}>
            {typeLabels[recType] || "Recommended"}
          </Badge>
          <div className="flex items-center rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
            <Clock className="mr-1 h-3 w-3" />~{estTime}m
          </div>
        </div>
        <CardTitle className="line-clamp-1 text-base transition-colors group-hover:text-primary">
          {rec.problem.name}
        </CardTitle>
        <CardDescription className="mt-1 flex items-center space-x-2">
          <span className="font-semibold text-foreground/80">
            {rec.problem.rating || "Unrated"}
          </span>
          <span>•</span>
          <span className="truncate">
            {rec.problem.contest_id}
            {rec.problem.index}
          </span>
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 space-y-4 p-5 pt-0">
        <div className="space-y-3">
          <div className="flex items-start text-sm">
            <Target className="mr-2 mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
            <span className="leading-relaxed text-muted-foreground">{reason}</span>
          </div>
          <div className="flex items-start text-sm">
            <CheckCircle2 className="mr-2 mt-0.5 h-4 w-4 shrink-0 text-green-500" />
            <span className="leading-relaxed text-muted-foreground">{outcome}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 pt-2">
          {rec.problem.tags?.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="bg-background/50 px-1.5 py-0 text-[10px]">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>

      <CardFooter className="mt-auto flex-col gap-2 p-5 pt-0">
        {/* Primary Action Row: Solve in Workspace + Codeforces External Link */}
        <div className="flex w-full items-center gap-2">
          <Button
            size="sm"
            asChild
            className="h-8 flex-1 gap-1.5 bg-primary text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98]"
          >
            <Link
              href={`/solve?problemId=${solveParam}`}
              onClick={() => onSolve(rec.problem.id, recType)}
            >
              <Terminal className="h-3.5 w-3.5" />
              <span>Solve in Workspace</span>
            </Link>
          </Button>

          {rec.problem?.url && (
            <Button
              variant="outline"
              size="sm"
              asChild
              className="hover:bg-surface-3 h-8 gap-1 border-border/80 bg-surface-2 px-2.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              title="Solve on Codeforces"
            >
              <a
                href={rec.problem.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onSolve(rec.problem.id, recType)}
              >
                <span>CF</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          )}
        </div>

        {/* Secondary Action Row: Re-roll + Mark Solved */}
        <div className="flex w-full gap-2">
          {onSkip && (
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => onSkip(rec.problem.id, recType)}
            >
              <RefreshCw className="mr-1 h-3 w-3" />
              Re-roll
            </Button>
          )}
          {onMarkSolved && (
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-xs text-muted-foreground hover:text-green-500"
              onClick={() => onMarkSolved(rec.problem.id, recType)}
            >
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Mark Solved
            </Button>
          )}
        </div>

        {userId && (
          <div className="mt-1 w-full">
            <HintDrawer problemId={rec.problem.id} userId={userId} problemUrl={rec.problem.url} />
          </div>
        )}
      </CardFooter>
    </Card>
  )
}
