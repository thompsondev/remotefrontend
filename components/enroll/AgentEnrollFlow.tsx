"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  copyEnrollmentCode,
  fetchAgentBootstrap,
  triggerAgentDownload,
  tryOpenAgentDeepLink,
  type AgentBootstrap,
} from "@/lib/agent-enroll"

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:3000/v1"

type AgentEnrollFlowProps = {
  code: string
}

type SetupPhase = "loading" | "ready" | "invalid"

export function AgentEnrollFlow({ code }: AgentEnrollFlowProps) {
  const autoStartRef = useRef(false)
  const bootstrapRef = useRef<AgentBootstrap | null>(null)
  const [bootstrap, setBootstrap] = useState<AgentBootstrap | null>(null)
  const [phase, setPhase] = useState<SetupPhase>("loading")
  const [downloadStarted, setDownloadStarted] = useState(false)

  const runEnrollment = useCallback(
    async (config: AgentBootstrap) => {
      if (!config.valid || !config.downloadUrl) return

      setDownloadStarted(true)
      await copyEnrollmentCode(config.code || code)

      if (config.deepLink) {
        tryOpenAgentDeepLink(config.deepLink)
      }

      window.setTimeout(() => {
        triggerAgentDownload(config.downloadUrl!)
      }, 1200)
    },
    [code]
  )

  useEffect(() => {
    let cancelled = false
    autoStartRef.current = false
    bootstrapRef.current = null
    setBootstrap(null)
    setPhase("loading")
    setDownloadStarted(false)

    void fetchAgentBootstrap(code).then((result) => {
      if (cancelled) return

      bootstrapRef.current = result
      setBootstrap(result)

      if (!result.valid) {
        setPhase("invalid")
        if (result.reason === "instant_only" && result.instantUrl) {
          window.location.replace(result.instantUrl)
        }
        return
      }

      setPhase("ready")

      void fetch(`${API_BASE}/enrollment-links/${code}/track/open`, {
        method: "POST",
      })

      if (autoStartRef.current) return
      autoStartRef.current = true
      void runEnrollment(result)
    })

    return () => {
      cancelled = true
    }
  }, [code, runEnrollment])

  if (phase === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <p className="text-sm text-muted-foreground">Preparing agent setup…</p>
      </div>
    )
  }

  if (phase === "invalid" || !bootstrap?.valid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <Card className="max-w-md space-y-3 p-6 text-center">
          <h1 className="text-lg font-semibold">Link unavailable</h1>
          <p className="text-sm text-muted-foreground">
            This enrollment link is{" "}
            {bootstrap?.reason?.replace(/_/g, " ") || "invalid"}. Ask your
            administrator for a new link.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="max-w-lg space-y-5 p-8">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Install Remote Agent</h1>
          <p className="text-sm text-muted-foreground">
            {downloadStarted
              ? "Download started. Follow the steps below to finish setup."
              : "Setting up your download…"}
          </p>
        </div>

        <ol className="list-decimal space-y-3 pl-5 text-sm text-muted-foreground">
          <li>
            Run the downloaded installer{" "}
            <span className="font-medium text-foreground">
              Remote-Agent-Setup.exe
            </span>
          </li>
          <li>Complete installation — the agent launches automatically</li>
          <li>
            Come back to this page after install so the agent can enroll
            automatically
          </li>
          <li>Keep Remote Agent running in the system tray (near the clock)</li>
        </ol>

        <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          Once installed, your administrator can connect remotely without any
          prompt on this computer.
        </p>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            onClick={() => {
              const config = bootstrapRef.current
              if (config?.valid) void runEnrollment(config)
            }}
          >
            Download again
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const config = bootstrapRef.current
              if (config?.deepLink) tryOpenAgentDeepLink(config.deepLink)
            }}
          >
            Open installed agent
          </Button>
        </div>
      </Card>
    </div>
  )
}
