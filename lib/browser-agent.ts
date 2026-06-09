import { io, Socket } from "socket.io-client"
import { getWsUrl, ICE_SERVERS } from "@/lib/webrtc"

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:3000/v1"

const HEARTBEAT_MS = 25_000

export type BrowserAgentCredentials = {
  deviceId: string
  deviceToken: string
  code: string
}

export type BrowserAgentStatus =
  | "idle"
  | "requesting_screen"
  | "enrolling"
  | "connecting"
  | "waiting"
  | "in_session"
  | "screen_stopped"
  | "error"

function storageKey(code: string) {
  return `browser_agent_${code}`
}

export function loadBrowserCredentials(
  code: string
): BrowserAgentCredentials | null {
  if (typeof window === "undefined") return null
  try {
    const raw = sessionStorage.getItem(storageKey(code))
    if (!raw) return null
    return JSON.parse(raw) as BrowserAgentCredentials
  } catch {
    return null
  }
}

export function saveBrowserCredentials(creds: BrowserAgentCredentials) {
  sessionStorage.setItem(storageKey(creds.code), JSON.stringify(creds))
}

export function clearBrowserCredentials(code: string) {
  sessionStorage.removeItem(storageKey(code))
}

export function detectBrowserInfo() {
  if (typeof navigator === "undefined") {
    return {
      name: "Browser Session",
      hostname: "browser",
      os: "Web Browser",
      browser: "Web Browser",
      userAgent: "",
      timezone: "",
      language: "",
      screenResolution: "",
    }
  }
  const ua = navigator.userAgent
  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } })
      .userAgentData?.platform ||
    navigator.platform ||
    "Unknown"
  let browser = "Web Browser"
  if (ua.includes("Edg/")) browser = "Microsoft Edge"
  else if (ua.includes("Chrome/")) browser = "Google Chrome"
  else if (ua.includes("Firefox/")) browser = "Firefox"
  else if (ua.includes("Safari/") && !ua.includes("Chrome/")) browser = "Safari"

  return {
    name: `${browser} Session`,
    hostname: window.location.hostname || "browser",
    os: platform,
    browser,
    userAgent: ua,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
  }
}

export async function enrollBrowserDevice(code: string) {
  const info = detectBrowserInfo()
  const res = await fetch(`${API_BASE}/devices/enroll-browser`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, ...info }),
  })
  if (!res.ok) {
    const text = await res.text()
    let message = text || "Failed to enroll browser session"
    try {
      const body = JSON.parse(text) as {
        message?: string | string[]
        statusCode?: number
      }
      message = Array.isArray(body.message)
        ? body.message.join(", ")
        : body.message || message

      if (res.status === 404 && message.includes("enroll-browser")) {
        message =
          "Instant connect is not enabled on the server yet. Ask your administrator to deploy the latest backend (remotehick)."
      }
    } catch {
      /* use raw text */
    }
    throw new Error(message)
  }
  return res.json() as Promise<{
    deviceId: string
    deviceToken: string
    device: { id: string; name: string; hostname: string; os: string }
  }>
}

async function sendHeartbeat(deviceId: string, deviceToken: string) {
  await fetch(`${API_BASE}/devices/${deviceId}/heartbeat`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-device-token": deviceToken,
    },
    body: JSON.stringify({}),
  })
}

export type BrowserAgentCallbacks = {
  onStatus?: (status: BrowserAgentStatus, detail?: string) => void
  onSessionStart?: () => void
  onSessionEnd?: () => void
}

export class BrowserAgentSession {
  private socket: Socket | null = null
  private pc: RTCPeerConnection | null = null
  private stream: MediaStream | null = null
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private creds: BrowserAgentCredentials
  private activeSessionId: string | null = null
  private destroyed = false

  constructor(
    creds: BrowserAgentCredentials,
    private readonly callbacks: BrowserAgentCallbacks = {}
  ) {
    this.creds = creds
  }

  private setStatus(status: BrowserAgentStatus, detail?: string) {
    this.callbacks.onStatus?.(status, detail)
  }

