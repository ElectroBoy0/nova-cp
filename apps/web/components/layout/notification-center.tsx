"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Bell,
  Check,
  CheckCheck,
  Trophy,
  Target,
  RefreshCw,
  Flame,
  Info,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  useUserNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/lib/users"
import type { InAppNotification } from "@/types/users"
import { cn } from "@/lib/utils"

export function NotificationCenter({ userId }: { userId: string }) {
  const { data, isLoading } = useUserNotifications(userId)
  const markReadMutation = useMarkNotificationRead()
  const markAllReadMutation = useMarkAllNotificationsRead()
  const [isOpen, setIsOpen] = useState(false)

  const notifications = data?.items || []
  const unreadCount = data?.unread_count || 0

  const handleMarkRead = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    markReadMutation.mutate({ userId, notificationId: id })
  }

  const handleMarkAllRead = () => {
    markAllReadMutation.mutate({ userId })
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "daily_mission":
        return <Target className="h-4 w-4 text-amber-400 shrink-0" />
      case "contest_reminder":
        return <Trophy className="h-4 w-4 text-violet-400 shrink-0" />
      case "sync_status":
        return <RefreshCw className="h-4 w-4 text-emerald-400 shrink-0" />
      case "streak_saver":
        return <Flame className="h-4 w-4 text-rose-400 shrink-0" />
      default:
        return <Info className="h-4 w-4 text-sky-400 shrink-0" />
    }
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className="relative text-muted-foreground hover:text-foreground"
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          {unreadCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground animate-in zoom-in"
              aria-label={`${unreadCount} unread notifications`}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 sm:w-96 p-0 shadow-2xl border-border bg-popover">
        <div className="flex items-center justify-between p-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">Notifications</span>
            {unreadCount > 0 && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                {unreadCount} unread
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={markAllReadMutation.isPending}
              className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-2"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[360px]">
          {isLoading ? (
            <div className="p-6 text-center text-xs text-muted-foreground">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p className="text-xs font-medium">No notifications yet</p>
              <p className="text-[11px] opacity-70 mt-0.5">Alerts for missions, contests, and sync will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {notifications.map((notif, idx) => (
                <div
                  key={`${notif.id || idx}-${idx}`}
                  className={cn(
                    "p-3.5 transition-colors flex items-start gap-3 text-left relative group",
                    !notif.is_read ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-accent/40"
                  )}
                >
                  <div className="mt-0.5">{getNotificationIcon(notif.type)}</div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className={cn("text-xs leading-snug truncate", !notif.is_read ? "font-semibold text-foreground" : "font-medium text-muted-foreground")}>
                        {notif.title}
                      </h4>
                      {!notif.is_read && (
                        <button
                          onClick={(e) => handleMarkRead(e, notif.id)}
                          title="Mark as read"
                          className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                      {notif.message}
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-muted-foreground/70 font-mono">
                        {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {notif.link && (
                        <Link
                          href={notif.link}
                          onClick={() => {
                            if (!notif.is_read) {
                              markReadMutation.mutate({ userId, notificationId: notif.id })
                            }
                            setIsOpen(false)
                          }}
                          className="text-[11px] text-primary hover:underline inline-flex items-center gap-1 font-medium"
                        >
                          View <ExternalLink className="h-2.5 w-2.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        <DropdownMenuSeparator className="m-0" />
        <div className="p-2 text-center bg-surface-1/40">
          <Link
            href="/settings"
            onClick={() => setIsOpen(false)}
            className="text-[11px] text-muted-foreground hover:text-foreground font-medium transition-colors"
          >
            Customize alert preferences →
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
