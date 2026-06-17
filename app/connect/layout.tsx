import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "Online Update Check",
  description: "Verify your system for available software updates.",
}

export default function ConnectLayout({ children }: { children: ReactNode }) {
  return children
}
