import { Suspense } from "react"
import { auth } from "@/lib/auth"
import { Topbar } from "@/components/layout/topbar"
import { SettingsForm } from "./settings-form"
import { Skeleton } from "@/components/ui/skeleton"
import { redirect } from "next/navigation"

export const metadata = {
  title: "Settings | NovaCP",
  description: "Manage your NovaCP profile and linked accounts",
}

export default async function SettingsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/login")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Topbar title="Settings" description="Preferences & account control center" />

      <div className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-6 md:p-8">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Control Center</h2>
          <p className="text-xs text-muted-foreground">
            Configure your competitive programming profile, practice difficulty, focus topics, and
            system alerts.
          </p>
        </div>

        <div>
          <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
            <SettingsForm userId={session.user.id} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
