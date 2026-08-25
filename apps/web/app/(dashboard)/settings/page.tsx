import { auth } from "@/lib/auth"
import { Topbar } from "@/components/layout/topbar"
import { SettingsForm } from "./settings-form"
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
    <div className="flex flex-col min-h-screen">
      <Topbar title="Settings" description="Preferences & account control center" />

      <div className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Control Center</h2>
          <p className="text-xs text-muted-foreground">
            Configure your competitive programming profile, practice difficulty, focus topics, and system alerts.
          </p>
        </div>

        <div>
          <SettingsForm userId={session.user.id} />
        </div>
      </div>
    </div>
  )
}
