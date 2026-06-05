const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:3001/v1"

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("admin_token")
}

export function setAdminToken(token: string) {
  localStorage.setItem("admin_token", token)
}

export function clearAdminToken() {
  localStorage.removeItem("admin_token")
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message)
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAdminToken()
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  }
  if (token) {
    ;(headers as Record<string, string>)["Authorization"] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",
  })

  if (!res.ok) {
    let err = await res.text()
    try {
      const body = JSON.parse(err) as { message?: string | string[] }
      err = Array.isArray(body.message)
        ? body.message.join(", ")
        : body.message || err
    } catch {
      /* use raw text */
    }
    throw new ApiError(err, res.status)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export type Device = {
  id: string
  name: string
  os: string
  hostname: string
  ipAddress: string | null
  status: "ONLINE" | "OFFLINE"
  isOnline?: boolean
  lastSeenAt: string | null
  enrolledAt: string
}

export type EnrollmentLink = {
  id: string
  code: string
  url?: string
  expiresAt: string
  usedAt: string | null
  createdAt: string
  device?: { id: string; name: string; hostname: string; status: string } | null
}

export type RemoteSession = {
  id: string
  deviceId: string
  adminId: string
  status: "PENDING" | "ACTIVE" | "ENDED"
  startedAt: string | null
  endedAt: string | null
  createdAt: string
  device?: Device
}
