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
import { ExternalLink, Target, Clock, CheckCircle2, RefreshCw } from "lucide-react"
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
        <Button
          size="sm"
          className="h-8 w-full"
          onClick={() => {
            onSolve(rec.problem.id, recType)
            window.open(rec.problem.url, "_blank")
          }}
        >
          Solve Now
          <ExternalLink className="ml-2 h-4 w-4" />
        </Button>
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
          <div className="mt-3 w-full">
            <HintDrawer problemId={rec.problem.id} userId={userId} problemUrl={rec.problem.url} />
          </div>
        )}
      </CardFooter>
    </Card>
  )
}
