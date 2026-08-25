export interface Problem {
  id: string
  platform: string
  platform_problem_id: string
  contest_id: number | null
  index: string
  name: string
  rating: number | null
  tags: string[]
  url: string
  solved_count: number | null
}

export interface ProblemListResponse {
  items: Problem[]
  total: number
  limit: number
  offset: number
}

export interface ProblemRecommendationExplanation {
  recommendation_type: string
  reason_summary: string
  target_weakness: string
  difficulty_label: string
  estimated_solve_time_minutes: number
  expected_learning_outcome: string
  bucket?: string
}

export interface ProblemRecommendation {
  problem: Problem
  score: number
  explanation: ProblemRecommendationExplanation
  is_completed?: boolean
}

export interface RecommendationFeedback {
  problem_id: string
  recommendation_type: string
  event_type: "started" | "skipped" | "solved_externally"
}

export interface HintResponse {
  hint_level: number
  content: string
  total_levels: number
}

export interface HintFeedbackCreate {
  user_id: string
  hint_level: number
  event_type: "requested" | "helpful" | "not_helpful" | "solved_after_hint"
}
