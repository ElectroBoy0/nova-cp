import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Topbar } from "@/components/layout/topbar"
import { SnippetsClient } from "./snippets-client"

export const metadata = {
  title: "Snippets | NovaCP",
  description: "Code Template Vault for Competitive Programming.",
}

export default async function SnippetsPage() {
  const session = await auth()
  
  if (!session?.user?.id) {
    redirect("/login")
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <Topbar 
        title="Snippets" 
        description="Your personal Code Template Vault." 
      />
      <div className="flex-1 overflow-hidden">
        <SnippetsClient userId={session.user.id} />
      </div>
    </div>
  )
}
