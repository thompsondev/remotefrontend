import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <div className="text-center">
        <h1 className="text-3xl font-semibold">Remote Access</h1>
        <p className="mt-2 max-w-md text-muted-foreground">
          Admin dashboard for managing enrolled devices and remote sessions.
        </p>
      </div>
      <Button asChild size="lg">
        <Link href="/auth/signin">Admin sign in</Link>
      </Button>
    </div>
  )
}
