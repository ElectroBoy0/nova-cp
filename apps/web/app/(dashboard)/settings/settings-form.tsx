"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import {
  useUserProfile,
  useUserDashboard,
  useLinkHandle,
  useDelinkHandle,
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
import { playNotificationSound } from "@/lib/sound"
import Link from "next/link"
import {
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  User,
  Link as LinkIcon,
  Unlink,
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
  if (
    r.includes("legendary") ||
    r.includes("international grandmaster") ||
    r.includes("grandmaster")
  ) {
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

  const nextTier = tiers.find((t) => t.min > cur) || {
    name: "Peak Rating",
    min: Math.max(cur + 100, 3000),
  }
  const prevTierMin = [...tiers].reverse().find((t) => t.min <= cur)?.min || 0
  const range = nextTier.min - prevTierMin
  const progress =
    range > 0 ? Math.min(Math.max(Math.round(((cur - prevTierMin) / range) * 100), 0), 100) : 100

  return {
    nextRank: nextTier.name,
    targetRating: nextTier.min,
    remaining: Math.max(0, nextTier.min - cur),
    progressPercentage: progress,
  }
}

// Compresses any uploaded avatar into a durable, self-contained 200x200 WebP Data URL
async function compressAvatarToDataUrl(
  file: File,
  dimension = 200,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string
      img.onload = () => {
        const width = img.width
        const height = img.height
        const minDim = Math.min(width, height)
        const sx = (width - minDim) / 2
        const sy = (height - minDim) / 2

        const canvas = document.createElement("canvas")
        canvas.width = dimension
        canvas.height = dimension
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          return resolve(event.target?.result as string)
        }

        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, dimension, dimension)
        const dataUrl = canvas.toDataURL("image/webp", quality)
        resolve(dataUrl)
      }
      img.onerror = () => resolve(event.target?.result as string)
    }
    reader.onerror = (err) => reject(err)
  })
}

