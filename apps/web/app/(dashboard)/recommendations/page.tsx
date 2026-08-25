import { RecommendationsClient } from "./recommendations-client"
import type { Metadata } from "next"
import { auth } from "@/lib/auth"

export const metadata: Metadata = {
  title: "Recommendations | NovaCP",
  description: "Personalized problem recommendations based on your skill and weak areas.",
}

export default async function RecommendationsPage() {
  const session = await auth()
  const userId = session?.user?.id ?? ""

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Recommendations Hub</h2>
        <p className="text-muted-foreground">
          Targeted practice tailored to your current skill level and recent performance.
        </p>
      </div>

      <RecommendationsClient userId={userId} />
    </div>
  )
}
