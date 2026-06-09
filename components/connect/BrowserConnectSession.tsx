"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  BrowserAgentSession,
  clearBrowserCredentials,
  loadBrowserCredentials,
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
  idle: "Ready to start",
  requesting_screen: "Choose a screen to share…",
  enrolling: "Setting up your session…",
  connecting: "Connecting securely…",
  waiting: "Ready — waiting for your administrator",
  in_session: "Live session in progress",
  screen_stopped: "Screen sharing stopped",
  error: "Something went wrong",
}

export function BrowserConnectSession({ code }: BrowserConnectSessionProps) {
  const agentRef = useRef<BrowserAgentSession | null>(null)
  const [validation, setValidation] = useState<ConnectValidation | null>(null)
  const [status, setStatus] = useState<BrowserAgentStatus>("idle")
  const [detail, setDetail] = useState<string>()
  const [error, setError] = useState<string>()
  const [started, setStarted] = useState(false)

  useEffect(() => {
    let cancelled = false
    const requestCode = code

    setValidation(null)
    setError(undefined)
    setStarted(false)

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
    })

    return () => {
      cancelled = true
    }
  }, [code])

  const initAgent = useCallback(
    (reconnect = false) => {
      const creds = loadBrowserCredentials(code)
      if (!creds && reconnect) {
        setError("Session expired. Please ask for a new link.")
        return
      }

      const agent = new BrowserAgentSession(
        creds ?? { code, deviceId: "", deviceToken: "" },
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
    },
    [code]
  )

  useEffect(() => {
    return () => {
      agentRef.current?.destroy()
    }
  }, [])

  const handleReconnect = async () => {
    setError(undefined)
    const creds = loadBrowserCredentials(code)
    if (!creds) {
      setError("Session expired. Please ask for a new link.")
      return
    }
    try {
      const agent = initAgent(true)
      if (!agent) return
      await agent.reconnectWithScreenShare()
      setStarted(true)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not resume your session"
      )
      setStatus("error")
    }
  }

  const handleStart = async () => {
    setError(undefined)
    try {
      const agent = initAgent()
      if (!agent) return
      await agent.startWithScreenShare()
      setStarted(true)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not start screen sharing"
      if (message.toLowerCase().includes("permission")) {
        setError("Screen sharing permission was denied. Please try again.")
      } else {
        setError(message)
      }
      setStatus("error")
    }
  }

  const handleResumeShare = async () => {
    setError(undefined)
    try {
      await agentRef.current?.resumeScreenShare()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not resume screen sharing"
      )
      setStatus("error")
    }
  }

  const handleEnd = () => {
    agentRef.current?.destroy()
    clearBrowserCredentials(code)
    setStarted(false)
    setStatus("idle")
  }

  if (!validation) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Preparing your session…</p>
      </div>
    )
  }

  if (!validation.valid) {
    const reason = validation.reason?.replace(/_/g, " ") || "invalid"
    const isAgentOnly = validation.reason === "agent_only"
    const isServiceError = validation.reason === "error"
    const enrollUrl =
      process.env.NEXT_PUBLIC_ENROLL_BASE_URL?.replace(/\/$/, "") ||
      (typeof window !== "undefined"
        ? `${window.location.origin}/enroll`
        : "/enroll")

    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="max-w-md space-y-4 p-8 text-center">
          <h1 className="text-xl font-semibold">Link unavailable</h1>
          <p className="text-sm text-muted-foreground">
            {isServiceError
              ? "We could not reach the server to validate this link. Check your connection and try again."
              : `This connect link is ${reason}. Ask your administrator for a new link.`}
          </p>
          {isAgentOnly && (
            <>
              <p className="text-xs text-muted-foreground">
                This link is for the Windows agent installer, not instant
                browser connect.
              </p>
              <Button asChild variant="outline">
                <a href={`${enrollUrl}/${code}`}>Open agent install page</a>
              </Button>
            </>
          )}
        </Card>
      </div>
    )
  }

  const isLive = status === "in_session"
  const isWaiting = status === "waiting" || status === "connecting"

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/30 p-6">
      <Card className="w-full max-w-lg space-y-6 border-border/60 p-8 shadow-lg">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <span
              className={`h-3 w-3 rounded-full ${
                isLive
                  ? "animate-pulse bg-emerald-500"
                  : isWaiting
                    ? "animate-pulse bg-amber-500"
                    : "bg-muted-foreground/40"
              }`}
            />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {isLive ? "Connected" : "Instant Remote Access"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isLive
              ? "Your administrator is viewing your shared screen. Keep this tab open."
              : "Share your screen so your administrator can assist you — no downloads required."}
          </p>
        </div>

        <div className="rounded-lg border bg-muted/30 px-4 py-3 text-center">
          <p className="text-sm font-medium">{STATUS_LABELS[status]}</p>
          {detail && (
            <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
          )}
        </div>

        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="space-y-3">
          {!started && !validation.reconnect && (
            <Button
              className="w-full"
              size="lg"
              onClick={() => void handleStart()}
            >
              Share my screen
            </Button>
          )}

          {!started && validation.reconnect && (
            <Button
              className="w-full"
              size="lg"
              onClick={() => void handleReconnect()}
            >
              Continue & share screen
            </Button>
          )}

          {status === "screen_stopped" && (
            <Button
              className="w-full"
              size="lg"
              onClick={() => void handleResumeShare()}
            >
              Resume screen sharing
            </Button>
          )}

          {(started || validation.reconnect) && (
            <Button className="w-full" variant="outline" onClick={handleEnd}>
              End session
            </Button>
          )}
        </div>

        <ul className="space-y-2 text-xs text-muted-foreground">
          <li>• Works in Chrome, Edge, and Firefox on desktop</li>
          <li>• You choose which screen or window to share</li>
          <li>• No software installation needed</li>
          {validation.expiresAt && (
            <li>
              • Link expires {new Date(validation.expiresAt).toLocaleString()}
            </li>
          )}
        </ul>
      </Card>
    </div>
  )
}
