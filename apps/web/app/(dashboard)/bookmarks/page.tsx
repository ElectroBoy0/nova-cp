import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Topbar } from "@/components/layout/topbar"
import { BookmarksClient } from "./bookmarks-client"

export const metadata = {
  title: "Bookmarks & Lists | NovaCP",
  description: "Organize and review your favorite problems.",
}

export default async function BookmarksPage() {
  const session = await auth()
  
  if (!session?.user?.id) {
    redirect("/login")
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <Topbar 
        title="Bookmarks & Lists" 
        description="Your personal collections of hand-picked problems." 
      />
      <div className="flex-1 overflow-hidden">
        <BookmarksClient userId={session.user.id} />
      </div>
    </div>
  )
}
