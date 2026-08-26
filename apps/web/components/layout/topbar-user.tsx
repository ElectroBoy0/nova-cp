"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useUserProfile } from "@/lib/users"

interface TopbarUserProps {
  userId: string
  initialName?: string | null
  initialEmail?: string | null
  initialImage?: string | null
}

export function TopbarUser({ userId, initialName, initialEmail, initialImage }: TopbarUserProps) {
  const { data: user } = useUserProfile(userId)

  const name = user?.name ?? initialName ?? "User"
  const email = user?.email ?? initialEmail ?? ""
  const image = user?.image ?? initialImage ?? undefined

  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "CP"

  return (
    <>
      <div className="hidden flex-col items-end sm:flex">
        <span className="text-xs font-medium text-foreground">{name}</span>
        <span className="text-[10px] text-muted-foreground">{email}</span>
      </div>
      <Avatar className="h-8 w-8 ring-1 ring-border">
        <AvatarImage src={image} alt={name} referrerPolicy="no-referrer" />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
    </>
  )
}
