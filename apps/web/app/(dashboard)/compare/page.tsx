import { auth } from "@/lib/auth"
import { Topbar } from "@/components/layout/topbar"
import { redirect } from "next/navigation"
import { CompareClient } from "./compare-client"

export const metadata = {
  title: "Compare | NovaCP",
  description: "Head-to-head Codeforces performance comparison",
}

export default async function ComparePage() {
  const session = await auth()
  
  if (!session?.user?.id) {
    redirect("/login")
  }

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Compare" description="Head-to-head Codeforces performance comparison" />
      <CompareClient userId={session.user.id} />
    </div>
  )
}
