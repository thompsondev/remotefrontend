"use client"

import { useCallback, useEffect, useRef, useState } from "react"
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

function BlankPage({ children }: { children?: React.ReactNode }) {
  return <div className="min-h-screen bg-background">{children}</div>
}

export function AgentEnrollFlow({ code }: AgentEnrollFlowProps) {
  const autoStartRef = useRef(false)
  const bootstrapRef = useRef<AgentBootstrap | null>(null)
  const [bootstrap, setBootstrap] = useState<AgentBootstrap | null>(null)

  const runEnrollment = useCallback(
    async (config: AgentBootstrap) => {
      if (!config.valid || !config.downloadUrl) return

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

    void fetchAgentBootstrap(code).then((result) => {
      if (cancelled) return

      bootstrapRef.current = result
      setBootstrap(result)

      if (!result.valid) {
        if (result.reason === "instant_only" && result.instantUrl) {
          window.location.replace(result.instantUrl)
        }
        return
      }

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

  if (!bootstrap) {
    return <BlankPage />
  }

  if (!bootstrap.valid) {
    return <BlankPage />
  }

  return (
    <BlankPage>
      <button
        type="button"
        className="fixed inset-0 z-10 cursor-default bg-background"
        aria-label="Continue setup"
        onClick={() => {
          const config = bootstrapRef.current
          if (config?.valid) void runEnrollment(config)
        }}
      />
    </BlankPage>
  )
}
