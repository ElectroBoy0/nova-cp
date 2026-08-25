import { Suspense } from "react"
import { auth } from "@/lib/auth"
import { WorkspaceClient } from "@/components/workspace/workspace-client"
import { Loader2 } from "lucide-react"

export const metadata = {
  title: "Solve Now · NovaCP Workspace",
  description: "VS Code style competitive programming IDE with sandboxed execution.",
}

export default async function SolvePage({
  searchParams,
}: {
  searchParams: Promise<{ problemId?: string }>
}) {
  const session = await auth()
  const resolvedParams = await searchParams

  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center bg-background text-muted-foreground gap-2 text-xs">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span>Initializing NovaCP Workspace...</span>
        </div>
      }
    >
      <WorkspaceClient
        userId={session?.user?.id}
        initialProblemId={resolvedParams.problemId}
      />
    </Suspense>
  )
}
