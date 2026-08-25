import type { ApiResponse, ApiError, PaginatedResponse } from "@novacp/types"

const IS_SERVER = typeof window === "undefined"
// Server-side (SSR/Server Actions) calls go directly to FastAPI
// Client-side calls go to the Next.js proxy route (relative URL)
const API_BASE = IS_SERVER
  ? (process.env.API_URL?.trim() || "http://localhost:8000")
  : ""
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY ?? ""

// -------------------------------------------------------
// Request Options
// -------------------------------------------------------

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown
  params?: Record<string, string | number | boolean | undefined>
  /** Set to true for server-side calls from Server Components/Actions */
  server?: boolean
}

// -------------------------------------------------------
// API Error class
// -------------------------------------------------------

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: string
  ) {
    super(`API Error ${status}: ${detail}`)
    this.name = "ApiClientError"
  }
}

// -------------------------------------------------------
// Core fetch wrapper
// -------------------------------------------------------

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, params, server = false, ...fetchOptions } = options

  // Build URL with query params
  const base = IS_SERVER
    ? API_BASE
    : (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000")
  const url = path.startsWith("http://") || path.startsWith("https://")
    ? new URL(path)
    : new URL(path.startsWith("/") ? path : `/${path}`, base)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value))
      }
    })
  }

  // Build headers
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  }

  // Server-side calls include the internal API key
  if (server && INTERNAL_API_KEY) {
    headers["X-Internal-API-Key"] = INTERNAL_API_KEY
  }

  const response = await fetch(url.toString(), {
    ...fetchOptions,
    headers: {
      ...headers,
      ...(fetchOptions.headers as Record<string, string>),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    // Next.js cache control — default to no-store for API calls
    cache: fetchOptions.cache ?? "no-store",
  })

  if (!response.ok) {
    let detail = "An unexpected error occurred"
    try {
      const errorBody = (await response.json()) as ApiError
      detail = errorBody.detail ?? detail
    } catch {
      // Response body may not be JSON
    }
    throw new ApiClientError(response.status, detail)
  }

  // Handle empty responses (204 No Content)
  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

// -------------------------------------------------------
// Typed API Client
// -------------------------------------------------------

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "GET" }),

  post: <T>(path: string, body: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body }),

  put: <T>(path: string, body: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PUT", body }),

  patch: <T>(path: string, body: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PATCH", body }),

  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "DELETE" }),
}

// Re-export response types for convenience
export type { ApiResponse, ApiError, PaginatedResponse }
