export interface UpsolveItem {
  id: string
  user_id: string
  contest_id: number
  contest_name: string
  problem_index: string
  problem_name: string
  problem_rating: number | null
  tags: string[]
  problem_url: string
  reason: string
  status: "not_started" | "attempted" | "solved"
  added_at: string
  solved_at: string | null
}

export interface UpsolveQueueResponse {
  items: UpsolveItem[]
  total: number
  limit: number
  offset: number
}

export interface UpsolveStats {
  total_items: number
  not_started: number
  attempted: number
  solved: number
  upsolve_ratio: number
  monthly_total: number
  monthly_solved: number
  monthly_ratio: number
}
