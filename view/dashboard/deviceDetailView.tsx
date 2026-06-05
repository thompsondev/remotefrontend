"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { apiFetch, type Device } from "@/lib/api"

type DeviceDetail = Device & {
  sessions: Array<{
    id: string
    status: string
    startedAt: string | null
    endedAt: string | null
    createdAt: string
  }>
}

export default function DeviceDetailView() {
  const params = useParams()
  const id = params.id as string

  const { data: device, isLoading } = useQuery({
    queryKey: ["device", id],
    queryFn: () => apiFetch<DeviceDetail>(`/devices/${id}`),
  })

  if (isLoading) {
    return <p className="text-muted-foreground">Loading device...</p>
  }

  if (!device) {
    return <p className="text-muted-foreground">Device not found</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard">Back</Link>
        </Button>
        <h1 className="text-2xl font-semibold">{device.name}</h1>
      </div>

      <Card className="grid gap-4 p-6 md:grid-cols-2">
        <div>
          <p className="text-xs text-muted-foreground">Hostname</p>
          <p className="font-medium">{device.hostname}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">OS</p>
          <p className="font-medium">{device.os}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">IP address</p>
          <p className="font-medium">{device.ipAddress || "—"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Last seen</p>
          <p className="font-medium">
            {device.lastSeenAt
              ? new Date(device.lastSeenAt).toLocaleString()
              : "Never"}
          </p>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 font-semibold">Recent sessions</h2>
        <div className="space-y-2">
          {device.sessions?.length ? (
            device.sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span>{session.status}</span>
                <span className="text-muted-foreground">
                  {new Date(session.createdAt).toLocaleString()}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No sessions yet.</p>
          )}
        </div>
      </Card>
    </div>
  )
}
