"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  buildConnectUrl,
  copyEnrollmentCode,
  fetchAgentBootstrap,
  triggerAgentDownload,
  tryOpenAgentDeepLink,
  type AgentBootstrap,
} from "@/lib/agent-enroll"

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:3000/v1"

const DEEP_LINK_POLL_MS = 3_000
const DEEP_LINK_POLL_DURATION_MS = 120_000

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

  useEffect(() => {
    if (!downloadStarted) return

    const config = bootstrapRef.current
    if (!config?.deepLink) return

    const startedAt = Date.now()
    const pollId = window.setInterval(() => {
      if (Date.now() - startedAt > DEEP_LINK_POLL_DURATION_MS) {
        window.clearInterval(pollId)
        return
      }
      tryOpenAgentDeepLink(config.deepLink!)
    }, DEEP_LINK_POLL_MS)

    return () => window.clearInterval(pollId)
  }, [downloadStarted])

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

  const connectUrl =
    bootstrap.kind === "BOTH"
      ? bootstrap.instantUrl || buildConnectUrl(code)
      : null

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="max-w-lg space-y-5 p-8">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Install Remote Agent</h1>
          <p className="text-sm text-muted-foreground">
            {downloadStarted
              ? "Download started. Install the app — enrollment should finish automatically."
              : "Setting up your download…"}
          </p>
        </div>

        {connectUrl ? (
          <div className="space-y-3 rounded-md border border-dashed p-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Need access right now?</p>
              <p className="text-xs text-muted-foreground">
                Connect in the browser with no install. Best for quick support;
                the Windows agent gives full remote control.
              </p>
            </div>
            <Button asChild variant="secondary" className="w-full sm:w-auto">
              <Link href={connectUrl}>Connect in browser instead</Link>
            </Button>
          </div>
        ) : null}

        <ol className="list-decimal space-y-3 pl-5 text-sm text-muted-foreground">
          <li>
            Run the downloaded installer{" "}
            <span className="font-medium text-foreground">
              Remote-Agent-Setup.exe
            </span>
          </li>
          <li>
            Complete installation — the agent launches and picks up your
            enrollment code from the clipboard automatically
          </li>
          <li>Keep Remote Agent running in the system tray (near the clock)</li>
        </ol>

        <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          Your enrollment code was copied to the clipboard. After install, the
          agent enrolls on its own — you do not need to return to this page.
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
            Activate installed agent
          </Button>
        </div>
      </Card>
    </div>
  )
}
