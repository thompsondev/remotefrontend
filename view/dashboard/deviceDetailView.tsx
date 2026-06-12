"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  apiFetch,
  formatDeviceLocation,
  isDeviceOnline,
  type Device,
} from "@/lib/api"

type DeviceDetail = Device & {
  sessions: Array<{
    id: string
    status: string
    startedAt: string | null
    endedAt: string | null
    createdAt: string
  }>
}

function DetailField({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-medium ${mono ? "font-mono text-sm break-all" : ""}`}>
        {value || "—"}
      </p>
    </div>
  )
}

export default function DeviceDetailView() {
  const params = useParams()
  const id = params.id as string

  const { data: device, isLoading } = useQuery({
    queryKey: ["device", id],
    queryFn: () => apiFetch<DeviceDetail>(`/devices/${id}`),
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
  })

  if (isLoading) {
    return <p className="text-muted-foreground">Loading device...</p>
  }

  if (!device) {
    return <p className="text-muted-foreground">Device not found</p>
  }

  const online = isDeviceOnline(device)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard">Back</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">{device.name}</h1>
          <p className="text-sm text-muted-foreground">
            {device.deviceType === "BROWSER"
              ? "Instant browser session"
              : "Installed agent"}
            {online ? " · Online" : " · Offline"}
          </p>
        </div>
      </div>

      <Card className="grid gap-4 p-6 md:grid-cols-2 lg:grid-cols-3">
        <DetailField label="Hostname" value={device.hostname} />
        <DetailField label="Operating system" value={device.os} />
        <DetailField label="Browser" value={device.browser || "—"} />
        <DetailField label="IP address" value={device.ipAddress || "—"} mono />
        <DetailField label="Location" value={formatDeviceLocation(device)} />
        <DetailField label="Timezone" value={device.timezone || "—"} />
        <DetailField label="Language" value={device.language || "—"} />
        <DetailField
          label="Screen resolution"
          value={device.screenResolution || "—"}
        />
        <DetailField
          label="Enrolled"
          value={new Date(device.enrolledAt).toLocaleString()}
        />
        <DetailField
          label="Last seen"
          value={
            device.lastSeenAt
              ? new Date(device.lastSeenAt).toLocaleString()
              : "Never"
          }
        />
        {device.enrollmentLink?.code && (
          <DetailField
            label="Enrollment link"
            value={device.enrollmentLink.code}
            mono
          />
        )}
      </Card>

      {device.userAgent && (
        <Card className="p-6">
          <h2 className="mb-2 font-semibold">User agent</h2>
          <p className="font-mono text-xs break-all text-muted-foreground">
            {device.userAgent}
          </p>
        </Card>
      )}

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
