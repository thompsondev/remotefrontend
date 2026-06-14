function defaultStunServers(): RTCIceServer[] {
  return [
    { urls: "stun:stun.cloudflare.com:3478" },
    { urls: "stun:stun.l.google.com:19302" },
  ]
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:3000/v1"

export type IceServerAuth =
  | { adminToken: string; deviceToken?: never }
  | { deviceToken: string; adminToken?: never }

let cachedIceServers: RTCIceServer[] | null = null
let cacheExpiresAt = 0

export async function fetchIceServers(
  auth: IceServerAuth
): Promise<RTCIceServer[]> {
  const now = Date.now()
  if (cachedIceServers && cacheExpiresAt > now) {
    return cachedIceServers
  }

  const headers: Record<string, string> = {}
  if ("adminToken" in auth && auth.adminToken) {
    headers.Authorization = `Bearer ${auth.adminToken}`
  }
  if ("deviceToken" in auth && auth.deviceToken) {
    headers["x-device-token"] = auth.deviceToken
  }

  try {
    const res = await fetch(`${API_BASE}/webrtc/ice-servers`, { headers })
    if (!res.ok) {
      return defaultStunServers()
    }

    const data = (await res.json()) as {
      iceServers?: RTCIceServer[]
      ttl?: number
    }

    if (!data.iceServers?.length) {
      return defaultStunServers()
    }

    cachedIceServers = data.iceServers
    const ttlMs = Math.max((data.ttl ?? 3600) - 300, 300) * 1000
    cacheExpiresAt = now + ttlMs
    return data.iceServers
  } catch {
    return defaultStunServers()
  }
}

/** @deprecated Use fetchIceServers() — kept for sync imports during migration */
export const ICE_SERVERS: RTCIceServer[] = defaultStunServers()

export function getWsUrl() {
  return (
    process.env.NEXT_PUBLIC_WS_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  )
}
