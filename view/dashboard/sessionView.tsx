"use client"

import { useCallback, useEffect, useRef } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useMutation, useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { RemoteViewer } from "@/components/remote/RemoteViewer"
import { FileBrowser } from "@/components/remote/FileBrowser"
import { SystemInfo } from "@/components/remote/SystemInfo"
import { apiFetch, type RemoteSession } from "@/lib/api"
import { getAdminToken } from "@/lib/api"
import { getWsUrl } from "@/lib/webrtc"
import { io, Socket } from "socket.io-client"
import { showNotification } from "@/lib/showNotification"

export default function SessionView() {
  const params = useParams()
  const sessionId = params.id as string
  const router = useRouter()
  const socketRef = useRef<Socket | null>(null)

  const { data: session, isLoading } = useQuery({
    queryKey: ["session", sessionId],
    queryFn: () => apiFetch<RemoteSession>(`/sessions/${sessionId}`),
  })

  const endMutation = useMutation({
    mutationFn: () => apiFetch(`/sessions/${sessionId}`, { method: "DELETE" }),
    onSuccess: () => {
      showNotification({ type: "info", message: "Maintenance session ended" })
      router.push("/dashboard")
    },
  })

  const relayCommand = useCallback(
    (detail: unknown) => {
      socketRef.current?.emit("data_channel_message", {
        sessionId,
        message: detail,
      })
    },
    [sessionId]
  )

  useEffect(() => {
    const token = getAdminToken()
    if (!token) return

    const socket = io(`${getWsUrl()}/signaling`, {
      auth: { role: "admin", token },
      transports: ["websocket", "polling"],
      upgrade: true,
      rememberUpgrade: true,
    })
    socketRef.current = socket
    socket.emit("join_session", { sessionId })

    function onCommand(e: Event) {
      relayCommand((e as CustomEvent).detail)
    }
    window.addEventListener("remote-admin-command", onCommand)

    return () => {
      window.removeEventListener("remote-admin-command", onCommand)
      socket.disconnect()
    }
  }, [sessionId, relayCommand])

  if (isLoading) {
    return <p className="text-muted-foreground">Loading maintenance session…</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard">Back to systems</Link>
          </Button>
          <h1 className="mt-3 text-2xl font-semibold">
            {session?.device?.name || "Maintenance session"}
          </h1>
          <p className="text-sm text-muted-foreground">Job {sessionId}</p>
        </div>
        <Button
          variant="destructive"
          onClick={() => endMutation.mutate()}
          disabled={endMutation.isPending}
        >
          End maintenance
        </Button>
      </div>

      {session?.device?.deviceType === "BROWSER" && (
        <p className="rounded-lg border border-violet-500/20 bg-violet-500/5 px-4 py-3 text-sm text-muted-foreground">
          Online update check — view only. Full system maintenance requires the
          installed update package.
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <RemoteViewer
          sessionId={sessionId}
          viewOnly={session?.device?.deviceType === "BROWSER"}
          onDisconnect={() => router.push("/dashboard")}
        />
        {session?.device?.deviceType !== "BROWSER" && (
          <div className="space-y-4">
            <div>
              <h2 className="mb-2 font-semibold">System info</h2>
              <SystemInfo sessionId={sessionId} />
            </div>
            <div>
              <h2 className="mb-2 font-semibold">Files</h2>
              <FileBrowser sessionId={sessionId} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
