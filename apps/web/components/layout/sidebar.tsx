"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import {
  LayoutDashboard,
  BarChart3,
  Trophy,
  BookOpen,
  ChevronLeft,
  Zap,
  Star,
  Settings,
  Lock,
  ListTodo,
  Bookmark,
  Code2,
  GitCompare,
  Bug,
  Terminal,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BugReportDialog } from "@/components/bug-report/bug-report-dialog"

// ---- Navigation Structure ----

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  badge?: string
  disabled?: boolean
  disabledReason?: string
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const navigation: NavGroup[] = [
  {
    title: "PRACTICE",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        label: "Solve Workspace",
        href: "/solve",
        icon: Terminal,
      },
      {
        label: "Problems",
        href: "/problems",
        icon: BookOpen,
      },
      {
        label: "Recommendations",
        href: "/recommendations",
        icon: Star,
      },
      {
        label: "Upsolve Queue",
        href: "/upsolve",
        icon: ListTodo,
      },
      {
        label: "Bookmarks",
        href: "/bookmarks",
        icon: Bookmark,
      },
      {
        label: "Snippets",
        href: "/snippets",
        icon: Code2,
      },
    ],
  },
  {
    title: "COMPETE",
    items: [
      {
        label: "Contests",
        href: "/contests",
        icon: Trophy,
      },
    ],
  },
  {
    title: "ANALYZE",
    items: [
      {
        label: "Analytics",
        href: "/analytics",
        icon: BarChart3,
      },
      {
        label: "Compare",
        href: "/compare",
        icon: GitCompare,
      },
    ],
  },
]

// ---- Sidebar Component ----

interface SidebarProps {
  className?: string
  userId?: string
  initialCollapsed?: boolean
}

export function Sidebar({ className, userId, initialCollapsed = false }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState<boolean>(initialCollapsed)
  const [mounted, setMounted] = useState(false)
  const [bugReportOpen, setBugReportOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const savedLocal = localStorage.getItem("novacp_sidebar_collapsed")
      if (savedLocal !== null) {
        const isCollapsed = savedLocal === "true"
        setCollapsed(isCollapsed)
        document.cookie = `novacp_sidebar_collapsed=${isCollapsed}; path=/; max-age=31536000; SameSite=Lax`
      }
    } catch {
      // ignore
    }
  }, [])

  const handleToggleCollapse = (nextState: boolean) => {
    setCollapsed(nextState)
    try {
      localStorage.setItem("novacp_sidebar_collapsed", String(nextState))
      document.cookie = `novacp_sidebar_collapsed=${nextState}; path=/; max-age=31536000; SameSite=Lax`
    } catch {
      // ignore
    }
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  return (
    <aside
      className={cn(
        "relative flex h-full flex-col border-r border-border bg-surface-1",
        mounted && "transition-all duration-200 ease-out",
        collapsed ? "w-[56px]" : "w-[220px]",
        className
      )}
      aria-label="Main navigation"
    >
      {/* ---- Logo ---- */}
      <div
        className={cn(
          "flex h-14 items-center border-b border-border px-4",
          collapsed ? "justify-center" : "justify-between"
        )}
      >
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 focus-visible:outline-none"
          aria-label="NovaCP Dashboard"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Zap className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          </div>
          {!collapsed && (
            <span className="text-sm font-semibold tracking-tight text-foreground">NovaCP</span>
          )}
        </Link>

        {!collapsed && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => handleToggleCollapse(true)}
            aria-label="Collapse sidebar"
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </div>

      {/* ---- Expand button when collapsed ---- */}
      {collapsed && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => handleToggleCollapse(false)}
          aria-label="Expand sidebar"
          className="absolute -right-3 top-[52px] z-10 h-6 w-6 rounded-full border border-border bg-surface-1 text-muted-foreground shadow-sm hover:text-foreground"
        >
          <ChevronLeft className="h-3 w-3 rotate-180" aria-hidden="true" />
        </Button>
      )}

      {/* ---- Navigation Groups ---- */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4" aria-label="Site sections">
        {navigation.map((group) => (
          <div key={group.title} className="mb-4">
            {/* Group Label */}
            {!collapsed && (
              <div className="mb-1 px-4 py-1">
                <span className="text-[10px] font-semibold tracking-widest text-muted-foreground/60">
                  {group.title}
                </span>
              </div>
            )}

            {/* Nav Items */}
            <ul role="list" className="space-y-0.5 px-2">
              {group.items.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)

                if (item.disabled) {
                  return (
                    <li key={item.href}>
                      <div
                        className={cn(
                          "flex cursor-not-allowed items-center gap-3 rounded-md px-2 py-1.5 opacity-40",
                          collapsed ? "justify-center" : ""
                        )}
                        title={item.disabledReason}
                        aria-disabled="true"
                      >
                        <Icon
                          className="h-4 w-4 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                        {!collapsed && (
                          <>
                            <span className="flex-1 truncate text-sm text-muted-foreground">
                              {item.label}
                            </span>
                            {item.badge && (
                              <span className="flex items-center gap-1">
                                <Lock
                                  className="h-2.5 w-2.5 text-muted-foreground"
                                  aria-hidden="true"
                                />
                                <Badge
                                  variant="outline"
                                  className="border-border/50 px-1.5 py-0 text-[9px] text-muted-foreground/60"
                                >
                                  {item.badge}
                                </Badge>
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </li>
                  )
                }

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-all duration-100",
                        collapsed ? "justify-center" : "",
                        active
                          ? "bg-accent text-foreground"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                      )}
                      aria-current={active ? "page" : undefined}
                    >
                      {/* Active indicator */}
                      {active && (
                        <div
                          className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary"
                          aria-hidden="true"
                        />
                      )}

                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-colors",
                          active
                            ? "text-primary"
                            : "text-muted-foreground group-hover:text-foreground"
                        )}
                        aria-hidden="true"
                      />

                      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* ---- Footer: Bug Report & Settings ---- */}
      <div className="space-y-0.5 border-t border-border p-2">
        <button
          type="button"
          onClick={() => setBugReportOpen(true)}
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
            collapsed ? "justify-center" : ""
          )}
          aria-label="Report Bug"
        >
          <Bug className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          {!collapsed && <span>Report Bug</span>}
        </button>

        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
            collapsed ? "justify-center" : ""
          )}
          aria-label="Settings"
        >
          <Settings className="h-4 w-4 shrink-0" aria-hidden="true" />
          {!collapsed && <span>Settings</span>}
        </Link>
      </div>

      {userId && (
        <BugReportDialog userId={userId} open={bugReportOpen} onOpenChange={setBugReportOpen} />
      )}
    </aside>
  )
}
