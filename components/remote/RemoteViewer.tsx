"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { io, Socket } from "socket.io-client"
import { getAdminToken } from "@/lib/api"
import { fetchIceServers, getWsUrl } from "@/lib/webrtc"
import { Button } from "@/components/ui/button"

type RemoteViewerProps = {
  sessionId: string
  viewOnly?: boolean
  onDataChannel?: (dc: RTCDataChannel) => void
  onDisconnect?: () => void
}

const VIEWER_READY_RETRY_MS = 4_000
const OFFER_IGNORE_WINDOW_MS = 1_500

export function RemoteViewer({
  sessionId,
  viewOnly = false,
  onDataChannel,
  onDisconnect,
}: RemoteViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const streamConnectedRef = useRef(false)
  const lastOfferAtRef = useRef(0)
  const viewerReadyRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [connected, setConnected] = useState(false)
  const [status, setStatus] = useState("Connecting...")

  const sendInput = useCallback((payload: unknown) => {
    const dc = (
      pcRef.current as RTCPeerConnection & { controlDc?: RTCDataChannel }
    )?.controlDc
    if (dc?.readyState === "open") {
      dc.send(JSON.stringify(payload))
    }
  }, [])

  useEffect(() => {
    const token = getAdminToken()
    if (!token) return

    let cancelled = false
    let activePc: RTCPeerConnection | null = null
    let socket: Socket | null = null

    void (async () => {
      const iceServers = await fetchIceServers({ adminToken: token })
      if (cancelled) return

      socket = io(`${getWsUrl()}/signaling`, {
        auth: { role: "admin", token },
        transports: ["websocket"],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      })
      socketRef.current = socket

      const attachPeerHandlers = (peer: RTCPeerConnection) => {
        peer.ontrack = (event) => {
          if (videoRef.current && event.streams[0]) {
            videoRef.current.srcObject = event.streams[0]
            void videoRef.current.play().catch(() => {
              /* autoplay may require user gesture */
            })
            streamConnectedRef.current = true
            setConnected(true)
            setStatus("Connected")
          }
        }

        peer.onicecandidate = (event) => {
          if (event.candidate && socket) {
            socket.emit("webrtc_ice", {
              sessionId,
              candidate: event.candidate.toJSON(),
            })
          }
        }

        peer.oniceconnectionstatechange = () => {
          const ice = peer.iceConnectionState
          if (ice === "connected" || ice === "completed") {
            if (streamConnectedRef.current) {
              setConnected(true)
              setStatus("Connected")
            }
            return
          }

          if (ice === "checking") {
            if (!streamConnectedRef.current) {
              setStatus("Negotiating stream...")
            }
            return
          }

          if (ice === "disconnected") {
            if (streamConnectedRef.current) {
              setStatus("Reconnecting stream...")
            }
            return
          }

          if (ice === "failed" && socket) {
            streamConnectedRef.current = false
            setConnected(false)
            setStatus("Connection lost — retrying...")
            socket.emit("viewer_ready", { sessionId })
          }
        }

        peer.ondatachannel = (event) => {
          if (event.channel.label === "control") {
            ;(
              peer as RTCPeerConnection & { controlDc?: RTCDataChannel }
            ).controlDc = event.channel
          }
          onDataChannel?.(event.channel)
        }
      }

      const setupPeerConnection = () => {
        if (pcRef.current) {
          pcRef.current.close()
        }

        const peer = new RTCPeerConnection({ iceServers })
        pcRef.current = peer
        attachPeerHandlers(peer)
        return peer
      }

      activePc = setupPeerConnection()

      const scheduleViewerReadyRetry = () => {
        if (viewerReadyRetryRef.current) {
          clearTimeout(viewerReadyRetryRef.current)
        }
        viewerReadyRetryRef.current = window.setTimeout(() => {
          if (!streamConnectedRef.current && socket?.connected) {
            socket.emit("viewer_ready", { sessionId })
          }
        }, VIEWER_READY_RETRY_MS)
      }

      const notifyViewerReady = () => {
        socket?.emit("join_session", { sessionId })
        socket?.emit("viewer_ready", { sessionId })
        scheduleViewerReadyRetry()
      }

      socket.on("connect", () => {
        notifyViewerReady()
        setStatus(
          streamConnectedRef.current
            ? "Connected"
            : "Waiting for device stream..."
        )
      })

      socket.on(
        "webrtc_offer",
        async (data: {
          sessionId?: string
          from: string
          offer: RTCSessionDescriptionInit
        }) => {
          if (data.from !== "device" || !activePc) return
          if (data.sessionId && data.sessionId !== sessionId) return

          const now = Date.now()
          if (now - lastOfferAtRef.current < OFFER_IGNORE_WINDOW_MS) {
            return
          }
          lastOfferAtRef.current = now

          if (activePc.signalingState === "have-remote-offer") {
            return
          }

          if (
            activePc.signalingState === "closed" ||
            activePc.connectionState === "closed" ||
            activePc.iceConnectionState === "failed"
          ) {
            activePc = setupPeerConnection()
            streamConnectedRef.current = false
            setConnected(false)
          }

          try {
            await activePc.setRemoteDescription(data.offer)
            const answer = await activePc.createAnswer()
            await activePc.setLocalDescription(answer)
            socket?.emit("webrtc_answer", { sessionId, answer })
            if (!streamConnectedRef.current) {
              setStatus("Negotiating stream...")
            }
          } catch {
            activePc = setupPeerConnection()
            streamConnectedRef.current = false
            setConnected(false)
            try {
              await activePc.setRemoteDescription(data.offer)
              const answer = await activePc.createAnswer()
              await activePc.setLocalDescription(answer)
              socket?.emit("webrtc_answer", { sessionId, answer })
              setStatus("Negotiating stream...")
            } catch {
              setStatus("Failed to negotiate stream")
            }
          }
        }
      )

      socket.on(
        "webrtc_answer",
        async (data: {
          sessionId?: string
          from: string
          answer: RTCSessionDescriptionInit
        }) => {
          if (data.from !== "device" || !activePc) return
          if (data.sessionId && data.sessionId !== sessionId) return
          if (!activePc.currentRemoteDescription) {
            await activePc.setRemoteDescription(data.answer)
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
          if (data.from === "device" && data.candidate && activePc) {
            if (data.sessionId && data.sessionId !== sessionId) return
            try {
              await activePc.addIceCandidate(data.candidate)
            } catch {
              /* ignore stale candidates */
            }
          }
        }
      )

      socket.on("session_end", () => {
        setStatus("Session ended")
        onDisconnect?.()
      })

      socket.on(
        "data_channel_message",
        (data: { from: string; message: unknown }) => {
          if (data.from === "device") {
            window.dispatchEvent(
              new CustomEvent("remote-agent-message", { detail: data.message })
            )
          }
        }
      )
    })()

    return () => {
      cancelled = true
      if (viewerReadyRetryRef.current) {
        clearTimeout(viewerReadyRetryRef.current)
      }
      socket?.disconnect()
      activePc?.close()
    }
  }, [sessionId, onDataChannel, onDisconnect])

  const handlePointer = (e: React.MouseEvent<HTMLVideoElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    sendInput({
      type: "mouse",
      event: e.type,
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
      button: e.button,
    })
  }

  const handleKey = (e: React.KeyboardEvent) => {
    e.preventDefault()
    sendInput({
      type: "keyboard",
      event: e.type,
      key: e.key,
      code: e.code,
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{status}</p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => videoRef.current?.requestFullscreen()}
        >
          Fullscreen
        </Button>
      </div>
      <div className="overflow-hidden rounded-lg border bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`aspect-video w-full outline-none ${
            viewOnly ? "cursor-default" : "cursor-crosshair"
          }`}
          onMouseMove={viewOnly ? undefined : handlePointer}
          onMouseDown={viewOnly ? undefined : handlePointer}
          onMouseUp={viewOnly ? undefined : handlePointer}
          onKeyDown={viewOnly ? undefined : handleKey}
          onKeyUp={viewOnly ? undefined : handleKey}
          tabIndex={viewOnly ? -1 : 0}
        />
      </div>
      {!connected && !viewOnly && (
        <p className="text-xs text-muted-foreground">
          Click the video area to focus for keyboard input once connected.
        </p>
      )}
      {viewOnly && connected && (
        <p className="text-xs text-muted-foreground">
          View-only session — remote control is not available for browser
          devices.
        </p>
      )}
      {viewOnly && !connected && status.includes("Waiting") && (
        <p className="text-xs text-muted-foreground">
          If the screen stays blank, ask the user to keep the connect tab open
          and sharing their screen.
        </p>
      )}
    </div>
  )
}
