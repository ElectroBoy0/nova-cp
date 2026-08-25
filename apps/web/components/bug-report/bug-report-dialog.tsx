"use client"

import React, { useState, useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Bug,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  Laptop,
  Globe,
  Route,
  Maximize2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Sparkles,
} from "lucide-react"
import { useSubmitBugReport, uploadScreenshot } from "@/lib/bug-reports"
import type { BugCategory, BugPriority, EnvironmentMetadata } from "@/types/bug-report"

interface BugReportDialogProps {
  userId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CATEGORIES: { label: string; value: BugCategory }[] = [
  { label: "Codeforces Sync", value: "Codeforces Sync" },
  { label: "Recommendations", value: "Recommendations" },
  { label: "Analytics", value: "Analytics" },
  { label: "Problem Explorer", value: "Problem Explorer" },
  { label: "Authentication", value: "Authentication" },
  { label: "UI / UX", value: "UI/UX" },
  { label: "Performance", value: "Performance" },
  { label: "Other Issue", value: "Other" },
]

const PRIORITIES: { label: string; value: BugPriority; color: string }[] = [
  { label: "Low", value: "LOW", color: "text-muted-foreground border-border" },
  { label: "Medium", value: "MEDIUM", color: "text-sky-400 border-sky-500/30 bg-sky-500/10" },
  { label: "High", value: "HIGH", color: "text-amber-400 border-amber-500/30 bg-amber-500/10" },
  { label: "Critical", value: "CRITICAL", color: "text-rose-400 border-rose-500/30 bg-rose-500/10" },
]

export function BugReportDialog({ userId, open, onOpenChange }: BugReportDialogProps) {
  const pathname = usePathname()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form states
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState<BugCategory>("Codeforces Sync")
  const [priority, setPriority] = useState<BugPriority>("MEDIUM")
  const [description, setDescription] = useState("")
  const [reproductionSteps, setReproductionSteps] = useState("")
  const [expectedBehavior, setExpectedBehavior] = useState("")
  const [actualBehavior, setActualBehavior] = useState("")
  const [showExtendedFields, setShowExtendedFields] = useState(false)

  // Screenshot states
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null)
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  // Diagnostics metadata
  const [metadata, setMetadata] = useState<EnvironmentMetadata>({
    route: pathname || "/",
    browser: "Unknown",
    os: "Unknown",
    viewport: "Unknown",
    app_version: "1.0.0-beta",
  })
  const [showMetadata, setShowMetadata] = useState(false)

