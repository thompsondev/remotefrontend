export const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
]

export function getWsUrl() {
  return (
    process.env.NEXT_PUBLIC_WS_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  )
}
