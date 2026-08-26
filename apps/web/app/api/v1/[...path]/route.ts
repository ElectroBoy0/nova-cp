import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

const API_BASE_URL = process.env.API_URL ?? "http://localhost:8000"
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY ?? ""

// Helper to proxy requests to the FastAPI backend with session validation
async function proxyRequest(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params
  const path = resolvedParams.path
  const pathString = path.join("/")
  const searchParams = req.nextUrl.searchParams.toString()
  const url = `${API_BASE_URL}/api/v1/${pathString}${searchParams ? `?${searchParams}` : ""}`

  // Authorization check for user-scoped endpoints
  let targetUserId: string | null | undefined = null

  if (path[0] === "users" && path.length >= 2 && path[1] !== "sync") {
    targetUserId = path[1]
  } else if (path[0] === "daily-mission" && path.length >= 2) {
    targetUserId = path[1]
  } else if (
    path[0] === "problems" &&
    (path[1] === "recommendations" || path[1] === "feedback") &&
    path.length >= 3
  ) {
    targetUserId = path[2]
  } else if (path[0] === "snippets") {
    targetUserId = req.nextUrl.searchParams.get("user_id")
  } else if (path[0] === "bug-reports" && req.method === "POST") {
    targetUserId = req.nextUrl.searchParams.get("user_id")
  }

  if (targetUserId) {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ detail: "Authentication required" }, { status: 401 })
    }
    if (session.user.id !== targetUserId) {
      return NextResponse.json(
        { detail: "Forbidden: Access denied to user resource" },
        { status: 403 }
      )
    }
  }

  // Forward headers, inject internal API key
  const headers = new Headers(req.headers)
  headers.delete("host") // Let fetch set the correct host
  if (INTERNAL_API_KEY) {
    headers.set("X-Internal-API-Key", INTERNAL_API_KEY)
  }

  // Determine body using arrayBuffer to safely support both JSON and multipart FormData uploads
  let body: ArrayBuffer | undefined = undefined
  if (req.method !== "GET" && req.method !== "HEAD") {
    body = await req.arrayBuffer()
  }

  try {
    const fetchOptions: RequestInit & { duplex?: string } = {
      method: req.method,
      headers,
      body,
      // Pass along cache control, or bypass cache entirely for API calls
      cache: "no-store",
    }
    if (body) {
      fetchOptions.duplex = "half"
    }

    const response = await fetch(url, fetchOptions)

    // Read the response text (to safely handle empty responses or JSON)
    const text = await response.text()

    // Create new response
    const proxyResponse = new NextResponse(text, {
      status: response.status,
      statusText: response.statusText,
    })

    // Copy backend response headers to the proxy response
    response.headers.forEach((value, key) => {
      // Don't copy encoding headers as Next.js will handle compression
      if (
        !["content-encoding", "content-length", "transfer-encoding"].includes(key.toLowerCase())
      ) {
        proxyResponse.headers.set(key, value)
      }
    })

    return proxyResponse
  } catch (error) {
    console.error(`[API Proxy Error] to ${url}:`, error)
    return NextResponse.json({ detail: "Internal Server Error from Proxy" }, { status: 500 })
  }
}

export async function GET(req: NextRequest, props: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, props)
}

export async function POST(req: NextRequest, props: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, props)
}

export async function PUT(req: NextRequest, props: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, props)
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, props)
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, props)
}
