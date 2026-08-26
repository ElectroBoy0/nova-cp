"use client"

import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Check,
  ChevronRight,
  Code2,
  Flame,
  Globe,
  Loader2,
  Sparkles,
  Target,
  Terminal,
  Trophy,
  User,
  Zap,
} from "lucide-react"
import { useLinkHandle, useUpdateSettings } from "@/lib/users"
import { toast } from "sonner"
import type { UserProfile } from "@/types/users"

interface OnboardingDialogProps {
  user: UserProfile | null
  open?: boolean
  onComplete?: () => void
}

const LANGUAGES = [
  { id: "cpp", name: "C++", desc: "C++20 (GCC 13.2) • Fast I/O" },
  { id: "python", name: "Python", desc: "Python 3.12 • Rapid Prototyping" },
  { id: "java", name: "Java", desc: "Java 17 (OpenJDK)" },
  { id: "rust", name: "Rust", desc: "Rust 2021 Edition" },
  { id: "go", name: "Go", desc: "Go 1.22" },
]

const INTENSITY_MODES = [
  {
    id: "comfort",
    title: "Comfort Zone",
    badge: "±0 Delta",
    desc: "Problems around your rating to build consistency and speed.",
    icon: Zap,
    color: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  },
  {
    id: "challenge",
    title: "Challenge Mode",
    badge: "+100 to +200 Delta",
    desc: "Optimal growth zone for rating jumps and contest preparation.",
    icon: Sparkles,
    color: "border-purple-500/30 bg-purple-500/10 text-purple-400",
    recommended: true,
  },
  {
    id: "hardcore",
    title: "Hardcore Grind",
    badge: "+300+ Delta",
    desc: "High-difficulty problems to push algorithm invariants to the limit.",
    icon: Flame,
    color: "border-rose-500/30 bg-rose-500/10 text-rose-400",
  },
]

