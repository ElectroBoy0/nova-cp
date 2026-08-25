import type { Metadata } from "next"
import { Topbar } from "@/components/layout/topbar"
import { ContestCenter } from "@/components/contests/contest-center"

export const metadata: Metadata = {
  title: "Contest Center",
  description:
    "All upcoming and live competitive programming contests from Codeforces, CodeChef, and AtCoder in one place.",
}

export default function ContestsPage() {
  return (
    <div className="flex flex-col">
      <Topbar
        title="Contest Center"
        description="Codeforces · CodeChef · AtCoder — all in one place"
      />
      <div className="flex-1 p-4 sm:p-6">
        <ContestCenter />
      </div>
    </div>
  )
}
