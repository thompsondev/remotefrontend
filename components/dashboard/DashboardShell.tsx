"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { apiFetch, clearAdminToken } from "@/lib/api"
import { showNotification } from "@/lib/showNotification"

const nav = [
  { href: "/dashboard", label: "Systems" },
  { href: "/dashboard/links", label: "Update Links" },
  { href: "/dashboard/sessions", label: "Maintenance Log" },
]

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  async function logout() {
    try {
      await apiFetch("/auth/logout", { method: "POST" })
    } catch {
      /* ignore */
    }
    clearAdminToken()
    showNotification({ type: "info", message: "Signed out" })
    router.push("/auth/signin")
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="flex w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="border-b border-sidebar-border px-5 py-6">
          <p className="text-lg font-semibold">Update Center</p>
          <p className="text-xs text-muted-foreground">
            Software update management
          </p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm transition-colors",
                pathname === item.href
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <Button variant="outline" className="w-full" onClick={logout}>
            Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6 md:p-8">{children}</main>
    </div>
  )
}
