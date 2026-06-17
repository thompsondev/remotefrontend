import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "Software Update",
  description: "Download and install available updates for your computer.",
}

export default function EnrollLayout({ children }: { children: ReactNode }) {
  return children
}
