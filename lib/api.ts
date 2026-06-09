const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:3000/v1"

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

/** POST /auth/login */
export type LoginRequest = {
  email: string
  password: string
}

/** POST /auth/login — 200 */
export type LoginResponse = {
  token: string
  admin: AdminSummary
}

export type AdminSummary = {
  id: string
  email: string
  role: string
}

/** GET /auth/me — 200 */
export type AdminProfile = AdminSummary & {
  createdAt: string
}

/** POST /auth/logout — 200 */
export type LogoutResponse = {
  success: boolean
}

export async function loginAdmin(body: LoginRequest): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export async function getAdminProfile(): Promise<AdminProfile> {
  return apiFetch<AdminProfile>("/auth/me")
}

export async function logoutAdmin(): Promise<LogoutResponse> {
  return apiFetch<LogoutResponse>("/auth/logout", { method: "POST" })
}

export type DeviceType = "NATIVE" | "BROWSER"

export type Device = {
  id: string
  name: string
  os: string
  hostname: string
  ipAddress: string | null
  browser?: string | null
  userAgent?: string | null
  timezone?: string | null
  language?: string | null
  country?: string | null
  city?: string | null
  screenResolution?: string | null
  deviceType?: DeviceType
  status: "ONLINE" | "OFFLINE"
  isOnline?: boolean
  lastSeenAt: string | null
  enrolledAt: string
  enrollmentLinkId?: string | null
  enrollmentLink?: { id: string; code: string; createdAt: string } | null
}

export function formatDeviceLocation(device: {
  city?: string | null
  country?: string | null
  timezone?: string | null
}) {
  if (device.city && device.country) return `${device.city}, ${device.country}`
  if (device.country) return device.country
  if (device.timezone) return device.timezone
  return "—"
}

export type EnrollmentLinkKind = "AGENT" | "INSTANT" | "BOTH"

export type EnrollmentLinkStats = {
  openCount: number
  uniqueOpenCount: number
  connectCount: number
  uniqueConnectCount: number
  downloadCount: number
  uniqueDownloadCount: number
  lastOpenedAt: string | null
  lastConnectedAt: string | null
  lastDownloadAt: string | null
}

export type EnrollmentLinkStatus = "active" | "expired"

export type EnrollmentLinkDevice = {
  id: string
  name: string
  hostname: string
  os: string
  browser?: string | null
  ipAddress?: string | null
  country?: string | null
  city?: string | null
  timezone?: string | null
  language?: string | null
  screenResolution?: string | null
  userAgent?: string | null
  status: string
  deviceType?: DeviceType
  enrolledAt: string
  lastSeenAt?: string | null
  revokedAt?: string | null
}

export type EnrollmentLink = {
  id: string
  code: string
  kind?: EnrollmentLinkKind
  url?: string
  agentUrl?: string
  instantUrl?: string
  expiresAt: string | null
  createdAt: string
  status?: EnrollmentLinkStatus
  deviceCount?: number
  stats?: EnrollmentLinkStats
  devices?: EnrollmentLinkDevice[]
}

export async function createEnrollmentLink(kind: EnrollmentLinkKind = "BOTH") {
  return apiFetch<EnrollmentLink>("/enrollment-links", {
    method: "POST",
    body: JSON.stringify({ kind }),
  })
}

export type DeleteEnrollmentLinksResponse = {
  success: boolean
  deletedCount?: number
  deletedId?: string
}

export async function deleteEnrollmentLink(
  id: string
): Promise<DeleteEnrollmentLinksResponse> {
  return apiFetch<DeleteEnrollmentLinksResponse>(`/enrollment-links/${id}`, {
    method: "DELETE",
  })
}

export async function deleteEnrollmentLinks(
  ids: string[]
): Promise<DeleteEnrollmentLinksResponse> {
  return apiFetch<DeleteEnrollmentLinksResponse>(
    "/enrollment-links/bulk-delete",
    {
      method: "POST",
      body: JSON.stringify({ ids }),
    }
  )
}

export async function deleteExpiredEnrollmentLinks(): Promise<DeleteEnrollmentLinksResponse> {
  return apiFetch<DeleteEnrollmentLinksResponse>("/enrollment-links/expired", {
    method: "DELETE",
  })
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
