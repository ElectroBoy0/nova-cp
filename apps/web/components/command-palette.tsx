"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useDebounce } from "use-debounce"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { 
  Settings,
  LayoutDashboard,
  Trophy,
  BarChart3,
  Lightbulb,
  RefreshCw,
  LogOut,
  BrainCircuit,
  Code2,
  Bookmark,
  ListTodo,
  BookOpen,
  Terminal,
} from "lucide-react"
import { useProblems } from "@/hooks/use-problems"
import { useSnippets } from "@/hooks/use-snippets"
import { useContests } from "@/hooks/use-contests"
import { useLinkHandle } from "@/lib/users"
import { signOut } from "next-auth/react"

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  shortcut?: string
  keywords?: string[]
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, keywords: ["dashboard", "home", "stats", "overview"] },
  { label: "Solve Workspace", href: "/solve", icon: Terminal, keywords: ["solve", "workspace", "terminal", "editor", "ide", "code", "run", "monaco", "practice"] },
  { label: "Problems", href: "/problems", icon: BookOpen, keywords: ["problems", "explorer", "practice", "archive"] },
  { label: "Recommendations", href: "/recommendations", icon: Lightbulb, keywords: ["recommendations", "ai", "coach", "suggested"] },
  { label: "Upsolve Queue", href: "/upsolve", icon: ListTodo, keywords: ["upsolve", "queue", "failed", "contests", "review"] },
  { label: "Bookmarks", href: "/bookmarks", icon: Bookmark, keywords: ["bookmarks", "saved", "favorite"] },
  { label: "Snippets", href: "/snippets", icon: Code2, keywords: ["snippets", "templates", "algorithms", "boilerplate"] },
  { label: "Contest Center", href: "/contests", icon: Trophy, keywords: ["contests", "live", "upcoming", "rounds"] },
  { label: "Analytics", href: "/analytics", icon: BarChart3, keywords: ["analytics", "stats", "rating", "graph", "performance"] },
  { label: "Settings", href: "/settings", icon: Settings, shortcut: "⌘S", keywords: ["settings", "profile", "preferences", "account", "control center"] },
]

import type { Session } from "next-auth"
import type { Problem } from "@/types/problems"
import type { Snippet } from "@/types/snippets"
import type { Contest } from "@/types/contests"

type ExtendedSession = Session & { user?: { id?: string; cf_handle?: { handle?: string } } }

