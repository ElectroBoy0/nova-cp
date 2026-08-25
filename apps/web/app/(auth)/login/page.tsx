import type { Metadata } from "next"
import { signIn } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Github, ArrowLeft } from "lucide-react"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to NovaCP to access your personalized competitive programming dashboard.",
}

// Google icon since lucide doesn't have it
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

export default function LoginPage({
  searchParams: _searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>
}) {
  return (
    <div className="w-full max-w-sm animate-fade-up px-4">
      {/* Card */}
      <div className="rounded-2xl border border-border bg-card p-8 shadow-2xl shadow-black/40">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-xl font-semibold text-foreground">Welcome to NovaCP</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to access your personalized dashboard and analytics.
          </p>
        </div>

        {/* OAuth Buttons */}
        <div className="space-y-3">
          {/* GitHub */}
          <form
            action={async () => {
              "use server"
              await signIn("github", { redirectTo: "/dashboard" })
            }}
          >
            <Button
              type="submit"
              variant="outline"
              className="w-full gap-3 border-border bg-surface-2 hover:bg-accent"
              size="lg"
            >
              <Github className="h-4 w-4" aria-hidden="true" />
              Continue with GitHub
            </Button>
          </form>

          {/* Google */}
          <form
            action={async () => {
              "use server"
              await signIn("google", { redirectTo: "/dashboard" })
            }}
          >
            <Button
              type="submit"
              variant="outline"
              className="w-full gap-3 border-border bg-surface-2 hover:bg-accent"
              size="lg"
            >
              <GoogleIcon className="h-4 w-4" aria-hidden="true" />
              Continue with Google
            </Button>
          </form>
        </div>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">free forever</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Fine print */}
        <p className="text-center text-xs text-muted-foreground">
          By signing in, you agree to our{" "}
          <Link href="/terms" className="text-primary hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </div>

      {/* Back link */}
      <div className="mt-6 text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to home
        </Link>
      </div>
    </div>
  )
}
