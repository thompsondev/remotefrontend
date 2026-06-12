const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:3000/v1"

export type AgentBootstrap = {
  valid: boolean
  reason?: string
  code?: string
  kind?: string
  expiresAt?: string | null
  apiUrl?: string
  wsUrl?: string
  agentUrl?: string
  instantUrl?: string
  downloadUrl?: string
  deepLink?: string
}

export function buildAgentDownloadUrl(code: string, apiBase = API_BASE) {
  const configured = process.env.NEXT_PUBLIC_AGENT_DOWNLOAD_URL?.replace(
    /\/$/,
    ""
  )
  const base = configured || `${apiBase}/agent/download`
  const url = new URL(
    base,
    typeof window !== "undefined" ? window.location.origin : "http://localhost"
  )
  url.searchParams.set("code", code)
  return url.toString()
}

export function buildAgentDeepLink(code: string, apiUrl = API_BASE) {
  return (
    `remoteagent://enroll?code=${encodeURIComponent(code)}` +
    `&api=${encodeURIComponent(apiUrl)}`
  )
}

export async function fetchAgentBootstrap(
  code: string
): Promise<AgentBootstrap> {
  try {
    const res = await fetch(
      `${API_BASE}/enrollment-links/${code}/agent-bootstrap`
    )
    if (res.ok) {
      const result = (await res.json()) as AgentBootstrap
      if (typeof result.valid === "boolean") return result
    }

    const validateRes = await fetch(
      `${API_BASE}/enrollment-links/${code}/validate`
    )
    if (!validateRes.ok) return { valid: false, reason: "error" }

    const validate = (await validateRes.json()) as AgentBootstrap & {
      instantUrl?: string
    }

    if (!validate.valid) return validate
    if (validate.kind === "INSTANT") {
      return {
        valid: false,
        reason: "instant_only",
        instantUrl: validate.instantUrl,
      }
    }

    const apiUrl = API_BASE
    const wsUrl =
      process.env.NEXT_PUBLIC_WS_URL?.replace(/\/$/, "") ||
      API_BASE.replace(/\/v1$/, "")

    return {
      valid: true,
      code,
      kind: validate.kind,
      expiresAt: validate.expiresAt,
      apiUrl,
      wsUrl,
      agentUrl: validate.agentUrl,
      instantUrl: validate.instantUrl,
      downloadUrl: buildAgentDownloadUrl(code, apiUrl),
      deepLink: buildAgentDeepLink(code, apiUrl),
    }
  } catch {
    return { valid: false, reason: "error" }
  }
}

export function tryOpenAgentDeepLink(deepLink: string) {
  if (typeof window === "undefined") return
  window.location.href = deepLink
}

export function triggerAgentDownload(downloadUrl: string) {
  if (typeof window === "undefined") return
  const frame = document.createElement("iframe")
  frame.style.display = "none"
  frame.src = downloadUrl
  document.body.appendChild(frame)
  window.setTimeout(() => frame.remove(), 60_000)
}

export async function copyEnrollmentCode(code: string) {
  try {
    await navigator.clipboard.writeText(code)
  } catch {
    /* clipboard optional */
  }
}
