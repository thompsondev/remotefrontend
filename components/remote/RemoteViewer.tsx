"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { io, Socket } from "socket.io-client"
import { getAdminToken } from "@/lib/api"
import { getWsUrl, ICE_SERVERS } from "@/lib/webrtc"
import { Button } from "@/components/ui/button"

type RemoteViewerProps = {
  sessionId: string
  onDataChannel?: (dc: RTCDataChannel) => void
  onDisconnect?: () => void
}

export function RemoteViewer({
  sessionId,
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

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    pcRef.current = pc

    pc.ontrack = (event) => {
      if (videoRef.current && event.streams[0]) {
        videoRef.current.srcObject = event.streams[0]
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
        ;(pc as RTCPeerConnection & { controlDc?: RTCDataChannel }).controlDc =
          event.channel
      }
      onDataChannel?.(event.channel)
    }

    socket.on("connect", () => {
      socket.emit("join_session", { sessionId })
      setStatus("Waiting for device stream...")
    })

    socket.on(
      "webrtc_offer",
      async (data: { from: string; offer: RTCSessionDescriptionInit }) => {
        if (data.from !== "device") return
        await pc.setRemoteDescription(data.offer)
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        socket.emit("webrtc_answer", { sessionId, answer })
      }
    )

    socket.on(
      "webrtc_answer",
      async (data: { from: string; answer: RTCSessionDescriptionInit }) => {
        if (data.from !== "device") return
        if (!pc.currentRemoteDescription) {
          await pc.setRemoteDescription(data.answer)
        }
      }
    )

    socket.on(
      "webrtc_ice",
      async (data: { from: string; candidate: RTCIceCandidateInit }) => {
        if (data.from === "device" && data.candidate) {
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
          className="aspect-video w-full cursor-crosshair outline-none"
          onMouseMove={handlePointer}
          onMouseDown={handlePointer}
          onMouseUp={handlePointer}
          onKeyDown={handleKey}
          onKeyUp={handleKey}
          tabIndex={0}
        />
      </div>
      {!connected && (
        <p className="text-xs text-muted-foreground">
          Click the video area to focus for keyboard input once connected.
        </p>
      )}
    </div>
  )
}
