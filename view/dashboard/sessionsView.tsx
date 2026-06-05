"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { apiFetch, type RemoteSession } from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function SessionsView() {
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => apiFetch<RemoteSession[]>("/sessions"),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Sessions</h1>
        <p className="text-sm text-muted-foreground">
          Remote connection history
        </p>
      </div>

      <Card className="divide-y">
        {isLoading && (
          <p className="p-6 text-sm text-muted-foreground">Loading...</p>
        )}
        {!isLoading && sessions.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground">No sessions yet.</p>
        )}
        {sessions.map((session) => (
          <div
            key={session.id}
            className="flex flex-wrap items-center justify-between gap-4 p-4"
          >
            <div>
              <p className="font-medium">
                {session.device?.name || session.deviceId}
              </p>
              <p className="text-xs text-muted-foreground">
                {session.status} ·{" "}
                {new Date(session.createdAt).toLocaleString()}
              </p>
            </div>
            {session.status === "ACTIVE" && (
              <Button size="sm" asChild>
                <Link href={`/dashboard/session/${session.id}`}>Open</Link>
              </Button>
            )}
          </div>
        ))}
      </Card>
    </div>
  )
}