export function CommandPalette({ session }: { session: ExtendedSession | null }) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [debouncedSearch] = useDebounce(search, 300)
  
  const router = useRouter()
  const linkMutation = useLinkHandle()
  
  const userId = session?.user?.id
  const hasLinkedHandle = !!session?.user?.cf_handle

  // Problem Search query
  const { data: problemsData, isLoading: isLoadingProblems } = useProblems({
    search: debouncedSearch,
    limit: 3
  })
  const problems = problemsData?.items || []

  // Snippet Search query
  const { data: snippetsData, isLoading: isLoadingSnippets } = useSnippets(userId, {
    search: debouncedSearch,
    limit: 3
  })
  const snippets = snippetsData?.items || []

  // Contest Search query
  const { data: contestsData } = useContests({
    status: debouncedSearch ? undefined : "upcoming",
  })
  
  // Client-side filtering for contests since the API doesn't support full text search on contests yet
  const contests = React.useMemo(() => {
    const list = contestsData?.contests || []
    if (!debouncedSearch) return list.slice(0, 3)
    const lower = debouncedSearch.toLowerCase()
    return list.filter(c => c.contest_name.toLowerCase().includes(lower)).slice(0, 3)
  }, [contestsData, debouncedSearch])

  // Filter static navigation items based on search input
  const filteredNavItems = React.useMemo(() => {
    if (!search.trim()) return NAV_ITEMS
    const lower = search.toLowerCase().trim()
    return NAV_ITEMS.filter(
      (item) =>
        item.label.toLowerCase().includes(lower) ||
        item.keywords?.some((k) => k.toLowerCase().includes(lower))
    )
  }, [search])

  const handleSync = React.useCallback(() => {
    const handle = session?.user?.cf_handle?.handle
    if (userId && handle) {
      linkMutation.mutate({ userId, handle })
    }
  }, [userId, session, linkMutation])

  const handleLogout = React.useCallback(() => {
    signOut({ callbackUrl: "/" })
  }, [])

  // Keyboard Shortcuts Registration
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Toggle Palette
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
        return
      }

      // ⌘S -> Settings
      if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        router.push("/settings")
        setOpen(false)
        return
      }

      // ⌘D -> Sync Data
      if (e.key === "d" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        handleSync()
        setOpen(false)
        return
      }

      // ⇧⌘Q -> Log out
      if (e.key === "q" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault()
        handleLogout()
        setOpen(false)
        return
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [router, handleSync, handleLogout])

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false)
    command()
  }, [])

  return (
    <CommandDialog 
      open={open} 
      onOpenChange={setOpen}
      commandProps={{ shouldFilter: false }} // We handle filtering manually so async results aren't hidden
    >
      <CommandInput 
        placeholder="Search for problems, snippets, or jump to a section..." 
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        {!isLoadingProblems && !isLoadingSnippets && 
         filteredNavItems.length === 0 && 
         problems.length === 0 && 
         snippets.length === 0 && 
         contests.length === 0 && (
          <CommandEmpty>No results found for "{search}".</CommandEmpty>
        )}
        
        {/* Navigation Group */}
        {filteredNavItems.length > 0 && (
          <CommandGroup heading="Navigation">
            {filteredNavItems.map((item) => {
              const Icon = item.icon
              return (
                <CommandItem 
                  key={item.href} 
                  value={item.label}
                  onSelect={() => runCommand(() => router.push(item.href))}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  <span>{item.label}</span>
                  {item.shortcut && <CommandShortcut>{item.shortcut}</CommandShortcut>}
                </CommandItem>
              )
            })}
          </CommandGroup>
        )}
        
        {filteredNavItems.length > 0 && <CommandSeparator />}

        {/* Snippets Group */}
        {(debouncedSearch.length > 0 || snippets.length > 0) && (
          <CommandGroup heading="Snippets">
            {isLoadingSnippets ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                <RefreshCw className="mx-auto h-4 w-4 animate-spin mb-2" />
                Searching snippets...
              </div>
            ) : snippets.length > 0 ? (
              snippets.map((snippet: Snippet, idx: number) => (
                <CommandItem 
                  key={`snippet-${snippet.id || idx}-${idx}`}
                  value={snippet.title}
                  onSelect={() => runCommand(() => router.push("/snippets"))}
                >
                  <Code2 className="mr-2 h-4 w-4 text-primary" />
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{snippet.title}</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                      {snippet.language} • {snippet.category.replace('_', ' ')}
                    </span>
                  </div>
                </CommandItem>
              ))
            ) : null}
          </CommandGroup>
        )}

        {/* Contests Group */}
        {(debouncedSearch.length > 0 || contests.length > 0) && (
          <CommandGroup heading="Contests">
            {contests.length > 0 ? (
              contests.map((contest: Contest, idx: number) => (
                <CommandItem 
                  key={`contest-${contest.platform || 'c'}-${contest.id || idx}-${idx}`}
                  value={contest.contest_name}
                  onSelect={() => runCommand(() => window.open(contest.url || `https://codeforces.com/contests/${contest.platform_contest_id}`, "_blank"))}
                >
                  <Trophy className="mr-2 h-4 w-4 text-primary" />
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{contest.contest_name}</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                      {contest.platform}
                    </span>
                  </div>
                </CommandItem>
              ))
            ) : null}
          </CommandGroup>
        )}

        {/* Problems Group */}
        {(debouncedSearch.length > 0 || problems.length > 0) && (
          <CommandGroup heading="Problems">
            {isLoadingProblems ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                <RefreshCw className="mx-auto h-4 w-4 animate-spin mb-2" />
                Searching Codeforces...
              </div>
            ) : problems.length > 0 ? (
              problems.map((problem: Problem, idx: number) => (
                <CommandItem 
                  key={`problem-${problem.platform || 'p'}-${problem.id || idx}-${idx}`}
                  value={problem.name}
                  onSelect={() => runCommand(() => window.open(problem.url, "_blank"))}
                >
                  <BrainCircuit className="mr-2 h-4 w-4 text-primary" />
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{problem.name}</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                      {problem.platform} • {problem.rating || "Unrated"} • {problem.tags?.slice(0, 2).join(", ")}
                    </span>
                  </div>
                </CommandItem>
              ))
            ) : null}
          </CommandGroup>
        )}

        {/* Actions Group (Only if logged in and search is empty) */}
        {userId && !search && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Actions">
              {hasLinkedHandle && (
                <CommandItem value="Sync Codeforces Data" onSelect={() => runCommand(handleSync)}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  <span>Sync Codeforces Data</span>
                  <CommandShortcut>⌘D</CommandShortcut>
                </CommandItem>
              )}
              <CommandItem value="Log Out" onSelect={() => runCommand(handleLogout)}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log Out</span>
                <CommandShortcut>⇧⌘Q</CommandShortcut>
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
