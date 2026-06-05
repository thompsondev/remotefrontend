"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { apiFetch, getAdminToken } from "@/lib/api"
import { DashboardShell } from "@/components/dashboard/DashboardShell"

export function DashboardGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const token = typeof window !== "undefined" ? getAdminToken() : null

  const { isLoading, isError } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => apiFetch<{ id: string; email: string }>("/auth/me"),
    enabled: !!token,
    retry: false,
  })

  useEffect(() => {
    if (!token) {
      router.replace("/auth/signin")
    }
  }, [token, router])

  useEffect(() => {
    if (isError) {
      router.replace("/auth/signin")
    }
  }, [isError, router])

  if (!token || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading dashboard...
      </div>
    )
  }

  return <DashboardShell>{children}</DashboardShell>
}
