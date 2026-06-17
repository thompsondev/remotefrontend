import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#ececec] p-6">
      <div className="w-full max-w-md overflow-hidden rounded-md border border-[#c8c8c8] bg-white shadow-lg">
        <div className="bg-[#0078d4] px-6 py-5 text-white">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-white/80 uppercase">
            Software Update
          </p>
          <h1 className="mt-1 text-2xl font-semibold">Update Center</h1>
        </div>
        <div className="space-y-4 p-6 text-center">
          <p className="text-sm text-[#555]">
            Manage software updates and system maintenance across your
            organization.
          </p>
          <Button
            asChild
            size="lg"
            className="w-full bg-[#0078d4] hover:bg-[#006cbe]"
          >
            <Link href="/auth/signin">Administrator sign in</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
