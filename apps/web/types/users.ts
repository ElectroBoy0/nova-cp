export interface RatingHistoryItem {
  contest_id?: number
  contest_name?: string
  old_rating?: number
  new_rating?: number
  rank?: number
  time?: number
}

export interface CFHandle {
  id: string
  handle: string
  rating: number | null
  max_rating: number | null
  rank: string | null
  max_rank: string | null
  sync_status: string
  last_synced_at: string | null
  created_at: string
  rating_history?: (number | RatingHistoryItem)[] | null
}

export interface UserCustomPreferences {
  primary_language?: string
  recommendation_mode?: "comfort" | "challenge" | "hardcore"
  daily_target_problems?: number
  preferred_topics?: string[]
  editor_keybinding?: "standard" | "vim"
  sound_effects?: boolean
  bio?: string
  github_handle?: string
  target_rating?: number
}

export interface NotificationSettings {
  contest_reminders?: boolean
  contest_lead_time_minutes?: number
  contest_platforms?: string[]
  streak_saver?: boolean
  streak_saver_time?: string
  daily_mission_alert?: boolean
  sync_updates?: boolean
  recommendation_updates?: boolean
  weekly_digest?: boolean
  upsolve_reminders?: boolean
}

export interface InAppNotification {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  link?: string | null
  is_read: boolean
  created_at: string
}

export interface NotificationListResponse {
  items: InAppNotification[]
  total: number
  unread_count: number
}

export interface UserProfile {
  id: string
  email: string
  name: string | null
  image: string | null
  provider: string
  onboarding_completed: boolean
  timezone: string
  custom_preferences?: UserCustomPreferences
  notification_settings?: NotificationSettings
  created_at: string
  updated_at: string
  cf_handle: CFHandle | null
}

export interface UserAnalytics {
  user_id: string
  total_solved: number
  contest_count: number
  current_streak_days: number
  max_streak_days: number
  topic_mastery: Record<string, { solved: number; attempts: number }>
  recommended_problem: {
    name: string
    contestId: number
    index: string
    rating: number
    topic: string
  } | null
}

export interface ProblemRef {
  name: string
  contest_id: number | null
  index: string
  rating: number | null
}

export interface DayActivity {
  date: string
  solved_count: number
  max_rating: number | null
  problems: ProblemRef[]
}

export interface ActivitySummary {
  current_streak: number
  longest_streak: number
  total_solved: number
  active_days: number
}

export interface ActivityHeatmapData {
  days: Record<string, DayActivity>
  summary: ActivitySummary
}
