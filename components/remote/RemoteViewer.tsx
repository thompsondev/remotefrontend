"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { io, Socket } from "socket.io-client"
import { getAdminToken } from "@/lib/api"
import { getWsUrl, ICE_SERVERS } from "@/lib/webrtc"
import { Button } from "@/components/ui/button"

type RemoteViewerProps = {
  sessionId: string
  viewOnly?: boolean
  onDataChannel?: (dc: RTCDataChannel) => void
  onDisconnect?: () => void
}

export function RemoteViewer({
  sessionId,
  viewOnly = false,
  onDataChannel,
  onDisconnect,
}: RemoteViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const socketRef = useRef<Socket | null>(null)
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

    const socket = io(`${getWsUrl()}/signaling`, {
      auth: { role: "admin", token },
      transports: ["websocket"],
    })
    socketRef.current = socket

    const setupPeerConnection = () => {
      if (pcRef.current) {
        pcRef.current.close()
      }

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
      pcRef.current = pc

      pc.ontrack = (event) => {
        if (videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0]
          void videoRef.current.play().catch(() => {
            /* autoplay may require user gesture */
          })
          setConnected(true)
          setStatus("Connected")
        }
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("webrtc_ice", {
            sessionId,
            candidate: event.candidate.toJSON(),
          })
        }
      }

      pc.ondatachannel = (event) => {
        if (event.channel.label === "control") {
          ;(
            pc as RTCPeerConnection & { controlDc?: RTCDataChannel }
          ).controlDc = event.channel
        }
        onDataChannel?.(event.channel)
      }

      return pc
    }

    let pc = setupPeerConnection()

    const notifyViewerReady = () => {
      socket.emit("join_session", { sessionId })
      socket.emit("viewer_ready", { sessionId })
    }

    socket.on("connect", () => {
      notifyViewerReady()
      setStatus("Waiting for device stream...")
      window.setTimeout(notifyViewerReady, 800)
      window.setTimeout(notifyViewerReady, 2000)
    })

    socket.on(
      "webrtc_offer",
      async (data: {
        sessionId?: string
        from: string
        offer: RTCSessionDescriptionInit
      }) => {
        if (data.from !== "device") return
        if (data.sessionId && data.sessionId !== sessionId) return

        if (pc.signalingState !== "stable") {
          pc = setupPeerConnection()
        }

        await pc.setRemoteDescription(data.offer)
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        socket.emit("webrtc_answer", { sessionId, answer })
        setStatus("Negotiating stream...")
      }
    )

    socket.on(
      "webrtc_answer",
      async (data: {
        sessionId?: string
        from: string
        answer: RTCSessionDescriptionInit
      }) => {
        if (data.from !== "device") return
        if (data.sessionId && data.sessionId !== sessionId) return
        if (!pc.currentRemoteDescription) {
          await pc.setRemoteDescription(data.answer)
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
        if (data.from === "device" && data.candidate) {
          if (data.sessionId && data.sessionId !== sessionId) return
          try {
            await pc.addIceCandidate(data.candidate)
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

    return () => {
      socket.disconnect()
      pc.close()
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
