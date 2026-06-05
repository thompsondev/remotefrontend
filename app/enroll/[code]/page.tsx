"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:3000/v1"

export default function EnrollPage() {
  const params = useParams()
  const code = params.code as string
  const [validation, setValidation] = useState<{
    valid: boolean
    reason?: string
    expiresAt?: string
  } | null>(null)

  const downloadUrl =
    process.env.NEXT_PUBLIC_AGENT_DOWNLOAD_URL ||
    "remoteagent://enroll?code=" + code

  useEffect(() => {
    fetch(`${API_BASE}/enrollment-links/${code}/validate`)
      .then((r) => r.json())
      .then(setValidation)
      .catch(() => setValidation({ valid: false, reason: "error" }))
  }, [code])

  if (!validation) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Validating enrollment link...</p>
      </div>
    )
  }

  if (!validation.valid) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="max-w-md p-8 text-center">
          <h1 className="text-xl font-semibold">Link unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This enrollment link is{" "}
            {validation.reason?.replace("_", " ") || "invalid"}. Ask your
            administrator for a new link.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="max-w-lg space-y-6 p-8">
        <div>
          <h1 className="text-2xl font-semibold">Install Remote Agent</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Install the agent on this Windows PC to allow secure remote access
            from your administrator.
          </p>
        </div>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>
            Download the Remote Agent zip, extract it, and run Remote Agent.exe
          </li>
          <li>
            When prompted, paste this enrollment code:{" "}
            <code className="rounded bg-muted px-1 font-mono text-foreground">
              {code}
            </code>
          </li>
          <li>Keep the agent running in the system tray</li>
        </ol>
        <div className="flex flex-col gap-3">
          <Button asChild>
            <a href={downloadUrl}>Download Windows Agent</a>
          </Button>
          <p className="text-xs text-muted-foreground">
            Expires{" "}
            {validation.expiresAt
              ? new Date(validation.expiresAt).toLocaleString()
              : "soon"}
          </p>
        </div>
      </Card>
    </div>
  )
}
