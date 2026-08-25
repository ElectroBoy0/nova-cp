import NextAuth, { type NextAuthConfig, type Session } from "next-auth"
import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"
import type { JWT } from "next-auth/jwt"

const googleId = process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID || ""
const googleSecret = process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET || ""

const config: NextAuthConfig = {
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID || process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET || process.env.GITHUB_CLIENT_SECRET,
    }),
    Google({
      clientId: googleId,
      clientSecret: googleSecret,
    }),
  ],

  // Custom pages
  pages: {
    signIn: "/login",
    error: "/login",
  },

  // JWT session strategy — no database adapter needed for sessions
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  callbacks: {
    async jwt({ token, user, account }: { token: JWT; user?: { id?: string | null, email?: string | null, name?: string | null, image?: string | null }; account?: { provider?: string; providerAccountId?: string } | null }): Promise<JWT> {
      if (user?.id) {
        token.id = user.id
      }
      if (account) {
        token.provider = account.provider
        token.providerAccountId = account.providerAccountId
      }
      
      // On initial sign-in (when user and account are present), sync the user to the backend
      if (user && account && user.email) {
        try {
          const API_BASE = process.env.API_URL ?? "http://localhost:8000"
          const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY ?? ""
          
          const res = await fetch(`${API_BASE}/api/v1/users/sync`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Internal-API-Key": INTERNAL_API_KEY
            },
            body: JSON.stringify({
              user_id: user.id,
              email: user.email,
              name: user.name,
              image: user.image,
              provider: account.provider,
            })
          })
          
          if (res.ok) {
            const data = await res.json()
            // IMPORTANT: Replace the OAuth provider ID with our internal PostgreSQL UUID
            if (data && data.id) {
              token.id = data.id
            }
          } else {
            console.error("[Auth] Backend sync returned non-OK status:", res.status)
          }
        } catch (e) {
          console.error("[Auth] Failed to sync user to backend", e)
        }
      }
      return token
    },

    async session({ session, token }: { session: Session; token: JWT }): Promise<Session> {
      if (token.id && session.user) {
        session.user.id = token.id as string
      }
      return session
    },
  },

  events: {
    async signIn({ user, account, isNewUser }: { user: { email?: string | null }; account?: { provider?: string } | null; isNewUser?: boolean }) {
      if (process.env.NODE_ENV === "development") {
        console.warn(`[Auth] Sign in: ${user.email} via ${account?.provider} (new: ${isNewUser})`)
      }
    },
  },

  debug: process.env.NODE_ENV === "development",
}

const nextAuth = NextAuth(config)

export const handlers: typeof nextAuth.handlers = nextAuth.handlers
export const signIn: typeof nextAuth.signIn = nextAuth.signIn
export const signOut: typeof nextAuth.signOut = nextAuth.signOut
export const auth: typeof nextAuth.auth = nextAuth.auth
