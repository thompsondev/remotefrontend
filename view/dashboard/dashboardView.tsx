"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  apiFetch,
  formatDeviceLocation,
  isDeviceOnline,
  type Device,
  type DeviceType,
} from "@/lib/api"
import { showNotification } from "@/lib/showNotification"

function formatLastSeen(value: string | null) {
  if (!value) return "Never"
  return new Date(value).toLocaleString()
}

function DeviceTypeBadge({ type }: { type?: DeviceType }) {
  const isBrowser = type === "BROWSER"
  return (
    <span
      className={
        isBrowser
          ? "inline-flex rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-medium text-violet-600 dark:text-violet-400"
          : "inline-flex rounded-full bg-sky-500/15 px-2 py-0.5 text-xs font-medium text-sky-700 dark:text-sky-400"
      }
    >
      {isBrowser ? "Instant" : "Agent"}
    </span>
  )
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
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
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
            Everyone who connects via your enrollment links appears here
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/links">Generate enrollment link</Link>
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="border-b bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Browser</th>
                <th className="px-4 py-3 font-medium">OS</th>
                <th className="px-4 py-3 font-medium">IP address</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Last seen</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    Loading devices...
                  </td>
                </tr>
              )}
              {!isLoading && devices.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    No devices yet. Generate an instant connect link to get
                    started.
                  </td>
                </tr>
              )}
              {devices.map((device) => {
                const online = isDeviceOnline(device)
                return (
                  <tr key={device.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{device.name}</td>
                    <td className="px-4 py-3">
                      <DeviceTypeBadge type={device.deviceType} />
                    </td>
                    <td className="px-4 py-3">
                      {device.browser || device.hostname || "—"}
                    </td>
                    <td className="px-4 py-3">{device.os}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {device.ipAddress || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {formatDeviceLocation(device)}
                    </td>
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
