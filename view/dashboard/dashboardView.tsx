"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { apiFetch, type Device } from "@/lib/api"
import { showNotification } from "@/lib/showNotification"

function formatLastSeen(value: string | null) {
  if (!value) return "Never"
  return new Date(value).toLocaleString()
}

function StatusBadge({ online }: { online: boolean }) {
  return (
    <span
      className={
        online
          ? "inline-flex rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400"
          : "inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
      }
    >
      {online ? "Online" : "Offline"}
    </span>
  )
}

export default function DashboardView() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: devices = [], isLoading } = useQuery({
    queryKey: ["devices"],
    queryFn: () => apiFetch<Device[]>("/devices"),
  })

  const connectMutation = useMutation({
    mutationFn: (deviceId: string) =>
      apiFetch<{ id: string }>("/sessions", {
        method: "POST",
        body: JSON.stringify({ deviceId }),
      }),
    onSuccess: (session) => {
      showNotification({ type: "success", message: "Session started" })
      router.push(`/dashboard/session/${session.id}`)
    },
    onError: (err: Error) => {
      showNotification({ type: "error", message: err.message })
    },
  })

  const revokeMutation = useMutation({
    mutationFn: (deviceId: string) =>
      apiFetch(`/devices/${deviceId}/revoke`, { method: "POST" }),
    onSuccess: () => {
      showNotification({ type: "success", message: "Device access revoked" })
      void queryClient.invalidateQueries({ queryKey: ["devices"] })
    },
    onError: (err: Error) => {
      showNotification({ type: "error", message: err.message })
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Devices</h1>
          <p className="text-sm text-muted-foreground">
            All enrolled machines and their connection status
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/links">Generate enrollment link</Link>
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Hostname</th>
                <th className="px-4 py-3 font-medium">OS</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Last seen</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    Loading devices...
                  </td>
                </tr>
              )}
              {!isLoading && devices.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    No devices enrolled yet. Generate a link to onboard a
                    Windows PC.
                  </td>
                </tr>
              )}
              {devices.map((device) => {
                const online = device.isOnline ?? device.status === "ONLINE"
                return (
                  <tr key={device.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{device.name}</td>
                    <td className="px-4 py-3">{device.hostname}</td>
                    <td className="px-4 py-3">{device.os}</td>
                    <td className="px-4 py-3">
                      <StatusBadge online={online} />
                    </td>
                    <td className="px-4 py-3">
                      {formatLastSeen(device.lastSeenAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          disabled={!online || connectMutation.isPending}
                          onClick={() => connectMutation.mutate(device.id)}
                        >
                          Connect
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/dashboard/devices/${device.id}`}>
                            Details
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => revokeMutation.mutate(device.id)}
                        >
                          Revoke
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
