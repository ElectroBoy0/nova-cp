import Link from "next/link"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Terminal, BookOpen } from "lucide-react"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-foreground selection:bg-purple-500/30">
      {/* Background glow effects */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[350px] w-[600px] -translate-x-1/2 rounded-full bg-purple-600/15 blur-[120px]" />
        <div className="absolute bottom-10 left-1/3 h-[250px] w-[400px] rounded-full bg-blue-600/10 blur-[100px]" />
      </div>

      <div className="w-full max-w-md space-y-6 text-center">
        {/* Glowing Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 font-mono text-xs font-medium text-purple-400">
          <span>Error 404</span>
          <span className="h-1 w-1 rounded-full bg-purple-400" />
          <span>Coordinate Not Found</span>
        </div>

        {/* Big Glitch / Glow 404 */}
        <h1 className="bg-gradient-to-b from-foreground to-foreground/40 bg-clip-text font-mono text-7xl font-extrabold tracking-tight text-transparent">
          404
        </h1>

        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Page does not exist</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            The problem, contest, or coordinate you requested could not be located in the NovaCP
            universe.
          </p>
        </div>

        {/* Action shortcuts */}
        <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
          <Button
            asChild
            variant="default"
            className="w-full gap-2 bg-primary text-primary-foreground shadow-lg shadow-purple-900/20 hover:bg-primary/90 sm:w-auto"
          >
            <Link href="/dashboard">
              <LayoutDashboard className="h-4 w-4" />
              <span>Go to Dashboard</span>
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full gap-2 border-border hover:bg-surface-2 sm:w-auto"
          >
            <Link href="/solve">
              <Terminal className="h-4 w-4 text-purple-400" />
              <span>Solve Workspace</span>
            </Link>
          </Button>
        </div>

        {/* Quick Links Footer */}
        <div className="flex items-center justify-center gap-6 border-t border-border/40 pt-6 text-xs text-muted-foreground">
          <Link
            href="/problems"
            className="flex items-center gap-1.5 transition-colors hover:text-primary"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Problem Explorer</span>
          </Link>
          <span className="text-border">•</span>
          <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground/80">
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px]">
              ⌘K
            </kbd>
            <span>Search anything</span>
          </span>
        </div>
      </div>
    </div>
  )
}
