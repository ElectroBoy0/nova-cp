import { auth, signOut } from "@/lib/auth"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { LogOut, Bell } from "lucide-react"
import { TopbarSearch } from "./topbar-search"
import { TopbarStreak } from "./topbar-streak"
import { NotificationCenter } from "./notification-center"
import { TopbarBugButton } from "./topbar-bug-button"

interface TopbarProps {
  title: string
  description?: string
}

export async function Topbar({ title, description }: TopbarProps) {
  const session = await auth()

  const initials = session?.user?.name
    ? session.user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?"

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface-1/50 px-6 backdrop-blur-sm">
      {/* Page Title */}
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-sm font-semibold text-foreground">{title}</h1>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>

      {/* Center/Search */}
      <TopbarSearch />

      {/* Right controls */}
      <div className="flex items-center gap-2">
        {session?.user?.id && <TopbarStreak userId={session.user.id} />}
        
        {/* In-App Notification Center */}
        {session?.user?.id && <NotificationCenter userId={session.user.id} />}

        {/* Bug Reporting Button */}
        {session?.user?.id && <TopbarBugButton userId={session.user.id} />}

        {/* User Avatar + Sign Out */}
        {session?.user && (
          <div className="flex items-center gap-3 border-l border-border pl-3">
            <div className="hidden flex-col items-end sm:flex">
              <span className="text-xs font-medium text-foreground">{session.user.name}</span>
              <span className="text-[10px] text-muted-foreground">{session.user.email}</span>
            </div>
            <Avatar className="h-8 w-8 ring-1 ring-border">
              <AvatarImage
                src={session.user.image ?? undefined}
                alt={session.user.name ?? "User avatar"}
                referrerPolicy="no-referrer"
              />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <form
              action={async () => {
                "use server"
                await signOut({ redirectTo: "/" })
              }}
            >
              <Button
                type="submit"
                variant="ghost"
                size="icon-sm"
                aria-label="Sign out"
                className="text-muted-foreground hover:text-destructive"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </form>
          </div>
        )}
      </div>
    </header>
  )
}
