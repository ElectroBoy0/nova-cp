// =============================================================
// NovaCP — Shared TypeScript Type Definitions
// These types are shared between apps/web and apps/api contracts.
// =============================================================

// ---------------------------
// User & Auth
// ---------------------------

export type Provider = "github" | "google"

export interface User {
  id: string
  email: string
  name: string | null
  image: string | null
  createdAt: string
  updatedAt: string
}

export interface UserSession {
  user: {
    id: string
    email: string
    name: string | null
    image: string | null
  }
  expires: string
}

// ---------------------------
// CF Handle & Platform
// ---------------------------

export type Platform = "codeforces" | "codechef" | "atcoder"

export type CFRank =
  | "newbie"
  | "pupil"
  | "specialist"
  | "expert"
  | "candidate_master"
  | "master"
  | "international_master"
  | "grandmaster"
  | "international_grandmaster"
  | "legendary_grandmaster"

export interface CFHandle {
  id: string
  userId: string
  handle: string
  rating: number | null
  maxRating: number | null
  rank: CFRank | null
  maxRank: CFRank | null
  lastSyncedAt: string | null
  syncStatus: "pending" | "syncing" | "completed" | "failed"
  createdAt: string
}

// ---------------------------
// Contest
// ---------------------------

export interface Contest {
  id: string
  platform: Platform
  externalId: string
  name: string
  startTime: string // ISO 8601
  durationSeconds: number
  status: "upcoming" | "live" | "ended"
  url: string
}

// ---------------------------
// Problem
// ---------------------------

export interface Problem {
  id: string
  platform: Platform
  externalId: string // e.g. "1234A" for CF
  title: string
  rating: number | null
  tags: string[]
  solveCount: number | null
  acceptanceRate: number | null // 0.0 - 1.0
  url: string
}

export type SolveStatus = "solved" | "attempted" | "unsolved"

export interface UserProblemStatus {
  problemId: string
  status: SolveStatus
  solvedAt: string | null
  attemptCount: number
}

// ---------------------------
// Analytics
// ---------------------------

export type TopicTier = "strong" | "good" | "average" | "weak"

export interface TopicMastery {
  tag: string
  problemsSolved: number
  acceptanceRate: number // 0.0 - 1.0
  avgDifficulty: number | null
  peerAcceptanceRate: number | null // average for users at same rating band
  tier: TopicTier
}

export interface RatingDataPoint {
  contestId: string
  contestName: string
  rating: number
  rank: number
  delta: number
  timestamp: string
}

// ---------------------------
// API Response Wrappers
// ---------------------------

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface ApiError {
  detail: string
  status: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasNext: boolean
}
