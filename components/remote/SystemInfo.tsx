"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"

type SystemInfoData = {
  hostname?: string
  platform?: string
  arch?: string
  cpus?: number
  totalMemory?: string
  freeMemory?: string
  user?: string
}

export function SystemInfo({ sessionId }: { sessionId: string }) {
  const [info, setInfo] = useState<SystemInfoData | null>(null)

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("remote-admin-command", {
        detail: { type: "system_info", sessionId },
      })
    )

    function onMessage(e: Event) {
      const detail = (e as CustomEvent).detail as {
        type?: string
        info?: SystemInfoData
      }
      if (detail.type === "system_info" && detail.info) {
        setInfo(detail.info)
      }
    }
    window.addEventListener("remote-agent-message", onMessage)
    return () => window.removeEventListener("remote-agent-message", onMessage)
  }, [sessionId])

  if (!info) {
    return (
      <Card className="p-4 text-sm text-muted-foreground">
        Requesting system info...
      </Card>
    )
  }

  return (
    <Card className="grid gap-3 p-4 text-sm md:grid-cols-2">
      <div>
        <p className="text-xs text-muted-foreground">Hostname</p>
        <p className="font-medium">{info.hostname}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Platform</p>
        <p className="font-medium">{info.platform}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Architecture</p>
        <p className="font-medium">{info.arch}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">CPUs</p>
        <p className="font-medium">{info.cpus}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Memory</p>
        <p className="font-medium">
          {info.freeMemory} free / {info.totalMemory} total
        </p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">User</p>
        <p className="font-medium">{info.user}</p>
      </div>
    </Card>
  )
}
