import { auth } from "@/lib/auth"
import { ProblemsClient } from "./problems-client"

export const metadata = {
  title: "Problem Explorer | NovaCP",
  description: "Browse and filter competitive programming problems.",
}

export default async function ProblemsPage() {
  const session = await auth()
  const userId = session?.user?.id

  return <ProblemsClient userId={userId} />
}
