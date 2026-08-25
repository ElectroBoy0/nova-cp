import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
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

export function RecommendationCard({ rec, userId, onSolve, onSkip, onMarkSolved }: RecommendationCardProps) {
  
  const typeLabels: Record<string, string> = {
    todays_mission: "Today's Mission",
    continue: "Continue Working",
    skill_builder: "Skill Builder",
    stretch: "Stretch Challenge",
    speed_review: "Speed & Review",
  }
  
  return (
    <Card className="flex flex-col h-full relative overflow-hidden group border-border hover:border-primary/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5">
      <CardHeader className="p-5 pb-3">
        <div className="flex justify-between items-start mb-2">
          <Badge variant={rec.explanation.recommendation_type === 'todays_mission' ? "default" : "secondary"}>
            {typeLabels[rec.explanation.recommendation_type] || "Recommended"}
          </Badge>
          <div className="flex items-center text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
            <Clock className="w-3 h-3 mr-1" />
            ~{rec.explanation.estimated_solve_time_minutes}m
          </div>
        </div>
        <CardTitle className="text-base line-clamp-1 group-hover:text-primary transition-colors">
          {rec.problem.name}
        </CardTitle>
        <CardDescription className="flex items-center space-x-2 mt-1">
          <span className="font-semibold text-foreground/80">{rec.problem.rating || 'Unrated'}</span>
          <span>•</span>
          <span className="truncate">{rec.problem.contest_id}{rec.problem.index}</span>
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 space-y-4 p-5 pt-0">
        <div className="space-y-3">
          <div className="flex items-start text-sm">
            <Target className="w-4 h-4 mr-2 mt-0.5 text-blue-500 shrink-0" />
            <span className="text-muted-foreground leading-relaxed">
              {rec.explanation.reason_summary}
            </span>
          </div>
          <div className="flex items-start text-sm">
            <CheckCircle2 className="w-4 h-4 mr-2 mt-0.5 text-green-500 shrink-0" />
            <span className="text-muted-foreground leading-relaxed">
              {rec.explanation.expected_learning_outcome}
            </span>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-1 pt-2">
          {rec.problem.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0 bg-background/50">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
      
      <CardFooter className="p-5 pt-0 mt-auto flex-col gap-2">
        <Button 
          size="sm"
          className="w-full h-8"
          onClick={() => {
            onSolve(rec.problem.id, rec.explanation.recommendation_type);
            window.open(rec.problem.url, "_blank");
          }}
        >
          Solve Now
          <ExternalLink className="w-4 h-4 ml-2" />
        </Button>
        <div className="flex w-full gap-2">
          {onSkip && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => onSkip(rec.problem.id, rec.explanation.recommendation_type)}
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Re-roll
            </Button>
          )}
          {onMarkSolved && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex-1 text-xs text-muted-foreground hover:text-green-500"
              onClick={() => onMarkSolved(rec.problem.id, rec.explanation.recommendation_type)}
            >
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Mark Solved
            </Button>
          )}
        </div>
        
        {userId && (
          <div className="w-full mt-3">
            <HintDrawer problemId={rec.problem.id} userId={userId} problemUrl={rec.problem.url} />
          </div>
        )}
      </CardFooter>
    </Card>
  )
}