export function SettingsForm({ userId }: { userId: string }) {
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const { data: user, isLoading, error } = useUserProfile(userId)
  const { data: dashboardData } = useUserDashboard(userId)

  const linkMutation = useLinkHandle()
  const delinkMutation = useDelinkHandle()
  const updateSettingsMutation = useUpdateSettings()
  const generateTokenMutation = useGenerateVerificationToken()
  const triggerTestNotifMutation = useTriggerTestNotification()

  const [showDelinkConfirm, setShowDelinkConfirm] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Active Tab synchronized with URL query params (?tab=notifications, etc.)
  const tabParam = searchParams.get("tab")
  const initialTab =
    tabParam === "notifications" || tabParam === "alerts"
      ? "notifications"
      : tabParam === "integrations"
        ? "integrations"
        : tabParam === "preferences"
          ? "preferences"
          : "profile"

  const [activeTab, setActiveTab] = useState<string>(initialTab)

  useEffect(() => {
    if (tabParam) {
      const mapped =
        tabParam === "notifications" || tabParam === "alerts"
          ? "notifications"
          : tabParam === "integrations"
            ? "integrations"
            : tabParam === "preferences"
              ? "preferences"
              : "profile"
      setActiveTab(mapped)
    }
  }, [tabParam])

  const handleTabChange = (val: string) => {
    setActiveTab(val)
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", val)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

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
  const [contestPlatforms, setContestPlatforms] = useState<string[]>([
    "codeforces",
    "codechef",
    "atcoder",
  ])
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

      // 1. Compress & center-crop to a durable 200x200 WebP Data URL
      const dataUrl = await compressAvatarToDataUrl(file, 200, 0.85)
      setAvatarUrl(dataUrl)

      // 2. Persist directly to user profile settings
      await updateSettingsMutation.mutateAsync({
        userId,
        settings: { image: dataUrl },
      })

      // 3. Invalidate user profile query so topbar and all components re-render immediately
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
  const handleUpdatePreferences = (
    updated: Partial<{
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
    }>
  ) => {
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
  const handleUpdateNotifications = (
    updated: Partial<{
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
    }>
  ) => {
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
    if (soundEffects) {
      playNotificationSound()
    }
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
      <div className="animate-pulse space-y-6 rounded-xl border border-border bg-card p-6">
        <Skeleton className="h-10 w-full max-w-md rounded-lg" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
          <div className="space-y-6 md:col-span-7">
            <Skeleton className="h-64 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
          <div className="space-y-6 md:col-span-5">
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

  const handleDelinkHandle = () => {
    delinkMutation.mutate(
      { userId },
      {
        onSuccess: () => {
          setShowDelinkConfirm(false)
          setHandleInput("")
          setVerificationToken(null)
          setIsVerifying(false)
          setJustVerified(false)
          toast.success("Codeforces account disconnected successfully.")
        },
        onError: (err: any) => {
          toast.error(
            err?.response?.data?.detail || err?.message || "Failed to disconnect account."
          )
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
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full space-y-6">
      {/* Sleek Segmented Navigation Control */}
      <TabsList className="grid h-11 w-full grid-cols-2 rounded-xl border border-border/80 bg-surface-1/80 p-1 backdrop-blur-md md:grid-cols-4">
        <TabsTrigger
          value="profile"
          className="flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-medium data-[state=active]:bg-surface-2 data-[state=active]:text-foreground data-[state=active]:shadow-sm"
        >
          <User className="h-3.5 w-3.5" /> Profile & CP Hub
        </TabsTrigger>
        <TabsTrigger
          value="integrations"
          className="flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-medium data-[state=active]:bg-surface-2 data-[state=active]:text-foreground data-[state=active]:shadow-sm"
        >
          <LinkIcon className="h-3.5 w-3.5" /> Integrations
        </TabsTrigger>
        <TabsTrigger
          value="preferences"
          className="flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-medium data-[state=active]:bg-surface-2 data-[state=active]:text-foreground data-[state=active]:shadow-sm"
        >
          <Settings className="h-3.5 w-3.5" /> Preferences
        </TabsTrigger>
        <TabsTrigger
          value="notifications"
          className="flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-medium data-[state=active]:bg-surface-2 data-[state=active]:text-foreground data-[state=active]:shadow-sm"
        >
          <Bell className="h-3.5 w-3.5" /> Alerts & System
        </TabsTrigger>
      </TabsList>

      {/* =======================================================
          --- 1. PROFILE & CONTROL CENTER (2-COLUMN REDESIGN) ---
      ======================================================= */}
      <TabsContent value="profile" className="space-y-6 duration-200 animate-in fade-in">
        <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-12">
          {/* ===================================================
              LEFT COLUMN (7 Cols): Profile, Avatar, Bio, Links
          =================================================== */}
          <div className="space-y-6 md:col-span-7">
            {/* Identity & Account Card */}
            <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/60 shadow-sm backdrop-blur-sm">
              <div className="relative h-20 border-b border-border/40 bg-gradient-to-r from-purple-950/40 via-surface-2/60 to-slate-900/60">
                <div className="absolute right-4 top-3 flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="border-border/60 bg-background/80 font-mono text-[11px] backdrop-blur-md"
                  >
                    Member since{" "}
                    {new Date(user.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      year: "numeric",
                    })}
                  </Badge>
                </div>
              </div>

              <div className="relative space-y-6 p-6 pt-0">
                {/* Avatar with Upload Hover Button */}
                <div className="-mt-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                  <div className="flex items-end gap-4">
                    <div className="group relative">
                      <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-4 border-card bg-surface-2 shadow-lg ring-1 ring-border/50">
                        {!imgLoadError && avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={user.name || "Avatar"}
                            referrerPolicy="no-referrer"
                            onError={() => setImgLoadError(true)}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-500/20 via-primary/20 to-emerald-500/20 font-mono text-xl font-bold text-primary">
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
                        className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-4 border-transparent bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        {isUploadingAvatar ? (
                          <RefreshCw className="h-5 w-5 animate-spin" />
                        ) : (
                          <>
                            <Camera className="mb-0.5 h-4 w-4" />
                            <span className="text-[9px] font-medium uppercase tracking-wider">
                              Change
                            </span>
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
                        <h3 className="text-xl font-bold tracking-tight text-foreground">
                          {user.name || "Anonymous Coder"}
                        </h3>
                        <Badge
                          variant="outline"
                          className="border-primary/20 bg-primary/10 text-[10px] font-semibold uppercase tracking-wider text-primary"
                        >
                          Active
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="border-border bg-surface-1 text-xs capitalize text-muted-foreground"
                    >
                      {user.provider} OAuth
                    </Badge>
                    {hasHandle ? (
                      <Badge
                        variant="outline"
                        className={`border text-xs font-medium capitalize ${getRankBadgeStyle(cf?.rank)}`}
                      >
                        {cf?.rank || "CF Member"}
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-amber-500/20 bg-amber-500/10 text-xs text-amber-400"
                      >
                        Handle Not Linked
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Edit Account & Profile Information */}
            <div className="space-y-5 rounded-2xl border border-border/70 bg-card/60 p-6 shadow-sm backdrop-blur-sm">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Account & Personalization
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Manage your display name, developer links, and primary language.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Display Name */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="display-name"
                      className="block text-xs font-medium text-muted-foreground"
                    >
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
                    <label
                      htmlFor="github-handle"
                      className="block flex items-center justify-between text-xs font-medium text-muted-foreground"
                    >
                      <span className="flex items-center gap-1.5">
                        <Github className="h-3.5 w-3.5" /> GitHub Profile
                      </span>
                      {githubInput && (
                        <a
                          href={`https://github.com/${githubInput.replace(/^https?:\/\/github\.com\//, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-0.5 text-[10px] text-primary hover:underline"
                        >
                          View <ArrowUpRight className="h-2.5 w-2.5" />
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
                  <label
                    htmlFor="bio-input"
                    className="block text-xs font-medium text-muted-foreground"
                  >
                    Short Bio & Competitive Background
                  </label>
                  <textarea
                    id="bio-input"
                    rows={2}
                    value={bioInput}
                    onChange={(e) => setBioInput(e.target.value)}
                    placeholder="e.g. Candidate Master @ Codeforces | ICPC Enthusiast • Focused on DP & Segment Trees"
                    className="flex w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                  />
                </div>

                {/* Codeforces Handle Quick Status */}
                <div className="space-y-1.5">
                  <label className="block flex items-center justify-between text-xs font-medium text-muted-foreground">
                    <span>Linked Codeforces Handle</span>
                    <button
                      type="button"
                      onClick={() => {
                        const integrationsTab = document.querySelector(
                          '[value="integrations"]'
                        ) as HTMLButtonElement
                        integrationsTab?.click()
                      }}
                      className="text-[10px] text-primary hover:underline"
                    >
                      Manage in Integrations →
                    </button>
                  </label>
                  <div className="flex items-center justify-between rounded-lg border border-border/60 bg-surface-1/70 p-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 font-mono text-xs font-bold text-primary">
                        CF
                      </div>
                      <span className="font-mono text-xs font-semibold text-foreground">
                        {hasHandle ? `@${currentHandle}` : "No Handle Connected"}
                      </span>
                    </div>
                    {hasHandle ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" /> Verified
                      </span>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-400"
                      >
                        Link in Integrations
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Preferred Programming Language */}
                <div className="space-y-2 pt-1">
                  <label className="block flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Code2 className="h-3.5 w-3.5 text-cyan-400" /> Preferred Programming Language
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
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                          language === lang.id
                            ? "border-cyan-500 bg-cyan-500/10 text-cyan-400 shadow-sm ring-1 ring-cyan-500"
                            : "border-border/60 bg-surface-1/60 text-muted-foreground hover:bg-surface-2"
                        }`}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Button */}
                <div className="flex items-center justify-end pt-2">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={updateSettingsMutation.isPending}
                    className="h-8 gap-2 px-4 text-xs"
                  >
                    {updateSettingsMutation.isPending ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-3.5 w-3.5" /> Save Profile Details
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* ===================================================
              RIGHT COLUMN (5 Cols): Live CP Profile, Goal & Activity
          =================================================== */}
          <div className="space-y-6 md:col-span-5">
            {/* 1. "Your CP Profile" Live Identity Card */}
            <div className="space-y-4 rounded-2xl border border-border/70 bg-card/60 p-5 shadow-sm backdrop-blur-sm">
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
                    className="h-7 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                    title="Sync Codeforces submissions"
                  >
                    <RefreshCw
                      className={`h-3 w-3 ${linkMutation.isPending || cf?.sync_status === "syncing" ? "animate-spin text-primary" : ""}`}
                    />
                    <span>Sync</span>
                  </Button>
                )}
              </div>

              {hasHandle && cf ? (
                <div className="space-y-4">
                  {/* Rating & Rank Hero */}
                  <div className="flex items-center justify-between rounded-xl border border-border/60 bg-surface-1/80 p-3.5">
                    <div className="space-y-1">
                      <p className="text-[11px] font-medium text-muted-foreground">
                        Current Codeforces Rating
                      </p>
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono text-2xl font-bold text-foreground">
                          {cf.rating ?? "—"}
                        </span>
                        <Badge
                          variant="outline"
                          className={`border py-0.5 text-[11px] capitalize ${getRankBadgeStyle(cf.rank)}`}
                        >
                          {cf.rank || "Unranked"}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-0.5 text-right">
                      <p className="text-[10px] text-muted-foreground">Peak Rating</p>
                      <p className="font-mono text-xs font-semibold text-foreground/90">
                        {cf.max_rating ?? "—"}
                      </p>
                      <p className="text-[10px] capitalize text-muted-foreground/80">
                        {cf.max_rank ?? "—"}
                      </p>
                    </div>
                  </div>

                  {/* Rating Progress to Next Rank Milestone */}
                  <div className="space-y-1.5 rounded-xl border border-border/40 bg-surface-1/40 p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <TrendingUp className="h-3 w-3 text-primary" />
                        Next Rank:{" "}
                        <strong className="text-foreground">{nextRankInfo.nextRank}</strong>
                      </span>
                      <span className="font-mono text-[11px] font-semibold text-primary">
                        {nextRankInfo.remaining > 0 ? `+${nextRankInfo.remaining} pts` : "Max Rank"}
                      </span>
                    </div>

                    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                      <div
                        style={{ width: `${nextRankInfo.progressPercentage}%` }}
                        className="h-full rounded-full bg-gradient-to-r from-purple-500 to-emerald-400 transition-all duration-500"
                      />
                    </div>
                    <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground">
                      <span>{cf.rating || 0}</span>
                      <span>Target: {nextRankInfo.targetRating}</span>
                    </div>
                  </div>

                  {/* 3 Key Stats: Streak, Solved, Contests */}
                  <div className="grid grid-cols-3 gap-2.5">
                    {/* Streak */}
                    <div className="flex flex-col justify-between rounded-xl border border-border/50 bg-surface-1/60 p-3 text-center">
                      <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                        <Flame className="h-3 w-3 text-amber-500" />
                        <span>Streak</span>
                      </div>
                      <p className="mt-1 font-mono text-lg font-bold text-amber-400">
                        {dashboardData?.current_streak_days ?? 0}
                        <span className="ml-0.5 text-[10px] font-normal text-muted-foreground">
                          d
                        </span>
                      </p>
                      <p className="text-[9px] text-muted-foreground">
                        Max {dashboardData?.max_streak_days ?? 0}d
                      </p>
                    </div>

                    {/* Solved */}
                    <div className="flex flex-col justify-between rounded-xl border border-border/50 bg-surface-1/60 p-3 text-center">
                      <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                        <CheckCheck className="h-3 w-3 text-emerald-400" />
                        <span>Solved</span>
                      </div>
                      <p className="mt-1 font-mono text-lg font-bold text-emerald-400">
                        {dashboardData?.total_solved ?? 0}
                      </p>
                      <p className="text-[9px] text-muted-foreground">All-time</p>
                    </div>

                    {/* Contests */}
                    <div className="flex flex-col justify-between rounded-xl border border-border/50 bg-surface-1/60 p-3 text-center">
                      <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                        <Layers className="h-3 w-3 text-violet-400" />
                        <span>Contests</span>
                      </div>
                      <p className="mt-1 font-mono text-lg font-bold text-foreground">
                        {dashboardData?.contest_count ?? 0}
                      </p>
                      <p className="text-[9px] text-muted-foreground">Rated</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 rounded-xl border border-dashed border-border/80 bg-surface-1/30 p-4 text-center">
                  <ShieldCheck className="mx-auto h-7 w-7 text-muted-foreground/50" />
                  <p className="text-xs text-muted-foreground">
                    Connect your Codeforces handle in the <strong>Integrations</strong> tab to view
                    live rating progress, problem stats, and contest history.
                  </p>
                </div>
              )}
            </div>

            {/* 2. "Current Goal" Card */}
            <div className="space-y-4 rounded-2xl border border-border/70 bg-card/60 p-5 shadow-sm backdrop-blur-sm">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-foreground">Current Practice Goal</h3>
                </div>
                <Badge
                  variant="outline"
                  className="border-emerald-500/20 bg-emerald-500/10 text-[10px] text-emerald-400"
                >
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
                        className={`flex-1 rounded border py-1 font-mono text-xs font-medium transition-colors ${
                          targetRatingInput === trgt
                            ? "border-primary bg-primary/10 text-primary shadow-sm"
                            : "border-border/60 bg-surface-1/60 text-muted-foreground hover:bg-surface-2"
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
                    <span className="font-mono font-semibold text-amber-400">
                      {dailyTarget} problems / day
                    </span>
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
                        className={`flex-1 rounded border py-1 text-xs font-medium transition-colors ${
                          dailyTarget === t
                            ? "border-amber-500 bg-amber-500/10 text-amber-400 ring-1 ring-amber-500"
                            : "border-border/60 bg-surface-1/60 text-muted-foreground hover:bg-surface-2"
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
            <div className="space-y-3.5 rounded-2xl border border-border/70 bg-card/60 p-5 shadow-sm backdrop-blur-sm">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-cyan-400" />
                  <h3 className="text-sm font-semibold text-foreground">Quick Practice Hub</h3>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {formatRelativeTime(cf?.last_synced_at)}
                </span>
              </div>

              <div className="space-y-2">
                <Link
                  href="/solve"
                  className="group flex w-full items-center justify-between rounded-xl border border-border/60 bg-surface-1/70 p-2.5 transition-colors hover:bg-surface-2"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Terminal className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground transition-colors group-hover:text-primary">
                        Solve Workspace IDE
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Practice in VS Code style environment
                      </p>
                    </div>
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-primary" />
                </Link>

                <Link
                  href="/upsolve"
                  className="group flex w-full items-center justify-between rounded-xl border border-border/60 bg-surface-1/70 p-2.5 transition-colors hover:bg-surface-2"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                      <ListTodo className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground transition-colors group-hover:text-amber-400">
                        Upsolve Contest Queue
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Review and master failed problems
                      </p>
                    </div>
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-amber-400" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </TabsContent>

      {/* =======================================================
          --- 2. INTEGRATIONS TAB ---
      ======================================================= */}
      <TabsContent value="integrations" className="space-y-6 duration-200 animate-in fade-in">
        <div className="space-y-6 rounded-2xl border border-border/70 bg-card/60 p-6 shadow-sm backdrop-blur-sm">
          <div className="flex flex-col justify-between gap-2 border-b border-border/40 pb-3 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Connected Platforms</h3>
              <p className="text-xs text-muted-foreground">
                Manage your competitive programming identities and automated sync engine.
              </p>
            </div>
          </div>

          {/* Codeforces Platform Panel */}
          <div className="space-y-5 rounded-xl border border-border/60 bg-surface-1/70 p-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 font-mono text-sm font-bold text-primary">
                  CF
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-foreground">Codeforces</h4>
                    {hasHandle ? (
                      <span className="flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400"></span>{" "}
                        Connected
                      </span>
                    ) : (
                      <span className="rounded-full border border-border bg-muted/30 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        Not Linked
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {hasHandle
                      ? `Handle: @${currentHandle}`
                      : "Connect your handle to synchronize solved problems"}
                  </p>
                </div>
              </div>

              {hasHandle && (
                <div className="flex items-center gap-2">
                  <div className="hidden text-right text-xs sm:block">
                    <p className="text-[11px] text-muted-foreground">
                      Last sync:{" "}
                      <span className="font-medium text-foreground">
                        {formatRelativeTime(cf?.last_synced_at)}
                      </span>
                    </p>
                    <p className="text-[10px] capitalize text-muted-foreground/80">
                      Status: {cf?.sync_status}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    disabled={linkMutation.isPending || delinkMutation.isPending || cf?.sync_status === "syncing"}
                    onClick={handleManualSync}
                  >
                    {cf?.sync_status === "syncing" || linkMutation.isPending ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Syncing
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3.5 w-3.5" /> Sync Now
                      </>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 border-destructive/30 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={delinkMutation.isPending || linkMutation.isPending}
                    onClick={() => setShowDelinkConfirm((prev) => !prev)}
                  >
                    <Unlink className="h-3.5 w-3.5" /> Delink
                  </Button>
                </div>
              )}
            </div>

            {/* Delink Confirmation Banner */}
            {showDelinkConfirm && hasHandle && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 duration-300 animate-in fade-in">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                  <div className="flex-1 space-y-2">
                    <h5 className="text-xs font-semibold text-destructive">
                      Disconnect Codeforces Account @{currentHandle}?
                    </h5>
                    <p className="text-[11px] text-muted-foreground">
                      This will unlink <strong>@{currentHandle}</strong> from your NovaCP account and clear synced submissions, topic mastery data, and rating graphs.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-7 gap-1.5 text-xs font-medium"
                        disabled={delinkMutation.isPending}
                        onClick={handleDelinkHandle}
                      >
                        {delinkMutation.isPending ? (
                          <>
                            <RefreshCw className="h-3 w-3 animate-spin" /> Disconnecting...
                          </>
                        ) : (
                          <>
                            <Unlink className="h-3 w-3" /> Confirm Disconnect
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        disabled={delinkMutation.isPending}
                        onClick={() => setShowDelinkConfirm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Post-verification confirmation banner */}
            {justVerified && hasHandle && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 duration-300 animate-in fade-in">
                <div className="mb-0.5 flex items-center gap-2 text-xs font-semibold text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Codeforces account verified successfully
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Your handle <strong>{currentHandle}</strong> is active. You can now restore your
                  original First Name in your Codeforces social profile.
                </p>
              </div>
            )}

            {/* Verification Form */}
            {!isVerifying ? (
              <form
                onSubmit={handleStartVerification}
                className="space-y-3 border-t border-border/40 pt-2"
              >
                <label
                  htmlFor="cf-handle-input"
                  className="block text-xs font-medium text-muted-foreground"
                >
                  {hasHandle ? "Switch or Re-verify Handle" : "Link Codeforces Account"}
                </label>
                <div className="flex max-w-md flex-col gap-2.5 sm:flex-row">
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
                    className="h-9 shrink-0 text-xs"
                  >
                    {generateTokenMutation.isPending ? (
                      <>
                        <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Verifying...
                      </>
                    ) : hasHandle ? (
                      "Update Handle"
                    ) : (
                      "Link Handle"
                    )}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Ownership is securely verified via temporary first-name token check.
                </p>

                {generateTokenMutation.isError && (
                  <div className="flex max-w-md items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>
                      {(
                        generateTokenMutation.error as { response?: { data?: { detail?: string } } }
                      )?.response?.data?.detail ||
                        generateTokenMutation.error.message ||
                        "Failed to generate verification token."}
                    </span>
                  </div>
                )}
              </form>
            ) : (
              /* Step-by-Step Verification Box */
              <div className="space-y-4 border-t border-border/40 pt-2 duration-300 animate-in fade-in">
                <div className="space-y-4 rounded-xl border border-primary/30 bg-primary/5 p-5">
                  <div className="flex items-center justify-between gap-3 border-b border-primary/20 pb-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
                      <div>
                        <h5 className="text-xs font-semibold text-foreground">
                          Verify Account Ownership
                        </h5>
                        <p className="text-[11px] text-muted-foreground">
                          Linking handle:{" "}
                          <strong className="font-mono text-primary">@{handleInput}</strong>
                        </p>
                      </div>
                    </div>

                    {secondsLeft > 0 ? (
                      <Badge
                        variant="outline"
                        className="flex items-center gap-1 border-primary/30 bg-primary/10 px-2.5 py-0.5 font-mono text-[11px] text-primary"
                      >
                        <Clock className="h-3 w-3 animate-pulse" />
                        <span>{formatTime(secondsLeft)}</span>
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="px-2 py-0.5 text-[11px]">
                        Expired
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-start gap-2.5 rounded-lg border border-border/50 bg-background/60 p-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                        1
                      </span>
                      <div className="flex-1 space-y-1.5">
                        <p className="text-[11px] font-medium text-foreground">
                          Copy your temporary verification token:
                        </p>
                        <div className="flex items-center gap-2">
                          <code className="select-all rounded border border-border bg-muted px-2.5 py-1 font-mono text-xs font-semibold text-primary">
                            {verificationToken}
                          </code>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleCopyToken}
                            className="h-7 gap-1 px-2 text-xs"
                          >
                            {copied ? (
                              <Check className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                            {copied ? "Copied" : "Copy"}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 rounded-lg border border-border/50 bg-background/60 p-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                        2
                      </span>
                      <div className="flex-1">
                        <p className="text-[11px] font-medium text-foreground">
                          Set the token as your <strong>First Name</strong> in Codeforces Social
                          Settings:
                        </p>
                        <a
                          href="https://codeforces.com/settings/social"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                        >
                          Open Codeforces Settings <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 rounded-lg border border-border/50 bg-background/60 p-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                        3
                      </span>
                      <div className="flex-1">
                        <p className="text-[11px] font-medium text-foreground">
                          Save changes on Codeforces, then confirm below.
                        </p>
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
                        className="h-8 gap-1.5 text-xs"
                      >
                        {linkMutation.isPending ? (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Verifying Profile...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" /> Confirm Verification
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleStartVerification}
                        disabled={generateTokenMutation.isPending}
                        className="h-8 gap-1.5 text-xs"
                      >
                        <RefreshCw className="h-3.5 w-3.5" /> Generate New Token
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelVerification}
                      disabled={linkMutation.isPending}
                      className="h-8 text-xs"
                    >
                      Cancel
                    </Button>
                  </div>

                  {linkMutation.isError && (
                    <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>
                        {(linkMutation.error as { response?: { data?: { detail?: string } } })
                          ?.response?.data?.detail ||
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
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Upcoming Platforms
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { name: "AtCoder", desc: "Japanese CP platform sync & analytics", code: "AC" },
                { name: "CodeChef", desc: "Star ratings & monthly challenges", code: "CC" },
                { name: "LeetCode", desc: "Interview prep & weekly contests", code: "LC" },
              ].map((p) => (
                <div
                  key={p.name}
                  className="flex flex-col justify-between rounded-xl border border-border/40 bg-surface-1/40 p-4 opacity-70"
                >
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-muted/60 font-mono text-[10px] font-bold text-muted-foreground">
                          {p.code}
                        </span>
                        {p.name}
                      </span>
                      <Badge
                        variant="outline"
                        className="border-border/60 px-1.5 py-0 text-[10px] text-muted-foreground"
                      >
                        v2
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{p.desc}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled
                    className="mt-3 h-7 w-full text-[11px]"
                  >
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
      <TabsContent value="preferences" className="space-y-6 duration-200 animate-in fade-in">
        <div className="space-y-6 rounded-2xl border border-border/70 bg-card/60 p-6 shadow-sm backdrop-blur-sm">
          <div className="border-b border-border/40 pb-3">
            <h3 className="text-sm font-semibold text-foreground">
              Practice & AI Coach Preferences
            </h3>
            <p className="text-xs text-muted-foreground">
              Tailor your problem recommendation difficulty, focus topics, and practice goals.
            </p>
          </div>

          {/* Recommendation Engine Aggressiveness */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-emerald-400" />
              <h4 className="text-xs font-semibold text-foreground">Recommendation Engine Mode</h4>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Control how aggressively the AI pushes your problem rating boundary.
            </p>

            <div className="grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                {
                  id: "comfort",
                  title: "Comfort Zone",
                  delta: "-100 to 0",
                  desc: "Reinforce fundamentals and speed on familiar ratings",
                },
                {
                  id: "challenge",
                  title: "Challenge Mode",
                  delta: "+100 to +300",
                  desc: "Optimal growth zone for consistent rating improvements",
                },
                {
                  id: "hardcore",
                  title: "Hardcore",
                  delta: "+300 to +500",
                  desc: "Push your analytical boundaries with high-difficulty stretch tasks",
                },
              ].map((diff) => (
                <div
                  key={diff.id}
                  onClick={() => {
                    setDifficulty(diff.id)
                    handleUpdatePreferences({ recommendation_mode: diff.id as any })
                  }}
                  className={`flex cursor-pointer flex-col justify-between gap-2 rounded-xl border p-3.5 transition-all duration-200 ${
                    difficulty === diff.id
                      ? "border-emerald-500 bg-emerald-500/10 text-foreground shadow-sm ring-1 ring-emerald-500"
                      : "border-border/60 bg-surface-1/60 text-muted-foreground hover:bg-surface-2"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">{diff.title}</span>
                      <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] text-emerald-400">
                        {diff.delta}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      {diff.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="h-px w-full bg-border/40"></div>

          {/* Focus Topic Tags */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <h4 className="text-xs font-semibold text-foreground">Preferred Practice Topics</h4>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Select topics you want prioritized in your Daily Missions and Skill Builder
              recommendations.
            </p>

            <div className="flex max-w-3xl flex-wrap gap-2">
              {CP_TOPICS.map((topic) => {
                const isSelected = preferredTopics.includes(topic)
                return (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => handleToggleTopic(topic)}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary shadow-sm"
                        : "border-border/60 bg-surface-1/60 text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3 text-primary" />}
                    {topic}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="h-px w-full bg-border/40"></div>

          {/* Daily Goal & Language */}
          <div className="grid max-w-3xl grid-cols-1 gap-6 md:grid-cols-2">
            {/* Daily Goal */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-amber-500" />
                <h4 className="text-xs font-semibold text-foreground">Daily Practice Goal</h4>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Target solved problems required to preserve your daily practice streak.
              </p>
              <div className="flex gap-2">
                {[1, 2, 3, 5].map((target) => (
                  <button
                    key={target}
                    type="button"
                    onClick={() => {
                      setDailyTarget(target)
                      handleUpdatePreferences({ daily_target_problems: target })
                    }}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      dailyTarget === target
                        ? "border-amber-500 bg-amber-500/10 text-amber-400 ring-1 ring-amber-500"
                        : "border-border/60 bg-surface-1/60 text-muted-foreground hover:bg-surface-2"
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
                <Code2 className="h-4 w-4 text-cyan-400" />
                <h4 className="text-xs font-semibold text-foreground">Primary Language</h4>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Default code templates and AI Coach syntax language.
              </p>
              <div className="flex flex-wrap gap-2">
                {["cpp", "python", "java", "rust", "go"].map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => {
                      setLanguage(lang)
                      handleUpdatePreferences({ primary_language: lang })
                    }}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium uppercase transition-colors ${
                      language === lang
                        ? "border-cyan-500 bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500"
                        : "border-border/60 bg-surface-1/60 text-muted-foreground hover:bg-surface-2"
                    }`}
                  >
                    {lang === "cpp" ? "C++" : lang}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="h-px w-full bg-border/40"></div>

          {/* Timezone & Audio */}
          <div className="grid max-w-3xl grid-cols-1 gap-6 md:grid-cols-2">
            {/* Timezone */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-blue-400" />
                <h4 className="text-xs font-semibold text-foreground">Timezone</h4>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Used for daily streak transitions and contest countdown schedules.
              </p>
              <div className="flex items-center gap-2">
                <select
                  value={timezone}
                  onChange={(e) => {
                    const tz = e.target.value
                    setTimezone(tz)
                    handleUpdatePreferences({ timezone: tz })
                  }}
                  className="h-8 w-full max-w-xs rounded-lg border border-input bg-background px-2.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                >
                  {Intl.supportedValuesOf("timeZone").map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDetectTimezone}
                  className="h-8 shrink-0 gap-1 px-2 text-xs"
                >
                  <Sparkles className="h-3 w-3 text-amber-400" /> Auto-Detect
                </Button>
              </div>
            </div>

            {/* Audio Effects */}
            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-surface-1/50 p-3.5">
              <div>
                <h5 className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <Volume2 className="h-3.5 w-3.5 text-emerald-400" /> Solve Celebrations
                </h5>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Sound feedback when passing test cases.
                </p>
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
      <TabsContent value="notifications" className="space-y-6 duration-200 animate-in fade-in">
        <div className="space-y-6 rounded-2xl border border-border/70 bg-card/60 p-6 shadow-sm backdrop-blur-sm">
          <div className="flex flex-col justify-between gap-3 border-b border-border/40 pb-3 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-sm font-semibold text-foreground">In-App Alert Channels</h3>
              <p className="text-xs text-muted-foreground">
                Configure real-time notifications dispatched to your top navigation bell.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestAlert}
              disabled={triggerTestNotifMutation.isPending}
              className="h-8 gap-2 text-xs"
            >
              {triggerTestNotifMutation.isPending ? (
                <>
                  <RefreshCw className="h-3 w-3 animate-spin" /> Dispatching...
                </>
              ) : (
                <>
                  <Bell className="h-3.5 w-3.5 text-primary" /> Test Alert Bell
                </>
              )}
            </Button>
          </div>

          <div className="space-y-3">
            {/* Contest Reminders */}
            <div className="space-y-3 rounded-xl border border-border/60 bg-surface-1/60 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-foreground">Contest Start Reminders</h4>
                  <p className="text-[11px] text-muted-foreground">
                    Receive an alert before upcoming live competitive programming rounds begin.
                  </p>
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
                <div className="flex flex-wrap items-center gap-4 border-t border-border/40 pt-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">Notify before:</span>
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
            <div className="space-y-3 rounded-xl border border-border/60 bg-surface-1/60 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Flame className="h-3.5 w-3.5 text-amber-500" /> Daily Streak Saver Alert
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Evening reminder if you haven't completed your daily target problems yet.
                  </p>
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
                <div className="flex items-center gap-2 border-t border-border/40 pt-2 text-xs">
                  <span className="text-[11px] text-muted-foreground">Reminder time:</span>
                  <input
                    type="time"
                    value={streakSaverTime}
                    onChange={(e) => {
                      setStreakSaverTime(e.target.value)
                      handleUpdateNotifications({ streak_saver_time: e.target.value })
                    }}
                    className="h-7 rounded border border-input bg-background px-2 font-mono text-xs"
                  />
                </div>
              )}
            </div>

            {/* Daily Mission Available */}
            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-surface-1/60 p-4">
              <div>
                <h4 className="text-xs font-semibold text-foreground">Daily Mission Dispatched</h4>
                <p className="text-[11px] text-muted-foreground">
                  Alert when your 24-hour targeted training challenge is generated.
                </p>
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
            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-surface-1/60 p-4">
              <div>
                <h4 className="text-xs font-semibold text-foreground">Background Sync Updates</h4>
                <p className="text-[11px] text-muted-foreground">
                  Notifications when recent contest or problem submissions finish indexing.
                </p>
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

          <div className="h-px w-full bg-border/40"></div>

          {/* Data & Storage Management */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Data & Storage Management
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col justify-between gap-3 rounded-xl border border-border/60 bg-surface-1/40 p-4">
                <div>
                  <h5 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Download className="h-3.5 w-3.5 text-primary" /> Export Solved Archive
                  </h5>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Download your indexed Codeforces history and submission notes as CSV.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportData}
                  className="h-8 w-full text-xs"
                >
                  Export CSV
                </Button>
              </div>

              <div className="flex flex-col justify-between gap-3 rounded-xl border border-border/60 bg-surface-1/40 p-4">
                <div>
                  <h5 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Database className="h-3.5 w-3.5 text-amber-400" /> Clear Local Cache
                  </h5>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Purge cached problems, hints, and sync queues from your browser storage.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearCache}
                  className="h-8 w-full text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
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
