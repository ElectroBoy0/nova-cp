import { auth } from "@/lib/auth"
import { Sidebar } from "@/components/layout/sidebar"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Persistent sidebar */}
      <Sidebar userId={session?.user?.id} />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Page content scrolls here */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
