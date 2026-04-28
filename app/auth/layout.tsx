import React from "react"
import Link from "next/link"
import Image from "next/image"

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="fixed inset-x-0 top-0 z-10 md:inset-x-auto md:top-8 md:left-28">
        <div className="mx-auto w-full max-w-sm px-1 pt-4 md:max-w-none md:p-0">
          <Link href="/" aria-label="Go to homepage">
            <Image
              src="/images/logo.svg"
              alt="App logo"
              width={120}
              height={32}
              className="dark:invert"
            />
          </Link>
        </div>
      </div>
      <div className="flex w-full max-w-sm flex-col gap-6">{children}</div>
      <p className="fixed right-0 bottom-8 left-0 mx-auto w-full max-w-sm px-6 text-center text-xs text-muted-foreground">
        By continuing, you agree to our{" "}
        <Link
          href={process.env.NEXT_PUBLIC_TERMS_URL || ""}
          className="font-medium text-foreground no-underline hover:text-primary"
        >
          terms
        </Link>{" "}
        and{" "}
        <Link
          href={process.env.NEXT_PUBLIC_PRIVACY_URL || ""}
          className="font-medium text-foreground no-underline hover:text-primary"
        >
          privacy
        </Link>
        .
      </p>
    </div>
  )
}

export default AuthLayout