  async startWithScreenShare(): Promise<void> {
    if (this.destroyed) return
    this.setStatus("requesting_screen")

    if (!navigator.mediaDevices?.getDisplayMedia) {
      throw new Error("Screen sharing is not supported in this browser")
    }

    this.stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        displaySurface: "monitor",
      } as MediaTrackConstraints,
      audio: false,
    })

    this.stream.getVideoTracks()[0]?.addEventListener("ended", () => {
      this.setStatus("screen_stopped", "Screen sharing was stopped")
      this.teardownPeer()
    })

    this.setStatus("enrolling")
    const enrolled = await enrollBrowserDevice(this.creds.code)
    this.creds = {
      code: this.creds.code,
      deviceId: enrolled.deviceId,
      deviceToken: enrolled.deviceToken,
    }
    saveBrowserCredentials(this.creds)

    await this.connect()
  }

  async reconnectWithScreenShare(): Promise<void> {
    if (this.destroyed) return
    this.setStatus("requesting_screen")

    if (!navigator.mediaDevices?.getDisplayMedia) {
      throw new Error("Screen sharing is not supported in this browser")
    }

    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop())
    }

    this.stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
    })

    this.stream.getVideoTracks()[0]?.addEventListener("ended", () => {
      this.setStatus("screen_stopped", "Screen sharing was stopped")
      this.teardownPeer()
    })

    await sendHeartbeat(this.creds.deviceId, this.creds.deviceToken)
    await this.connect()
  }

  private async connect(): Promise<void> {
    if (this.destroyed) return
    this.setStatus("connecting")

    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }

    const socket = io(`${getWsUrl()}/signaling`, {
      auth: {
        role: "device",
        token: this.creds.deviceToken,
        deviceId: this.creds.deviceId,
      },
      transports: ["websocket"],
    })
    this.socket = socket

    socket.on("connect", () => {
      this.setStatus("waiting")
      void sendHeartbeat(this.creds.deviceId, this.creds.deviceToken)
    })

    socket.on("disconnect", () => {
      if (!this.destroyed) {
        this.setStatus("connecting", "Reconnecting...")
      }
    })

    socket.on(
      "session_request",
      async (data: { sessionId: string; adminId: string }) => {
        await this.handleSessionRequest(data.sessionId)
      }
    )

    socket.on("viewer_ready", async (data: { sessionId: string }) => {
      if (!data.sessionId || !this.activeSessionId) return
      if (data.sessionId !== this.activeSessionId) return
      await this.sendOfferForSession(data.sessionId)
    })

    socket.on("session_end", () => {
      this.activeSessionId = null
      this.teardownPeer()
      this.callbacks.onSessionEnd?.()
      this.setStatus("waiting")
    })

    socket.on(
      "webrtc_answer",
      async (data: {
        sessionId?: string
        from: string
        answer: RTCSessionDescriptionInit
      }) => {
        if (data.from !== "admin" || !this.pc || !this.activeSessionId) return
        if (data.sessionId && data.sessionId !== this.activeSessionId) return
        if (!this.pc.currentRemoteDescription) {
          await this.pc.setRemoteDescription(data.answer)
        }
      }
    )

    socket.on(
      "webrtc_ice",
      async (data: {
        sessionId?: string
        from: string
        candidate: RTCIceCandidateInit
      }) => {
        if (
          data.from !== "admin" ||
          !data.candidate ||
          !this.pc ||
          !this.activeSessionId
        ) {
          return
        }
        if (data.sessionId && data.sessionId !== this.activeSessionId) return
        try {
          await this.pc.addIceCandidate(data.candidate)
        } catch {
          /* ignore stale candidates */
        }
      }
    )

    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
    this.heartbeatTimer = setInterval(() => {
      void sendHeartbeat(this.creds.deviceId, this.creds.deviceToken).catch(
        () => {
          /* heartbeat retry on next tick */
        }
      )
    }, HEARTBEAT_MS)
  }

  private async handleSessionRequest(sessionId: string) {
    if (!this.socket || !this.stream) return

    this.activeSessionId = sessionId
    this.setStatus("in_session")
    this.callbacks.onSessionStart?.()

    this.socket.emit("session_accept", { sessionId })
    this.socket.emit("join_session", { sessionId })

    await this.sendOfferForSession(sessionId)
  }

  private async sendOfferForSession(sessionId: string) {
    if (!this.socket || !this.stream || this.activeSessionId !== sessionId) {
      return
    }

    this.teardownPeer(false)

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    this.pc = pc

    this.stream.getTracks().forEach((track) => {
      pc.addTrack(track, this.stream!)
    })

    pc.onicecandidate = (event) => {
      if (event.candidate && this.socket) {
        this.socket.emit("webrtc_ice", {
          sessionId,
          candidate: event.candidate.toJSON(),
        })
      }
    }

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    this.socket.emit("webrtc_offer", { sessionId, offer })
  }

  async resumeScreenShare(): Promise<void> {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      throw new Error("Screen sharing is not supported in this browser")
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop())
    }
    this.stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
    })
    this.stream.getVideoTracks()[0]?.addEventListener("ended", () => {
      this.setStatus("screen_stopped", "Screen sharing was stopped")
      this.teardownPeer()
    })
    this.setStatus("waiting")
  }

  private teardownPeer(clearSession = true) {
    if (this.pc) {
      this.pc.close()
      this.pc = null
    }
    if (clearSession) this.activeSessionId = null
  }

  destroy() {
    this.destroyed = true
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
    this.teardownPeer()
    this.socket?.disconnect()
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = null
  }
}
