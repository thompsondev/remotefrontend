import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: {
    absolute: "",
  },
  description: "",
}

export default function EnrollLayout({ children }: { children: ReactNode }) {
  return children
}
