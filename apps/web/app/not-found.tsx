import Link from "next/link"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Terminal, BookOpen } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 selection:bg-purple-500/30">
      {/* Background glow effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-purple-600/15 blur-[120px] rounded-full" />
        <div className="absolute bottom-10 left-1/3 w-[400px] h-[250px] bg-blue-600/10 blur-[100px] rounded-full" />
      </div>

      <div className="max-w-md w-full text-center space-y-6">
        {/* Glowing Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-purple-500/10 border border-purple-500/30 text-purple-400">
          <span>Error 404</span>
          <span className="w-1 h-1 rounded-full bg-purple-400" />
          <span>Coordinate Not Found</span>
        </div>

        {/* Big Glitch / Glow 404 */}
        <h1 className="text-7xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/40 font-mono">
          404
        </h1>

        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Page does not exist
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The problem, contest, or coordinate you requested could not be located in the NovaCP universe.
          </p>
        </div>

        {/* Action shortcuts */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button asChild variant="default" className="w-full sm:w-auto gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-purple-900/20">
            <Link href="/dashboard">
              <LayoutDashboard className="h-4 w-4" />
              <span>Go to Dashboard</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto gap-2 border-border hover:bg-surface-2">
            <Link href="/solve">
              <Terminal className="h-4 w-4 text-purple-400" />
              <span>Solve Workspace</span>
            </Link>
          </Button>
        </div>

        {/* Quick Links Footer */}
        <div className="pt-6 border-t border-border/40 flex items-center justify-center gap-6 text-xs text-muted-foreground">
          <Link href="/problems" className="hover:text-primary transition-colors flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            <span>Problem Explorer</span>
          </Link>
          <span className="text-border">•</span>
          <span className="flex items-center gap-1 text-muted-foreground/80 font-mono text-[11px]">
            <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted text-[10px]">⌘K</kbd>
            <span>Search anything</span>
          </span>
        </div>
      </div>
    </div>
  )
}
