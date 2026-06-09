const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:3000/v1"

export type ConnectValidation = {
  valid: boolean
  reason?: string
  ready?: boolean
  reconnect?: boolean
  kind?: string
  expiresAt?: string
  instantUrl?: string
  device?: { id: string; name: string; hostname: string }
}

type ValidateResponse = {
  valid: boolean
  reason?: string
  kind?: string
  expiresAt?: string
  instantUrl?: string
  agentUrl?: string
  device?: {
    id: string
    name: string
    hostname: string
    deviceType?: string
    revokedAt?: string | null
  }
}

function connectBaseUrl(code: string) {
  const configured = process.env.NEXT_PUBLIC_CONNECT_BASE_URL?.replace(
    /\/$/,
    ""
  )
  if (configured) return `${configured}/${code}`
  if (typeof window !== "undefined") {
    return `${window.location.origin}/connect/${code}`
  }
  return `/connect/${code}`
}

function fromValidateFallback(
  code: string,
  validate: ValidateResponse
): ConnectValidation {
  if (!validate.valid) {
    return {
      valid: false,
      reason: validate.reason ?? "not_found",
      kind: validate.kind,
    }
  }

  if (validate.kind === "AGENT") {
    return { valid: false, reason: "agent_only", kind: validate.kind }
  }

  return {
    valid: true,
    ready: false,
    kind: validate.kind,
    expiresAt: validate.expiresAt,
    instantUrl: validate.instantUrl ?? connectBaseUrl(code),
  }
}

/**
 * Validates a code for the instant connect page.
 * Uses validate-connect when available (v2), falls back to validate (v1/production).
 */
export async function fetchConnectValidation(
  code: string
): Promise<ConnectValidation> {
  try {
    const connectRes = await fetch(
      `${API_BASE}/enrollment-links/${code}/validate-connect`
    )

    if (connectRes.ok) {
      const result = (await connectRes.json()) as ConnectValidation
      if (typeof result.valid === "boolean") {
        return result
      }
    }

    const validateRes = await fetch(
      `${API_BASE}/enrollment-links/${code}/validate`
    )
    if (!validateRes.ok) {
      return { valid: false, reason: "error" }
    }

    const validate = (await validateRes.json()) as ValidateResponse
    return fromValidateFallback(code, validate)
  } catch {
    return { valid: false, reason: "error" }
  }
}
