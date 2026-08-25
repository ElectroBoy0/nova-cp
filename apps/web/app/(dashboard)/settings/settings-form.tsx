"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import {
  useUserProfile,
  useUserDashboard,
  useLinkHandle,
  useUpdateSettings,
  useGenerateVerificationToken,
  useTriggerTestNotification,
  userKeys,
} from "@/lib/users"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { compressScreenshot } from "@/lib/bug-reports"
import Link from "next/link"
import {
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  User,
  Link as LinkIcon,
  Settings,
  Bell,
  Database,
  Download,
  Code2,
  Target,
  Globe,
  Copy,
  Check,
  Clock,
  ExternalLink,
  ShieldCheck,
  Flame,
  Volume2,
  Sparkles,
  Zap,
  Save,
  Trophy,
  Activity,
  Layers,
  CheckCheck,
  Radio,
  BookOpen,
  Calendar,
  Camera,
  Github,
  TrendingUp,
  ArrowUpRight,
  Terminal,
  ListTodo,
} from "lucide-react"

// Popular CP Topic Tags
const CP_TOPICS = [
  "Dynamic Programming",
  "Graphs & Trees",
  "Data Structures",
  "Math & Number Theory",
  "Greedy",
  "Binary Search",
  "Strings",
  "Two Pointers",
  "Bitmask",
  "Constructive Algorithms",
]

function formatRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return "Never"
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

function getRankBadgeStyle(rank: string | null | undefined) {
  const r = (rank || "").toLowerCase()
  if (r.includes("legendary") || r.includes("international grandmaster") || r.includes("grandmaster")) {
    return "text-rose-400 bg-rose-500/10 border-rose-500/30"
  }
  if (r.includes("master")) {
    return "text-amber-400 bg-amber-500/10 border-amber-500/30"
  }
  if (r.includes("candidate master")) {
    return "text-purple-400 bg-purple-500/10 border-purple-500/30"
  }
  if (r.includes("expert")) {
    return "text-blue-400 bg-blue-500/10 border-blue-500/30"
  }
  if (r.includes("specialist")) {
    return "text-cyan-400 bg-cyan-500/10 border-cyan-500/30"
  }
  if (r.includes("pupil")) {
    return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
  }
  return "text-muted-foreground bg-muted/40 border-border"
}

// Helper to determine next Codeforces rank threshold and progress
function getNextRankProgress(rating: number | null | undefined) {
  const cur = rating || 0
  const tiers = [
    { name: "Pupil", min: 1200 },
    { name: "Specialist", min: 1400 },
    { name: "Expert", min: 1600 },
    { name: "Candidate Master", min: 1900 },
    { name: "Master", min: 2100 },
    { name: "International Master", min: 2300 },
    { name: "Grandmaster", min: 2400 },
    { name: "International Grandmaster", min: 2600 },
    { name: "Legendary Grandmaster", min: 3000 },
  ]

  const nextTier = tiers.find((t) => t.min > cur) || { name: "Peak Rating", min: Math.max(cur + 100, 3000) }
  const prevTierMin = [...tiers].reverse().find((t) => t.min <= cur)?.min || 0
  const range = nextTier.min - prevTierMin
  const progress = range > 0 ? Math.min(Math.max(Math.round(((cur - prevTierMin) / range) * 100), 0), 100) : 100

  return {
    nextRank: nextTier.name,
    targetRating: nextTier.min,
    remaining: Math.max(0, nextTier.min - cur),
    progressPercentage: progress,
  }
}

