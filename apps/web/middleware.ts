import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

// Routes that require authentication
const protectedRoutes = [
  "/dashboard",
  "/analytics",
  "/contests",
  "/problems",
  "/battles",
  "/coach",
  "/community",
  "/profile",
  "/settings",
]

// Auth.js v5 beta: the `auth()` callback pattern is the canonical middleware approach.
// The return type is compatible at runtime; we cast to satisfy tsc.
// See: https://authjs.dev/getting-started/session-management/protecting
export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth

  const isProtectedRoute = protectedRoutes.some((route) => nextUrl.pathname.startsWith(route))

  // Redirect unauthenticated users to /login with callbackUrl
  if (isProtectedRoute && !isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl)
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect authenticated users away from the login page
  if (nextUrl.pathname === "/login" && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl))
  }

  return NextResponse.next()
}) as ReturnType<typeof auth>

export const config = {
  // Match all routes except static assets and auth API route
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|og-image.png|apple-touch-icon.png).*)",
  ],
}