export function OnboardingDialog({ user, open, onComplete }: OnboardingDialogProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [isOpen, setIsOpen] = useState(
    open !== undefined ? open : user ? !user.onboarding_completed : false
  )

  // Form states
  const [handle, setHandle] = useState(user?.cf_handle?.handle || "")
  const [language, setLanguage] = useState(user?.custom_preferences?.primary_language || "cpp")
  const [intensity, setIntensity] = useState<"comfort" | "challenge" | "hardcore">(
    user?.custom_preferences?.recommendation_mode || "challenge"
  )
  const [dailyTarget, setDailyTarget] = useState<number>(
    user?.custom_preferences?.daily_target_problems || 2
  )

  const linkMutation = useLinkHandle()
  const updateSettingsMutation = useUpdateSettings()

  const userId = user?.id

  // Handle Step 1 -> Step 2
  const handleNextFromHandle = () => {
    if (handle.trim() && userId && (!user?.cf_handle || user.cf_handle.handle !== handle.trim())) {
      linkMutation.mutate(
        { userId, handle: handle.trim() },
        {
          onSuccess: () => {
            setStep(2)
          },
          onError: () => {
            // Still allow proceeding even if sync fails
            setStep(2)
          },
        }
      )
    } else {
      setStep(2)
    }
  }

  // Handle Finish Setup
  const handleFinish = () => {
    if (!userId) return

    updateSettingsMutation.mutate(
      {
        userId,
        settings: {
          custom_preferences: {
            ...user?.custom_preferences,
            primary_language: language,
            recommendation_mode: intensity,
            daily_target_problems: dailyTarget,
          },
        },
      },
      {
        onSuccess: () => {
          setIsOpen(false)
          toast.success("Welcome to NovaCP! Your workspace is ready.", {
            description: "Your personalized recommendations and daily missions are active.",
          })
          if (onComplete) onComplete()
        },
        onError: () => {
          toast.error("Failed to save onboarding settings. Please try again.")
        },
      }
    )
  }

  if (!user) return null

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="gap-0 overflow-hidden border-border/80 bg-card/95 p-0 shadow-2xl backdrop-blur-xl sm:max-w-xl">
        {/* Header with Progress Steps */}
        <div className="border-b border-border/60 bg-surface-1/40 p-6 pb-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg border border-primary/30 bg-primary/10 p-1.5 text-primary">
                <Terminal className="h-4 w-4" />
              </div>
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                NovaCP Setup
              </span>
            </div>

            {/* Step badges */}
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <span
                className={`rounded-full px-2 py-0.5 ${
                  step === 1
                    ? "bg-primary font-bold text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                1
              </span>
              <span className="text-muted-foreground">•</span>
              <span
                className={`rounded-full px-2 py-0.5 ${
                  step === 2
                    ? "bg-primary font-bold text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                2
              </span>
              <span className="text-muted-foreground">•</span>
              <span
                className={`rounded-full px-2 py-0.5 ${
                  step === 3
                    ? "bg-primary font-bold text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                3
              </span>
            </div>
          </div>

          <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
            {step === 1 && "Connect Codeforces Handle"}
            {step === 2 && "Select Default Language"}
            {step === 3 && "Set Practice Intensity"}
          </DialogTitle>
          <DialogDescription className="mt-1 text-xs text-muted-foreground">
            {step === 1 &&
              "Link your competitive programming profile to unlock tailored problem recommendations."}
            {step === 2 &&
              "Choose your primary language for code editor boilerplates and test execution."}
            {step === 3 &&
              "Customize daily missions and problem recommendation difficulty for your goals."}
          </DialogDescription>
        </div>

        {/* Step Contents */}
        <div className="space-y-5 p-6">
          {/* STEP 1: Codeforces Handle */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="flex items-center justify-between text-xs font-medium text-foreground">
                  <span>Codeforces Handle</span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    Case-insensitive
                  </span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="e.g. tourist, Benq, your_handle"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    className="border-border/80 bg-background pl-9 font-mono text-sm"
                    autoFocus
                  />
                </div>
              </div>

              {user.cf_handle && (
                <div className="flex items-center justify-between rounded-lg border border-purple-500/20 bg-purple-500/5 p-3">
                  <div className="flex items-center gap-2.5">
                    <Trophy className="h-4 w-4 text-purple-400" />
                    <div>
                      <div className="text-xs font-semibold text-foreground">
                        {user.cf_handle.handle}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Rating: {user.cf_handle.rating || "Unrated"} •{" "}
                        {user.cf_handle.rank || "Newbie"}
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-purple-500/30 text-[10px] text-purple-400"
                  >
                    Linked
                  </Badge>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep(2)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Skip for now
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleNextFromHandle}
                  disabled={linkMutation.isPending}
                  className="gap-1.5 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                >
                  {linkMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Continue</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: Preferred Language */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {LANGUAGES.map((lang) => {
                  const isSelected = language === lang.id
                  return (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => setLanguage(lang.id)}
                      className={`flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border/60 bg-surface-1/40 hover:border-border hover:bg-surface-1"
                      }`}
                    >
                      <div className="mb-1 flex w-full items-center justify-between">
                        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                          <Code2 className="h-4 w-4 text-primary" />
                          {lang.name}
                        </span>
                        {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" />}
                      </div>
                      <span className="text-[11px] text-muted-foreground">{lang.desc}</span>
                    </button>
                  )
                })}
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep(1)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Back
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setStep(3)}
                  className="gap-1.5 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                >
                  <span>Next: Practice Goals</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Intensity & Target */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground">
                  Recommendation Intensity
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {INTENSITY_MODES.map((mode) => {
                    const isSelected = intensity === mode.id
                    const Icon = mode.icon
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setIntensity(mode.id as any)}
                        className={`flex items-center justify-between rounded-xl border p-3 text-left transition-all ${
                          isSelected
                            ? "border-primary bg-primary/10 shadow-sm"
                            : "border-border/60 bg-surface-1/40 hover:border-border hover:bg-surface-1"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`rounded-lg border p-2 ${mode.color}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-foreground">
                                {mode.title}
                              </span>
                              <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                                {mode.badge}
                              </Badge>
                              {mode.recommended && (
                                <Badge className="border-purple-500/30 bg-purple-500/20 px-1 py-0 text-[9px] text-purple-300">
                                  Recommended
                                </Badge>
                              )}
                            </div>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">{mode.desc}</p>
                          </div>
                        </div>
                        {isSelected && <Check className="ml-2 h-4 w-4 shrink-0 text-primary" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Daily Problem Goal */}
              <div className="space-y-2 pt-1">
                <label className="flex items-center justify-between text-xs font-medium text-foreground">
                  <span className="flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5 text-primary" /> Daily Problem Target
                  </span>
                  <span className="font-mono text-[11px] font-bold text-primary">
                    {dailyTarget} {dailyTarget === 1 ? "problem" : "problems"} / day
                  </span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 5].map((target) => (
                    <button
                      key={target}
                      type="button"
                      onClick={() => setDailyTarget(target)}
                      className={`rounded-lg border py-2 font-mono text-xs font-semibold transition-all ${
                        dailyTarget === target
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border/60 bg-surface-1/40 text-muted-foreground hover:bg-surface-1"
                      }`}
                    >
                      {target} / day
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep(2)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Back
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleFinish}
                  disabled={updateSettingsMutation.isPending}
                  className="gap-1.5 bg-primary font-semibold text-primary-foreground shadow-md shadow-purple-900/20 hover:bg-primary/90"
                >
                  {updateSettingsMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  <span>Complete Setup</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
