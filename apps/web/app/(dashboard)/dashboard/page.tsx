import { auth } from "@/lib/auth"
import { Topbar } from "@/components/layout/topbar"
import { DashboardClient } from "./dashboard-client"

export const metadata = {
  title: "Arena | NovaCP",
  description: "Your competitive programming command center",
}

export default async function DashboardPage() {
  const session = await auth()
  const firstName = session?.user?.name?.split(" ")[0] ?? "there"
  const userId = session?.user?.id ?? ""

  return (
    <div className="flex flex-col">
      <Topbar title="Arena" description="Your competitive programming command center" />
      <DashboardClient userId={userId} firstName={firstName} />
    </div>
  )
}