export function SettingsForm({ userId }: { userId: string }) {
  const queryClient = useQueryClient()
  const { data: user, isLoading, error } = useUserProfile(userId)
  const { data: dashboardData } = useUserDashboard(userId)

  const linkMutation = useLinkHandle()
  const updateSettingsMutation = useUpdateSettings()
  const generateTokenMutation = useGenerateVerificationToken()
  const triggerTestNotifMutation = useTriggerTestNotification()

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Profile Form State
  const [nameInput, setNameInput] = useState("")
  const [bioInput, setBioInput] = useState("")
  const [githubInput, setGithubInput] = useState("")
  const [targetRatingInput, setTargetRatingInput] = useState<number>(1900)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [imgLoadError, setImgLoadError] = useState(false)

  // Verification State
  const [handleInput, setHandleInput] = useState("")
  const [verificationToken, setVerificationToken] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [copied, setCopied] = useState(false)
  const [expiresAt, setExpiresAt] = useState<number | null>(null)
  const [secondsLeft, setSecondsLeft] = useState<number>(900)
  const [justVerified, setJustVerified] = useState(false)

  // Preferences State
  const [language, setLanguage] = useState("cpp")
  const [difficulty, setDifficulty] = useState("challenge")
  const [dailyTarget, setDailyTarget] = useState(2)
  const [preferredTopics, setPreferredTopics] = useState<string[]>([])
  const [keybinding, setKeybinding] = useState("standard")
  const [soundEffects, setSoundEffects] = useState(true)
  const [timezone, setTimezone] = useState("")

  // Notification Settings State
  const [contestReminders, setContestReminders] = useState(true)
  const [contestLeadTime, setContestLeadTime] = useState(60)
  const [contestPlatforms, setContestPlatforms] = useState<string[]>(["codeforces", "codechef", "atcoder"])
  const [streakSaver, setStreakSaver] = useState(true)
  const [streakSaverTime, setStreakSaverTime] = useState("20:00")
  const [dailyMissionAlert, setDailyMissionAlert] = useState(true)
  const [syncUpdates, setSyncUpdates] = useState(true)
  const [recommendationUpdates, setRecommendationUpdates] = useState(true)
  const [weeklyDigest, setWeeklyDigest] = useState(true)
  const [upsolveReminders, setUpsolveReminders] = useState(false)

  // Sync state from loaded user profile
  useEffect(() => {
    if (!user) return

    setNameInput(user.name || "")
    setAvatarUrl(user.image || null)
    setImgLoadError(false)
    setTimezone(user.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone)

    if (user.custom_preferences) {
      const p = user.custom_preferences
      if (p.primary_language) setLanguage(p.primary_language)
      if (p.recommendation_mode) setDifficulty(p.recommendation_mode)
      if (p.daily_target_problems) setDailyTarget(p.daily_target_problems)
      if (Array.isArray(p.preferred_topics)) setPreferredTopics(p.preferred_topics)
      if (p.editor_keybinding) setKeybinding(p.editor_keybinding)
      if (typeof p.sound_effects === "boolean") setSoundEffects(p.sound_effects)
      if (p.bio) setBioInput(p.bio)
      if (p.github_handle) setGithubInput(p.github_handle)
      if (p.target_rating) setTargetRatingInput(p.target_rating)
      else if (user.cf_handle?.rating) {
        setTargetRatingInput(Math.min(3000, Math.ceil((user.cf_handle.rating + 100) / 100) * 100))
      }
    }
  }, [user])

  // Verification Countdown Timer
  useEffect(() => {
    if (!isVerifying || !expiresAt) return

    const updateTimer = () => {
      const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
      setSecondsLeft(diff)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [isVerifying, expiresAt])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const handleCopyToken = () => {
    if (!verificationToken) return
    navigator.clipboard.writeText(verificationToken)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success("Verification token copied to clipboard")
  }

  // Handle Avatar Upload with local Data URL preview + upload persistence
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsUploadingAvatar(true)
      setImgLoadError(false)

      // 1. Generate local preview immediately so user sees their photo with 0 lag
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          setAvatarUrl(event.target.result as string)
        }
      }
      reader.readAsDataURL(file)

      // 2. Compress client-side
      const compressed = await compressScreenshot(file, 400, 0.9)
      const formData = new FormData()
      formData.append("file", compressed)

      // 3. Upload to backend
      const res = await fetch("/api/v1/uploads/screenshot", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) throw new Error("Upload failed")
      const data = await res.json()
      const newImageUrl = data.url

      setAvatarUrl(newImageUrl)

      // 4. Persist to user profile settings
      await updateSettingsMutation.mutateAsync({
        userId,
        settings: { image: newImageUrl },
      })

      // 5. Invalidate user profile query so topbar and other components re-render immediately
      queryClient.invalidateQueries({ queryKey: userKeys.profile(userId) })
      toast.success("Profile photo updated successfully!")
    } catch (err) {
      console.error("Avatar upload error:", err)
      toast.error("Failed to save avatar image.")
    } finally {
      setIsUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  // Unified Profile Save
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nameInput.trim()) return

    const updatedPrefs = {
      ...(user?.custom_preferences || {}),
      bio: bioInput.trim(),
      github_handle: githubInput.trim().replace(/^https?:\/\/github\.com\//, ""),
      primary_language: language,
      target_rating: targetRatingInput,
    }

    updateSettingsMutation.mutate(
      {
        userId,
        settings: {
          name: nameInput.trim(),
          custom_preferences: updatedPrefs,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: userKeys.profile(userId) })
          toast.success("Profile details updated successfully")
        },
        onError: () => {
          toast.error("Failed to update profile")
        },
      }
    )
  }

  // Save Preferences Helper
  const handleUpdatePreferences = (updated: Partial<{
    primary_language: string
    recommendation_mode: "comfort" | "challenge" | "hardcore"
    daily_target_problems: number
    preferred_topics: string[]
    editor_keybinding: "standard" | "vim"
    sound_effects: boolean
    timezone: string
    target_rating: number
    bio: string
    github_handle: string
  }>) => {
    const newPrefs = {
      ...(user?.custom_preferences || {}),
      primary_language: updated.primary_language ?? language,
      recommendation_mode: updated.recommendation_mode ?? (difficulty as any),
      daily_target_problems: updated.daily_target_problems ?? dailyTarget,
      preferred_topics: updated.preferred_topics ?? preferredTopics,
      editor_keybinding: updated.editor_keybinding ?? (keybinding as any),
      sound_effects: updated.sound_effects ?? soundEffects,
      target_rating: updated.target_rating ?? targetRatingInput,
      bio: updated.bio ?? bioInput,
      github_handle: updated.github_handle ?? githubInput,
    }

    const payload: any = { custom_preferences: newPrefs }
    if (updated.timezone) {
      payload.timezone = updated.timezone
    }

    updateSettingsMutation.mutate(
      { userId, settings: payload },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: userKeys.profile(userId) })
          toast.success("Preferences updated")
        },
      }
    )
  }

  // Save Notification Setting Helper
  const handleUpdateNotifications = (updated: Partial<{
    contest_reminders: boolean
    contest_lead_time_minutes: number
    contest_platforms: string[]
    streak_saver: boolean
    streak_saver_time: string
    daily_mission_alert: boolean
    sync_updates: boolean
    recommendation_updates: boolean
    weekly_digest: boolean
    upsolve_reminders: boolean
  }>) => {
    const newNotifs = {
      contest_reminders: updated.contest_reminders ?? contestReminders,
      contest_lead_time_minutes: updated.contest_lead_time_minutes ?? contestLeadTime,
      contest_platforms: updated.contest_platforms ?? contestPlatforms,
      streak_saver: updated.streak_saver ?? streakSaver,
      streak_saver_time: updated.streak_saver_time ?? streakSaverTime,
      daily_mission_alert: updated.daily_mission_alert ?? dailyMissionAlert,
      sync_updates: updated.sync_updates ?? syncUpdates,
      recommendation_updates: updated.recommendation_updates ?? recommendationUpdates,
      weekly_digest: updated.weekly_digest ?? weeklyDigest,
      upsolve_reminders: updated.upsolve_reminders ?? upsolveReminders,
    }

    updateSettingsMutation.mutate(
      { userId, settings: { notification_settings: newNotifs } },
      {
        onSuccess: () => {
          toast.success("Alert preferences saved")
        },
      }
    )
  }

  const handleToggleTopic = (topic: string) => {
    const next = preferredTopics.includes(topic)
      ? preferredTopics.filter((t) => t !== topic)
      : [...preferredTopics, topic]
    setPreferredTopics(next)
    handleUpdatePreferences({ preferred_topics: next })
  }

  const handleDetectTimezone = () => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone
    setTimezone(detected)
    handleUpdatePreferences({ timezone: detected })
  }

  const handleTestAlert = () => {
    triggerTestNotifMutation.mutate(
      { userId },
      {
        onSuccess: () => {
          toast.info("Test alert received! Check your notification bell.", {
            description: "Your customizable alert system is active.",
          })
        },
        onError: () => {
          toast.error("Could not trigger test alert.")
        },
      }
    )
  }

  const handleClearCache = () => {
    queryClient.clear()
    toast.success("Local cache cleared", {
      description: "Application data re-synchronized with server.",
    })
  }

  const handleExportData = () => {
    window.open(`/api/v1/users/${userId}/export`, "_blank")
    toast.success("Downloading solved problems archive...")
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 space-y-6 animate-pulse">
        <Skeleton className="h-10 w-full max-w-md rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-7 space-y-6">
            <Skeleton className="h-64 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
          <div className="md:col-span-5 space-y-6">
            <Skeleton className="h-56 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-6 text-destructive">
        Failed to load profile data.
      </div>
    )
  }

  const hasHandle = !!user.cf_handle
  const cf = user.cf_handle
  const currentHandle = cf?.handle ?? ""
  const nextRankInfo = getNextRankProgress(cf?.rating)

  const handleStartVerification = (e: React.FormEvent) => {
    e.preventDefault()
    if (!handleInput.trim()) return
    setJustVerified(false)

    generateTokenMutation.mutate(
      { userId, handle: handleInput.trim() },
      {
        onSuccess: (data) => {
          setVerificationToken(data.token)
          const expiryDuration = (data.expires_in_minutes || 15) * 60
          setExpiresAt(Date.now() + expiryDuration * 1000)
          setSecondsLeft(expiryDuration)
          setIsVerifying(true)
        },
      }
    )
  }

  const handleConfirmVerification = () => {
    if (!handleInput.trim() || !verificationToken) return

    linkMutation.mutate(
      { userId, handle: handleInput.trim() },
      {
        onSuccess: () => {
          setHandleInput("")
          setVerificationToken(null)
          setIsVerifying(false)
          setJustVerified(true)
          queryClient.invalidateQueries({ queryKey: userKeys.profile(userId) })
          toast.success("Codeforces account verified and linked!")
        },
      }
    )
  }

  const handleCancelVerification = () => {
    setVerificationToken(null)
    setIsVerifying(false)
  }

  const handleManualSync = () => {
    if (!currentHandle) return
    linkMutation.mutate(
      { userId, handle: currentHandle },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: userKeys.profile(userId) })
          toast.success("Submission sync queued!")
        },
      }
    )
  }

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "CP"

  return (
    <Tabs defaultValue="profile" className="w-full space-y-6">
      {/* Sleek Segmented Navigation Control */}
      <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-11 p-1 bg-surface-1/80 border border-border/80 backdrop-blur-md rounded-xl">
        <TabsTrigger
          value="profile"
          className="rounded-lg py-2 flex items-center justify-center gap-2 text-xs font-medium data-[state=active]:bg-surface-2 data-[state=active]:text-foreground data-[state=active]:shadow-sm"
        >
          <User className="w-3.5 h-3.5" /> Profile & CP Hub
        </TabsTrigger>
        <TabsTrigger
          value="integrations"
          className="rounded-lg py-2 flex items-center justify-center gap-2 text-xs font-medium data-[state=active]:bg-surface-2 data-[state=active]:text-foreground data-[state=active]:shadow-sm"
        >
          <LinkIcon className="w-3.5 h-3.5" /> Integrations
        </TabsTrigger>
        <TabsTrigger
          value="preferences"
          className="rounded-lg py-2 flex items-center justify-center gap-2 text-xs font-medium data-[state=active]:bg-surface-2 data-[state=active]:text-foreground data-[state=active]:shadow-sm"
        >
          <Settings className="w-3.5 h-3.5" /> Preferences
        </TabsTrigger>
        <TabsTrigger
          value="notifications"
          className="rounded-lg py-2 flex items-center justify-center gap-2 text-xs font-medium data-[state=active]:bg-surface-2 data-[state=active]:text-foreground data-[state=active]:shadow-sm"
        >
          <Bell className="w-3.5 h-3.5" /> Alerts & System
        </TabsTrigger>
      </TabsList>

      {/* =======================================================
          --- 1. PROFILE & CONTROL CENTER (2-COLUMN REDESIGN) ---
      ======================================================= */}
      <TabsContent value="profile" className="space-y-6 animate-in fade-in duration-200">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* ===================================================
              LEFT COLUMN (7 Cols): Profile, Avatar, Bio, Links
          =================================================== */}
          <div className="md:col-span-7 space-y-6">
            {/* Identity & Account Card */}
            <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-sm overflow-hidden shadow-sm">
              <div className="h-20 bg-gradient-to-r from-purple-950/40 via-surface-2/60 to-slate-900/60 border-b border-border/40 relative">
                <div className="absolute top-3 right-4 flex items-center gap-2">
                  <Badge variant="outline" className="bg-background/80 backdrop-blur-md border-border/60 text-[11px] font-mono">
                    Member since {new Date(user.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                  </Badge>
                </div>
              </div>

              <div className="p-6 pt-0 relative space-y-6">
                {/* Avatar with Upload Hover Button */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-10">
                  <div className="flex items-end gap-4">
                    <div className="relative group">
                      <div className="h-20 w-20 rounded-2xl border-4 border-card bg-surface-2 overflow-hidden flex items-center justify-center shadow-lg ring-1 ring-border/50">
                        {!imgLoadError && avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={user.name || "Avatar"}
                            referrerPolicy="no-referrer"
                            onError={() => setImgLoadError(true)}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full bg-gradient-to-br from-purple-500/20 via-primary/20 to-emerald-500/20 flex items-center justify-center font-bold text-xl text-primary font-mono">
                            {initials}
                          </div>
                        )}
                      </div>

                      {/* Upload Button Overlay */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingAvatar}
                        title="Upload profile picture"
                        className="absolute inset-0 rounded-2xl bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity cursor-pointer border-4 border-transparent"
                      >
                        {isUploadingAvatar ? (
                          <RefreshCw className="h-5 w-5 animate-spin" />
                        ) : (
                          <>
                            <Camera className="h-4 w-4 mb-0.5" />
                            <span className="text-[9px] font-medium uppercase tracking-wider">Change</span>
                          </>
                        )}
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={handleAvatarFileChange}
                        className="hidden"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold text-foreground tracking-tight">{user.name || "Anonymous Coder"}</h3>
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] uppercase font-semibold tracking-wider">
                          Active
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize text-xs bg-surface-1 text-muted-foreground border-border">
                      {user.provider} OAuth
                    </Badge>
                    {hasHandle ? (
                      <Badge variant="outline" className={`capitalize text-xs font-medium border ${getRankBadgeStyle(cf?.rank)}`}>
                        {cf?.rank || "CF Member"}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-amber-400 bg-amber-500/10 border-amber-500/20">
                        Handle Not Linked
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Edit Account & Profile Information */}
            <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-sm p-6 space-y-5 shadow-sm">
              <div className="border-b border-border/40 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Account & Personalization</h3>
                  <p className="text-xs text-muted-foreground">Manage your display name, developer links, and primary language.</p>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Display Name */}
                  <div className="space-y-1.5">
                    <label htmlFor="display-name" className="block text-xs font-medium text-muted-foreground">
                      Display Name
                    </label>
                    <input
                      id="display-name"
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="e.g. Alex Turing"
                      className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                    />
                  </div>

                  {/* GitHub Profile */}
                  <div className="space-y-1.5">
                    <label htmlFor="github-handle" className="block text-xs font-medium text-muted-foreground flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Github className="w-3.5 h-3.5" /> GitHub Profile
                      </span>
                      {githubInput && (
                        <a
                          href={`https://github.com/${githubInput.replace(/^https?:\/\/github\.com\//, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-primary hover:underline inline-flex items-center gap-0.5"
                        >
                          View <ArrowUpRight className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </label>
                    <input
                      id="github-handle"
                      type="text"
                      value={githubInput}
                      onChange={(e) => setGithubInput(e.target.value)}
                      placeholder="username or github.com/user"
                      className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                    />
                  </div>
                </div>

                {/* Short Bio */}
                <div className="space-y-1.5">
                  <label htmlFor="bio-input" className="block text-xs font-medium text-muted-foreground">
                    Short Bio & Competitive Background
                  </label>
                  <textarea
                    id="bio-input"
                    rows={2}
                    value={bioInput}
                    onChange={(e) => setBioInput(e.target.value)}
                    placeholder="e.g. Candidate Master @ Codeforces | ICPC Enthusiast • Focused on DP & Segment Trees"
                    className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary resize-none"
                  />
                </div>

                {/* Codeforces Handle Quick Status */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-muted-foreground flex items-center justify-between">
                    <span>Linked Codeforces Handle</span>
                    <button
                      type="button"
                      onClick={() => {
                        const integrationsTab = document.querySelector('[value="integrations"]') as HTMLButtonElement
                        integrationsTab?.click()
                      }}
                      className="text-[10px] text-primary hover:underline"
                    >
                      Manage in Integrations →
                    </button>
                  </label>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-1/70 border border-border/60">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded bg-primary/10 text-primary font-mono font-bold text-xs flex items-center justify-center">
                        CF
                      </div>
                      <span className="font-mono text-xs font-semibold text-foreground">
                        {hasHandle ? `@${currentHandle}` : "No Handle Connected"}
                      </span>
                    </div>
                    {hasHandle ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" /> Verified
                      </span>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/30 bg-amber-500/10">
                        Link in Integrations
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Preferred Programming Language */}
                <div className="space-y-2 pt-1">
                  <label className="block text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5 text-cyan-400" /> Preferred Programming Language
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: "cpp", label: "C++ (C++20)" },
                      { id: "python", label: "Python (3.12)" },
                      { id: "java", label: "Java (OpenJDK 17)" },
                      { id: "rust", label: "Rust" },
                      { id: "go", label: "Go" },
                    ].map((lang) => (
                      <button
                        key={lang.id}
                        type="button"
                        onClick={() => {
                          setLanguage(lang.id)
                          handleUpdatePreferences({ primary_language: lang.id })
                        }}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                          language === lang.id
                            ? "bg-cyan-500/10 border-cyan-500 text-cyan-400 ring-1 ring-cyan-500 shadow-sm"
                            : "border-border/60 bg-surface-1/60 hover:bg-surface-2 text-muted-foreground"
                        }`}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Button */}
                <div className="pt-2 flex items-center justify-end">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={updateSettingsMutation.isPending}
                    className="gap-2 text-xs h-8 px-4"
                  >
                    {updateSettingsMutation.isPending ? (
                      <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...</>
                    ) : (
                      <><Save className="w-3.5 h-3.5" /> Save Profile Details</>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* ===================================================
              RIGHT COLUMN (5 Cols): Live CP Profile, Goal & Activity
          =================================================== */}
          <div className="md:col-span-5 space-y-6">
            {/* 1. "Your CP Profile" Live Identity Card */}
            <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-sm p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Your CP Profile</h3>
                </div>
                {hasHandle && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleManualSync}
                    disabled={linkMutation.isPending || cf?.sync_status === "syncing"}
                    className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground gap-1"
                    title="Sync Codeforces submissions"
                  >
                    <RefreshCw className={`h-3 w-3 ${linkMutation.isPending || cf?.sync_status === "syncing" ? "animate-spin text-primary" : ""}`} />
                    <span>Sync</span>
                  </Button>
                )}
              </div>

              {hasHandle && cf ? (
                <div className="space-y-4">
                  {/* Rating & Rank Hero */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-1/80 border border-border/60">
                    <div className="space-y-1">
                      <p className="text-[11px] text-muted-foreground font-medium">Current Codeforces Rating</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold font-mono text-foreground">{cf.rating ?? "—"}</span>
                        <Badge variant="outline" className={`capitalize text-[11px] py-0.5 border ${getRankBadgeStyle(cf.rank)}`}>
                          {cf.rank || "Unranked"}
                        </Badge>
                      </div>
                    </div>

                    <div className="text-right space-y-0.5">
                      <p className="text-[10px] text-muted-foreground">Peak Rating</p>
                      <p className="text-xs font-mono font-semibold text-foreground/90">{cf.max_rating ?? "—"}</p>
                      <p className="text-[10px] text-muted-foreground/80 capitalize">{cf.max_rank ?? "—"}</p>
                    </div>
                  </div>

                  {/* Rating Progress to Next Rank Milestone */}
                  <div className="space-y-1.5 p-3 rounded-xl bg-surface-1/40 border border-border/40">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground text-[11px] flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-primary" />
                        Next Rank: <strong className="text-foreground">{nextRankInfo.nextRank}</strong>
                      </span>
                      <span className="font-mono text-[11px] font-semibold text-primary">
                        {nextRankInfo.remaining > 0 ? `+${nextRankInfo.remaining} pts` : "Max Rank"}
                      </span>
                    </div>

                    <div className="h-2 w-full rounded-full bg-surface-2 overflow-hidden">
                      <div
                        style={{ width: `${nextRankInfo.progressPercentage}%` }}
                        className="h-full bg-gradient-to-r from-purple-500 to-emerald-400 rounded-full transition-all duration-500"
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                      <span>{cf.rating || 0}</span>
                      <span>Target: {nextRankInfo.targetRating}</span>
                    </div>
                  </div>

                  {/* 3 Key Stats: Streak, Solved, Contests */}
                  <div className="grid grid-cols-3 gap-2.5">
                    {/* Streak */}
                    <div className="p-3 rounded-xl bg-surface-1/60 border border-border/50 flex flex-col justify-between text-center">
                      <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                        <Flame className="w-3 h-3 text-amber-500" />
                        <span>Streak</span>
                      </div>
                      <p className="mt-1 text-lg font-bold font-mono text-amber-400">
                        {dashboardData?.current_streak_days ?? 0}<span className="text-[10px] font-normal text-muted-foreground ml-0.5">d</span>
                      </p>
                      <p className="text-[9px] text-muted-foreground">Max {dashboardData?.max_streak_days ?? 0}d</p>
                    </div>

                    {/* Solved */}
                    <div className="p-3 rounded-xl bg-surface-1/60 border border-border/50 flex flex-col justify-between text-center">
                      <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                        <CheckCheck className="w-3 h-3 text-emerald-400" />
                        <span>Solved</span>
                      </div>
                      <p className="mt-1 text-lg font-bold font-mono text-emerald-400">
                        {dashboardData?.total_solved ?? 0}
                      </p>
                      <p className="text-[9px] text-muted-foreground">All-time</p>
                    </div>

                    {/* Contests */}
                    <div className="p-3 rounded-xl bg-surface-1/60 border border-border/50 flex flex-col justify-between text-center">
                      <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                        <Layers className="w-3 h-3 text-violet-400" />
                        <span>Contests</span>
                      </div>
                      <p className="mt-1 text-lg font-bold font-mono text-foreground">
                        {dashboardData?.contest_count ?? 0}
                      </p>
                      <p className="text-[9px] text-muted-foreground">Rated</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-border/80 bg-surface-1/30 text-center space-y-2">
                  <ShieldCheck className="h-7 w-7 text-muted-foreground/50 mx-auto" />
                  <p className="text-xs text-muted-foreground">
                    Connect your Codeforces handle in the <strong>Integrations</strong> tab to view live rating progress, problem stats, and contest history.
                  </p>
                </div>
              )}
            </div>

            {/* 2. "Current Goal" Card */}
            <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-sm p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-foreground">Current Practice Goal</h3>
                </div>
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                  Active Goal
                </Badge>
              </div>

              <div className="space-y-3.5">
                {/* Target Rating Goal */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Target Rating Milestone</span>
                    <span className="font-mono font-bold text-foreground">{targetRatingInput}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {[1400, 1600, 1900, 2100, 2400].map((trgt) => (
                      <button
                        key={trgt}
                        type="button"
                        onClick={() => {
                          setTargetRatingInput(trgt)
                          handleUpdatePreferences({ target_rating: trgt })
                        }}
                        className={`flex-1 py-1 rounded text-xs font-mono font-medium border transition-colors ${
                          targetRatingInput === trgt
                            ? "bg-primary/10 border-primary text-primary shadow-sm"
                            : "border-border/60 bg-surface-1/60 hover:bg-surface-2 text-muted-foreground"
                        }`}
                      >
                        {trgt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Daily Problem Target */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Daily Practice Commitment</span>
                    <span className="font-mono font-semibold text-amber-400">{dailyTarget} problems / day</span>
                  </div>
                  <div className="flex gap-2">
                    {[1, 2, 3, 5].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setDailyTarget(t)
                          handleUpdatePreferences({ daily_target_problems: t })
                        }}
                        className={`flex-1 py-1 rounded text-xs font-medium border transition-colors ${
                          dailyTarget === t
                            ? "bg-amber-500/10 border-amber-500 text-amber-400 ring-1 ring-amber-500"
                            : "border-border/60 bg-surface-1/60 hover:bg-surface-2 text-muted-foreground"
                        }`}
                      >
                        {t} / day
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. "Recent Activity & Shortcuts" Card */}
            <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-sm p-5 space-y-3.5 shadow-sm">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-cyan-400" />
                  <h3 className="text-sm font-semibold text-foreground">Quick Practice Hub</h3>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {formatRelativeTime(cf?.last_synced_at)}
                </span>
              </div>

              <div className="space-y-2">
                <Link
                  href="/solve"
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-surface-1/70 hover:bg-surface-2 border border-border/60 transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <Terminal className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                        Solve Workspace IDE
                      </p>
                      <p className="text-[10px] text-muted-foreground">Practice in VS Code style environment</p>
                    </div>
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>

                <Link
                  href="/upsolve"
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-surface-1/70 hover:bg-surface-2 border border-border/60 transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                      <ListTodo className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground group-hover:text-amber-400 transition-colors">
                        Upsolve Contest Queue
                      </p>
                      <p className="text-[10px] text-muted-foreground">Review and master failed problems</p>
                    </div>
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-amber-400 transition-colors" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </TabsContent>

      {/* =======================================================
          --- 2. INTEGRATIONS TAB ---
      ======================================================= */}
      <TabsContent value="integrations" className="space-y-6 animate-in fade-in duration-200">
        <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-sm p-6 space-y-6 shadow-sm">
          <div className="border-b border-border/40 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Connected Platforms</h3>
              <p className="text-xs text-muted-foreground">Manage your competitive programming identities and automated sync engine.</p>
            </div>
          </div>

          {/* Codeforces Platform Panel */}
          <div className="rounded-xl border border-border/60 bg-surface-1/70 p-5 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-mono font-bold text-sm shrink-0">
                  CF
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-foreground">Codeforces</h4>
                    {hasHandle ? (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Connected
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full border border-border">
                        Not Linked
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {hasHandle ? `Handle: @${currentHandle}` : "Connect your handle to synchronize solved problems"}
                  </p>
                </div>
              </div>

              {hasHandle && (
                <div className="flex items-center gap-2">
                  <div className="text-right hidden sm:block text-xs">
                    <p className="text-[11px] text-muted-foreground">
                      Last sync: <span className="text-foreground font-medium">{formatRelativeTime(cf?.last_synced_at)}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground/80 capitalize">Status: {cf?.sync_status}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs h-8"
                    disabled={linkMutation.isPending || cf?.sync_status === "syncing"}
                    onClick={handleManualSync}
                  >
                    {cf?.sync_status === "syncing" || linkMutation.isPending ? (
                      <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Syncing</>
                    ) : (
                      <><RefreshCw className="h-3.5 w-3.5" /> Sync Now</>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Post-verification confirmation banner */}
            {justVerified && hasHandle && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 animate-in fade-in duration-300">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs mb-0.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Codeforces account verified successfully
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Your handle <strong>{currentHandle}</strong> is active. You can now restore your original First Name in your Codeforces social profile.
                </p>
              </div>
            )}

            {/* Verification Form */}
            {!isVerifying ? (
              <form onSubmit={handleStartVerification} className="pt-2 border-t border-border/40 space-y-3">
                <label htmlFor="cf-handle-input" className="block text-xs font-medium text-muted-foreground">
                  {hasHandle ? "Switch or Re-verify Handle" : "Link Codeforces Account"}
                </label>
                <div className="flex flex-col sm:flex-row gap-2.5 max-w-md">
                  <input
                    id="cf-handle-input"
                    type="text"
                    placeholder="e.g. tourist, Benq, ecnerwala"
                    value={handleInput}
                    onChange={(e) => setHandleInput(e.target.value)}
                    disabled={generateTokenMutation.isPending}
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!handleInput.trim() || generateTokenMutation.isPending}
                    className="text-xs h-9 shrink-0"
                  >
                    {generateTokenMutation.isPending ? (
                      <><RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Verifying...</>
                    ) : (
                      hasHandle ? "Update Handle" : "Link Handle"
                    )}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Ownership is securely verified via temporary first-name token check.
                </p>

                {generateTokenMutation.isError && (
                  <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 p-2.5 rounded-lg border border-destructive/20 max-w-md">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>
                      {(generateTokenMutation.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
                        generateTokenMutation.error.message ||
                        "Failed to generate verification token."}
                    </span>
                  </div>
                )}
              </form>
            ) : (
              /* Step-by-Step Verification Box */
              <div className="pt-2 border-t border-border/40 space-y-4 animate-in fade-in duration-300">
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-4">
                  <div className="flex items-center justify-between gap-3 border-b border-primary/20 pb-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
                      <div>
                        <h5 className="text-xs font-semibold text-foreground">Verify Account Ownership</h5>
                        <p className="text-[11px] text-muted-foreground">Linking handle: <strong className="text-primary font-mono">@{handleInput}</strong></p>
                      </div>
                    </div>

                    {secondsLeft > 0 ? (
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 py-0.5 px-2.5 flex items-center gap-1 font-mono text-[11px]">
                        <Clock className="w-3 h-3 animate-pulse" />
                        <span>{formatTime(secondsLeft)}</span>
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-[11px] py-0.5 px-2">Expired</Badge>
                    )}
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-background/60 border border-border/50">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">1</span>
                      <div className="flex-1 space-y-1.5">
                        <p className="text-[11px] font-medium text-foreground">Copy your temporary verification token:</p>
                        <div className="flex items-center gap-2">
                          <code className="px-2.5 py-1 rounded bg-muted font-mono text-xs font-semibold text-primary border border-border select-all">
                            {verificationToken}
                          </code>
                          <Button type="button" variant="outline" size="sm" onClick={handleCopyToken} className="h-7 text-xs gap-1 px-2">
                            {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                            {copied ? "Copied" : "Copy"}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-background/60 border border-border/50">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">2</span>
                      <div className="flex-1">
                        <p className="text-[11px] font-medium text-foreground">
                          Set the token as your <strong>First Name</strong> in Codeforces Social Settings:
                        </p>
                        <a
                          href="https://codeforces.com/settings/social"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-medium mt-0.5"
                        >
                          Open Codeforces Settings <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-background/60 border border-border/50">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">3</span>
                      <div className="flex-1">
                        <p className="text-[11px] font-medium text-foreground">Save changes on Codeforces, then confirm below.</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    {secondsLeft > 0 ? (
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleConfirmVerification}
                        disabled={linkMutation.isPending}
                        className="text-xs h-8 gap-1.5"
                      >
                        {linkMutation.isPending ? (
                          <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Verifying Profile...</>
                        ) : (
                          <><CheckCircle2 className="h-3.5 w-3.5" /> Confirm Verification</>
                        )}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleStartVerification}
                        disabled={generateTokenMutation.isPending}
                        className="text-xs h-8 gap-1.5"
                      >
                        <RefreshCw className="h-3.5 w-3.5" /> Generate New Token
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelVerification}
                      disabled={linkMutation.isPending}
                      className="text-xs h-8"
                    >
                      Cancel
                    </Button>
                  </div>

                  {linkMutation.isError && (
                    <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 p-2.5 rounded-lg border border-destructive/20">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>
                        {(linkMutation.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
                          linkMutation.error.message ||
                          "Could not verify. Please ensure your First Name is saved and public on Codeforces."}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Upcoming Platforms Grid */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Upcoming Platforms
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { name: "AtCoder", desc: "Japanese CP platform sync & analytics", code: "AC" },
                { name: "CodeChef", desc: "Star ratings & monthly challenges", code: "CC" },
                { name: "LeetCode", desc: "Interview prep & weekly contests", code: "LC" },
              ].map((p) => (
                <div key={p.name} className="rounded-xl border border-border/40 bg-surface-1/40 p-4 flex flex-col justify-between opacity-70">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-semibold text-xs text-foreground flex items-center gap-2">
                        <span className="h-6 w-6 rounded-md bg-muted/60 text-[10px] font-mono font-bold flex items-center justify-center text-muted-foreground">{p.code}</span>
                        {p.name}
                      </span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground border-border/60">
                        v2
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{p.desc}</p>
                  </div>
                  <Button variant="ghost" size="sm" disabled className="mt-3 w-full text-[11px] h-7">
                    Available in v2
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </TabsContent>

      {/* =======================================================
          --- 3. PREFERENCES TAB ---
      ======================================================= */}
      <TabsContent value="preferences" className="space-y-6 animate-in fade-in duration-200">
        <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-sm p-6 space-y-6 shadow-sm">
          <div className="border-b border-border/40 pb-3">
            <h3 className="text-sm font-semibold text-foreground">Practice & AI Coach Preferences</h3>
            <p className="text-xs text-muted-foreground">Tailor your problem recommendation difficulty, focus topics, and practice goals.</p>
          </div>

          {/* Recommendation Engine Aggressiveness */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-semibold text-foreground">Recommendation Engine Mode</h4>
            </div>
            <p className="text-[11px] text-muted-foreground">Control how aggressively the AI pushes your problem rating boundary.</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl">
              {[
                { id: "comfort", title: "Comfort Zone", delta: "-100 to 0", desc: "Reinforce fundamentals and speed on familiar ratings" },
                { id: "challenge", title: "Challenge Mode", delta: "+100 to +300", desc: "Optimal growth zone for consistent rating improvements" },
                { id: "hardcore", title: "Hardcore", delta: "+300 to +500", desc: "Push your analytical boundaries with high-difficulty stretch tasks" },
              ].map((diff) => (
                <div
                  key={diff.id}
                  onClick={() => {
                    setDifficulty(diff.id)
                    handleUpdatePreferences({ recommendation_mode: diff.id as any })
                  }}
                  className={`rounded-xl border p-3.5 cursor-pointer transition-all duration-200 flex flex-col justify-between gap-2 ${
                    difficulty === diff.id
                      ? "border-emerald-500 bg-emerald-500/10 text-foreground ring-1 ring-emerald-500 shadow-sm"
                      : "border-border/60 bg-surface-1/60 hover:bg-surface-2 text-muted-foreground"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-foreground">{diff.title}</span>
                      <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">{diff.delta}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{diff.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="h-px bg-border/40 w-full"></div>

          {/* Focus Topic Tags */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              <h4 className="text-xs font-semibold text-foreground">Preferred Practice Topics</h4>
            </div>
            <p className="text-[11px] text-muted-foreground">Select topics you want prioritized in your Daily Missions and Skill Builder recommendations.</p>

            <div className="flex flex-wrap gap-2 max-w-3xl">
              {CP_TOPICS.map((topic) => {
                const isSelected = preferredTopics.includes(topic)
                return (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => handleToggleTopic(topic)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-primary/10 border-primary text-primary shadow-sm"
                        : "border-border/60 bg-surface-1/60 text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-primary" />}
                    {topic}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="h-px bg-border/40 w-full"></div>

          {/* Daily Goal & Language */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
            {/* Daily Goal */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500" />
                <h4 className="text-xs font-semibold text-foreground">Daily Practice Goal</h4>
              </div>
              <p className="text-[11px] text-muted-foreground">Target solved problems required to preserve your daily practice streak.</p>
              <div className="flex gap-2">
                {[1, 2, 3, 5].map((target) => (
                  <button
                    key={target}
                    type="button"
                    onClick={() => {
                      setDailyTarget(target)
                      handleUpdatePreferences({ daily_target_problems: target })
                    }}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                      dailyTarget === target
                        ? "bg-amber-500/10 border-amber-500 text-amber-400 ring-1 ring-amber-500"
                        : "border-border/60 bg-surface-1/60 hover:bg-surface-2 text-muted-foreground"
                    }`}
                  >
                    {target} / day
                  </button>
                ))}
              </div>
            </div>

            {/* Primary Language */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-semibold text-foreground">Primary Language</h4>
              </div>
              <p className="text-[11px] text-muted-foreground">Default code templates and AI Coach syntax language.</p>
              <div className="flex flex-wrap gap-2">
                {["cpp", "python", "java", "rust", "go"].map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => {
                      setLanguage(lang)
                      handleUpdatePreferences({ primary_language: lang })
                    }}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium uppercase transition-colors ${
                      language === lang
                        ? "bg-cyan-500/10 border-cyan-500 text-cyan-400 ring-1 ring-cyan-500"
                        : "border-border/60 bg-surface-1/60 hover:bg-surface-2 text-muted-foreground"
                    }`}
                  >
                    {lang === "cpp" ? "C++" : lang}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="h-px bg-border/40 w-full"></div>

          {/* Timezone & Audio */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
            {/* Timezone */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-400" />
                <h4 className="text-xs font-semibold text-foreground">Timezone</h4>
              </div>
              <p className="text-[11px] text-muted-foreground">Used for daily streak transitions and contest countdown schedules.</p>
              <div className="flex items-center gap-2">
                <select
                  value={timezone}
                  onChange={(e) => {
                    const tz = e.target.value
                    setTimezone(tz)
                    handleUpdatePreferences({ timezone: tz })
                  }}
                  className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs w-full max-w-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                >
                  {Intl.supportedValuesOf("timeZone").map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDetectTimezone}
                  className="h-8 text-xs gap-1 px-2 shrink-0"
                >
                  <Sparkles className="w-3 h-3 text-amber-400" /> Auto-Detect
                </Button>
              </div>
            </div>

            {/* Audio Effects */}
            <div className="flex items-center justify-between p-3.5 border border-border/60 rounded-xl bg-surface-1/50">
              <div>
                <h5 className="text-xs font-semibold text-foreground flex items-center gap-2">
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> Solve Celebrations
                </h5>
                <p className="text-[11px] text-muted-foreground mt-0.5">Sound feedback when passing test cases.</p>
              </div>
              <Switch
                checked={soundEffects}
                onCheckedChange={(checked) => {
                  setSoundEffects(checked)
                  handleUpdatePreferences({ sound_effects: checked })
                }}
              />
            </div>
          </div>
        </div>
      </TabsContent>

      {/* =======================================================
          --- 4. ALERTS & SYSTEM TAB ---
      ======================================================= */}
      <TabsContent value="notifications" className="space-y-6 animate-in fade-in duration-200">
        <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-sm p-6 space-y-6 shadow-sm">
          <div className="border-b border-border/40 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">In-App Alert Channels</h3>
              <p className="text-xs text-muted-foreground">Configure real-time notifications dispatched to your top navigation bell.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestAlert}
              disabled={triggerTestNotifMutation.isPending}
              className="gap-2 text-xs h-8"
            >
              {triggerTestNotifMutation.isPending ? (
                <><RefreshCw className="w-3 h-3 animate-spin" /> Dispatching...</>
              ) : (
                <><Bell className="w-3.5 h-3.5 text-primary" /> Test Alert Bell</>
              )}
            </Button>
          </div>

          <div className="space-y-3">
            {/* Contest Reminders */}
            <div className="p-4 border border-border/60 rounded-xl bg-surface-1/60 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-foreground">Contest Start Reminders</h4>
                  <p className="text-[11px] text-muted-foreground">Receive an alert before upcoming live competitive programming rounds begin.</p>
                </div>
                <Switch
                  checked={contestReminders}
                  onCheckedChange={(checked) => {
                    setContestReminders(checked)
                    handleUpdateNotifications({ contest_reminders: checked })
                  }}
                />
              </div>

              {contestReminders && (
                <div className="pt-2 border-t border-border/40 flex flex-wrap items-center gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-[11px]">Notify before:</span>
                    <select
                      value={contestLeadTime}
                      onChange={(e) => {
                        const val = Number(e.target.value)
                        setContestLeadTime(val)
                        handleUpdateNotifications({ contest_lead_time_minutes: val })
                      }}
                      className="h-7 rounded border border-input bg-background px-2 text-xs"
                    >
                      <option value={15}>15 minutes before</option>
                      <option value={30}>30 minutes before</option>
                      <option value={60}>1 hour before</option>
                      <option value={120}>2 hours before</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Streak Saver Alert */}
            <div className="p-4 border border-border/60 rounded-xl bg-surface-1/60 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-amber-500" /> Daily Streak Saver Alert
                  </h4>
                  <p className="text-[11px] text-muted-foreground">Evening reminder if you haven't completed your daily target problems yet.</p>
                </div>
                <Switch
                  checked={streakSaver}
                  onCheckedChange={(checked) => {
                    setStreakSaver(checked)
                    handleUpdateNotifications({ streak_saver: checked })
                  }}
                />
              </div>

              {streakSaver && (
                <div className="pt-2 border-t border-border/40 flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground text-[11px]">Reminder time:</span>
                  <input
                    type="time"
                    value={streakSaverTime}
                    onChange={(e) => {
                      setStreakSaverTime(e.target.value)
                      handleUpdateNotifications({ streak_saver_time: e.target.value })
                    }}
                    className="h-7 rounded border border-input bg-background px-2 text-xs font-mono"
                  />
                </div>
              )}
            </div>

            {/* Daily Mission Available */}
            <div className="p-4 border border-border/60 rounded-xl bg-surface-1/60 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-foreground">Daily Mission Dispatched</h4>
                <p className="text-[11px] text-muted-foreground">Alert when your 24-hour targeted training challenge is generated.</p>
              </div>
              <Switch
                checked={dailyMissionAlert}
                onCheckedChange={(checked) => {
                  setDailyMissionAlert(checked)
                  handleUpdateNotifications({ daily_mission_alert: checked })
                }}
              />
            </div>

            {/* Synchronized Submissions */}
            <div className="p-4 border border-border/60 rounded-xl bg-surface-1/60 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-foreground">Background Sync Updates</h4>
                <p className="text-[11px] text-muted-foreground">Notifications when recent contest or problem submissions finish indexing.</p>
              </div>
              <Switch
                checked={syncUpdates}
                onCheckedChange={(checked) => {
                  setSyncUpdates(checked)
                  handleUpdateNotifications({ sync_updates: checked })
                }}
              />
            </div>
          </div>

          <div className="h-px bg-border/40 w-full"></div>

          {/* Data & Storage Management */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Data & Storage Management
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 border border-border/60 rounded-xl bg-surface-1/40 flex flex-col justify-between gap-3">
                <div>
                  <h5 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5 text-primary" /> Export Solved Archive
                  </h5>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Download your indexed Codeforces history and submission notes as CSV.</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleExportData} className="w-full text-xs h-8">
                  Export CSV
                </Button>
              </div>

              <div className="p-4 border border-border/60 rounded-xl bg-surface-1/40 flex flex-col justify-between gap-3">
                <div>
                  <h5 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-amber-400" /> Clear Local Cache
                  </h5>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Purge cached problems, hints, and sync queues from your browser storage.</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleClearCache} className="w-full text-xs h-8 text-destructive hover:bg-destructive/10 hover:text-destructive">
                  Purge Cache
                </Button>
              </div>
            </div>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  )
}
