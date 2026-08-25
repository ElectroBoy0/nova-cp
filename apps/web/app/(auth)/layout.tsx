import { Zap } from "lucide-react"
import Link from "next/link"

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background">
      {/* Background gradient */}
      <div className="pointer-events-none absolute inset-0 hero-gradient" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-[0.03]" aria-hidden="true" />

      {/* Logo */}
      <Link
        href="/"
        className="absolute left-6 top-6 flex items-center gap-2 focus-visible:outline-none"
        aria-label="Back to home"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/30">
          <Zap className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        </div>
        <span className="text-sm font-semibold text-foreground">NovaCP</span>
      </Link>

      {children}
    </div>
  )
}
