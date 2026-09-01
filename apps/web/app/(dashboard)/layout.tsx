import { auth } from "@/lib/auth"
import { cookies } from "next/headers"
import { Sidebar } from "@/components/layout/sidebar"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const cookieStore = await cookies()
  const initialCollapsed = cookieStore.get("novacp_sidebar_collapsed")?.value === "true"

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Persistent sidebar with SSR cookie state */}
      <Sidebar userId={session?.user?.id} initialCollapsed={initialCollapsed} />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Page content scrolls here */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
