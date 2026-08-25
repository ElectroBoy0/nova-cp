import { Problem } from "./problems"

export interface Collection {
  id: string
  user_id: string
  name: string
  description: string | null
  position: number
  problem_count: number
  created_at: string
  updated_at: string
}

export interface Bookmark {
  id: string
  user_id: string
  problem_id: string
  problem: Problem
  note: string | null
  created_at: string
  updated_at: string
}

export interface BookmarkListResponse {
  items: Bookmark[]
  total: number
  limit: number
  offset: number
}

export interface Note {
  id: string
  user_id: string
  problem_id: string
  problem: Problem
  content: string
  created_at: string
  updated_at: string
}