  // Submission state
  const [submittedReportId, setSubmittedReportId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const submitMutation = useSubmitBugReport()

  // Collect environment diagnostic details on mount/open
  useEffect(() => {
    if (typeof window !== "undefined" && open) {
      const ua = navigator.userAgent
      let browserName = "Browser"
      if (ua.includes("Firefox")) browserName = "Firefox"
      else if (ua.includes("Chrome")) browserName = "Chrome"
      else if (ua.includes("Safari")) browserName = "Safari"
      else if (ua.includes("Edge")) browserName = "Edge"

      let osName = "Desktop"
      if (ua.includes("Mac")) osName = "macOS"
      else if (ua.includes("Win")) osName = "Windows"
      else if (ua.includes("Linux")) osName = "Linux"

      setMetadata({
        route: window.location.pathname,
        browser: `${browserName}`,
        os: osName,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        app_version: "1.0.0-beta",
        user_id: userId,
      })
    }
  }, [open, pathname, userId])

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith("image/")) {
        setErrorMessage("Please select a valid image file (PNG, JPG, WebP)")
        return
      }
      setScreenshotFile(file)
      const reader = new FileReader()
      reader.onload = () => {
        setScreenshotPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
      setErrorMessage(null)
    }
  }

  const handleRemoveScreenshot = () => {
    setScreenshotFile(null)
    setScreenshotPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!title.trim()) {
      setErrorMessage("Please provide a summary title for the issue")
      return
    }

    if (!description.trim()) {
      setErrorMessage("Please provide a description of the issue")
      return
    }

    try {
      let uploadedUrl: string | null = null

      if (screenshotFile) {
        setIsUploadingImage(true)
        const uploadResult = await uploadScreenshot(screenshotFile)
        uploadedUrl = uploadResult.url
        setIsUploadingImage(false)
      }

      const report = await submitMutation.mutateAsync({
        userId,
        input: {
          title: title.trim(),
          category,
          priority,
          description: description.trim(),
          reproduction_steps: reproductionSteps.trim() || undefined,
          expected_behavior: expectedBehavior.trim() || undefined,
          actual_behavior: actualBehavior.trim() || undefined,
          screenshot_url: uploadedUrl,
          environment_metadata: metadata,
        },
      })

      setSubmittedReportId(report.id)
    } catch (err: any) {
      setIsUploadingImage(false)
      setErrorMessage(err.message || "Failed to submit bug report. Please try again.")
    }
  }

  const handleReset = () => {
    setTitle("")
    setDescription("")
    setReproductionSteps("")
    setExpectedBehavior("")
    setActualBehavior("")
    setScreenshotFile(null)
    setScreenshotPreview(null)
    setSubmittedReportId(null)
    setErrorMessage(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto bg-card border-border/80 p-6 shadow-2xl">
        {submittedReportId ? (
          <div className="py-6 text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-lg font-bold text-foreground">Bug Report Received</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Thank you for helping us polish NovaCP during beta! We&apos;ve logged this issue for engineering.
              </DialogDescription>
            </div>

            <div className="inline-block p-3 rounded-lg bg-surface-1 border border-border/60 font-mono text-xs text-muted-foreground">
              Reference: <strong className="text-primary">#{submittedReportId.slice(0, 8)}</strong>
            </div>

            <div className="pt-4">
              <Button onClick={handleReset} className="w-full text-xs">
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader className="space-y-1 text-left">
              <div className="flex items-center gap-2 text-primary">
                <Bug className="w-4 h-4" />
                <DialogTitle className="text-base font-bold text-foreground">Report an Issue</DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                Found a bug or calculation anomaly? Let us know with details and reproduction steps.
              </DialogDescription>
            </DialogHeader>

            {errorMessage && (
              <div className="p-3 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Issue Title *</label>
              <input
                type="text"
                placeholder="e.g. [Upsolve] Solved contest problem not updating status"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-md bg-background border border-border/80 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>

            {/* Category & Priority Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as BugCategory)}
                  className="w-full px-2.5 py-2 text-xs rounded-md bg-background border border-border/80 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Priority</label>
                <div className="grid grid-cols-4 gap-1">
                  {PRIORITIES.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPriority(p.value)}
                      className={`px-1.5 py-2 rounded text-[10px] font-mono font-semibold border transition-all ${
                        priority === p.value
                          ? `${p.color} ring-1 ring-primary/40`
                          : "text-muted-foreground border-border/60 bg-surface-1 hover:text-foreground"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Description *</label>
              <textarea
                rows={3}
                placeholder="Describe what happened and where the issue occurred..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-md bg-background border border-border/80 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>

            {/* Optional Structured Fields Collapsible */}
            <div>
              <button
                type="button"
                onClick={() => setShowExtendedFields(!showExtendedFields)}
                className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
              >
                {showExtendedFields ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span>{showExtendedFields ? "Hide reproduction details" : "Add reproduction steps & expected behavior (optional)"}</span>
              </button>

              {showExtendedFields && (
                <div className="mt-3 space-y-3 p-3 rounded-lg border border-border/60 bg-surface-1/50">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-foreground">Steps to Reproduce</label>
                    <textarea
                      rows={2}
                      placeholder="1. Navigate to /problems&#10;2. Filter by Dynamic Programming&#10;3. Click on problem 1842C"
                      value={reproductionSteps}
                      onChange={(e) => setReproductionSteps(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-mono rounded bg-background border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-foreground">Expected Behavior</label>
                      <input
                        type="text"
                        placeholder="e.g. Problem marked as solved"
                        value={expectedBehavior}
                        onChange={(e) => setExpectedBehavior(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded bg-background border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-foreground">Actual Behavior</label>
                      <input
                        type="text"
                        placeholder="e.g. Shows Attempted status"
                        value={actualBehavior}
                        onChange={(e) => setActualBehavior(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded bg-background border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Screenshot Upload Dropzone */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Screenshot (optional)</span>
                <span className="text-[10px] text-muted-foreground">PNG, JPG, WebP $\le$ 3MB</span>
              </label>

              {screenshotPreview ? (
                <div className="relative rounded-lg border border-border/80 bg-surface-1 p-2 flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={screenshotPreview}
                    alt="Screenshot Preview"
                    className="h-16 w-24 object-cover rounded border border-border"
                  />
                  <div className="flex-1 min-w-0 text-xs">
                    <p className="font-mono text-[11px] truncate text-foreground">{screenshotFile?.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {screenshotFile ? `${(screenshotFile.size / 1024).toFixed(0)} KB (Auto-compressed)` : ""}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={handleRemoveScreenshot}
                    className="text-muted-foreground hover:text-rose-400"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg border border-dashed border-border/80 bg-surface-1/40 hover:bg-surface-2/40 p-4 text-center cursor-pointer transition-colors space-y-1"
                >
                  <Upload className="w-4 h-4 mx-auto text-muted-foreground" />
                  <p className="text-xs text-foreground font-medium">Click to attach screenshot</p>
                  <p className="text-[10px] text-muted-foreground">Images are compressed automatically</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              )}
            </div>

            {/* Auto-Captured Diagnostic Metadata Bar */}
            <div className="pt-2 border-t border-border/40 space-y-2">
              <button
                type="button"
                onClick={() => setShowMetadata(!showMetadata)}
                className="flex items-center justify-between w-full text-[11px] text-muted-foreground hover:text-foreground font-mono"
              >
                <span className="flex items-center gap-1.5">
                  <Laptop className="w-3 h-3 text-primary" /> Auto-attached diagnostics
                </span>
                <span>{showMetadata ? "Hide details" : "View"}</span>
              </button>

              {showMetadata && (
                <div className="flex flex-wrap gap-1.5 text-[10px] font-mono text-muted-foreground pt-1">
                  <span className="px-2 py-0.5 rounded bg-surface-2 border border-border">Route: {metadata.route}</span>
                  <span className="px-2 py-0.5 rounded bg-surface-2 border border-border">OS: {metadata.os}</span>
                  <span className="px-2 py-0.5 rounded bg-surface-2 border border-border">Browser: {metadata.browser}</span>
                  <span className="px-2 py-0.5 rounded bg-surface-2 border border-border">Viewport: {metadata.viewport}</span>
                  <span className="px-2 py-0.5 rounded bg-surface-2 border border-border">v{metadata.app_version}</span>
                </div>
              )}
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitMutation.isPending || isUploadingImage}
                className="text-xs gap-1.5"
              >
                {(submitMutation.isPending || isUploadingImage) && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Submit Bug Report
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
