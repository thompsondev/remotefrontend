import { Geist, Geist_Mono, Manrope } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib"
import { Metadata, Viewport } from "next"
import { Toaster } from "sonner"

const manropeHeading = Manrope({
  subsets: ["latin"],
  variable: "--font-heading",
})

export const metadata: Metadata = {
  title: {
    default: process.env.NEXT_PUBLIC_APP_NAME || "Application Name",
    template: `%s - ${process.env.NEXT_PUBLIC_APP_NAME}`,
  },
  description:
    process.env.NEXT_PUBLIC_APP_DESCRIPTION || "Application Description",
}

export const viewport: Viewport = {
  themeColor: [
    {
      media: "(prefers-color-scheme: light)",
      color: process.env.NEXT_PUBLIC_APP_THEME || "#000000",
    },
    {
      media: "(prefers-color-scheme: dark)",
      color: process.env.NEXT_PUBLIC_APP_THEME || "#ffffff",
    },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        geist.variable,
        manropeHeading.variable
      )}
    >
      <body className="scroll-smooth bg-background">
        <ThemeProvider>{children}</ThemeProvider>
        <Toaster position="top-right" richColors expand={false} />
      </body>
    </html>
  )
}
