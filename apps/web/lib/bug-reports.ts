import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { BugReport, BugReportCreateInput } from "@/types/bug-report"

/**
 * Compresses an image client-side using HTML5 Canvas before uploading
 */
export async function compressScreenshot(file: File, maxDimension = 1600, quality = 0.82): Promise<File> {
  // If not in browser or not an image, return raw
  if (typeof window === "undefined" || !file.type.startsWith("image/")) {
    return file
  }

  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string
      img.onload = () => {
        let width = img.width
        let height = img.height

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width)
            width = maxDimension
          } else {
            width = Math.round((width * maxDimension) / height)
            height = maxDimension
          }
        }

        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          return resolve(file)
        }

        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve(file)
            }
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".webp"), {
              type: "image/webp",
              lastModified: Date.now(),
            })
            resolve(compressedFile)
          },
          "image/webp",
          quality
        )
      }
      img.onerror = () => resolve(file)
    }
    reader.onerror = () => resolve(file)
  })
}

/**
 * Uploads a compressed screenshot to the upload abstraction endpoint
 */
export async function uploadScreenshot(file: File): Promise<{ url: string }> {
  const compressed = await compressScreenshot(file)
  const formData = new FormData()
  formData.append("file", compressed)

  const res = await fetch("/api/v1/uploads/screenshot", {
    method: "POST",
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Upload failed" }))
    throw new Error(err.detail || "Failed to upload screenshot")
  }

  return res.json()
}

/**
 * Submits a bug report linked to the user
 */
export async function submitBugReport(userId: string, input: BugReportCreateInput): Promise<BugReport> {
  const res = await fetch(`/api/v1/bug-reports?user_id=${userId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Submission failed" }))
    throw new Error(err.detail || "Failed to submit bug report")
  }

  return res.json()
}

/**
 * React Query mutation for submitting bug reports
 */
export function useSubmitBugReport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, input }: { userId: string; input: BugReportCreateInput }) =>
      submitBugReport(userId, input),
    onSuccess: (_, { userId }) => {
      // Invalidate notifications in case a confirmation was dispatched
      queryClient.invalidateQueries({ queryKey: ["notifications", userId] })
    },
  })
}
