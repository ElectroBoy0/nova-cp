import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Topbar } from "@/components/layout/topbar"
import { UpsolveClient } from "./upsolve-client"

export const metadata = {
  title: "Upsolve Queue | NovaCP",
  description: "Track and conquer the problems you missed in contests.",
}

export default async function UpsolvePage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/login")
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <Topbar
        title="Upsolve Queue"
        description="Problems you missed in recent contests, neatly queued."
      />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        <div className="mx-auto max-w-[1200px]">
          <UpsolveClient userId={session.user.id} />
        </div>
      </div>
    </div>
  )
}
