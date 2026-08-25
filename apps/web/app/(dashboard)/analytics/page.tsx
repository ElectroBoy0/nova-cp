import { auth } from "@/lib/auth"
import { Topbar } from "@/components/layout/topbar"
import { redirect } from "next/navigation"
import { AnalyticsClient } from "./analytics-client"

export const metadata = {
  title: "Analytics | NovaCP",
  description: "Performance insights and topic mastery",
}

export default async function AnalyticsPage() {
  const session = await auth()
  
  if (!session?.user?.id) {
    redirect("/login")
  }

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Analytics" description="Performance insights and topic mastery" />
      <AnalyticsClient userId={session.user.id} />
    </div>
  )
}
