"use client"

import Link from "next/link"
import Image from "next/image"

const NotFound = () => {
  const handleGoBack = () => {
    if (typeof window === "undefined") {
      return
    }

    if (window.history.length > 1) {
      window.history.back()
      return
    }

    window.location.href = "/"
  }

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
      <div className="flex w-full max-w-md flex-col items-center gap-8 text-center">
        <div className="relative flex flex-col items-center">
          <p
            aria-hidden="true"
            className="bg-linear-to-b from-foreground to-muted-foreground/30 bg-clip-text text-[8rem] leading-none font-extrabold tracking-tight text-transparent select-none md:text-[10rem]"
          >
            404
          </p>
          <span className="absolute -bottom-2 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            Page not found
          </span>
        </div>
        <div className="space-y-2">
          <p className="max-w-xs text-sm text-muted-foreground">
            The page you are looking for doesn&apos;t exist <br />
            or may have been moved.
          </p>
        </div>
        <div className="flex w-full max-w-xs flex-col gap-3">
          <Link
            href="#"
            onClick={handleGoBack}
            className="text-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground hover:underline"
          >
            Go Back
          </Link>
        </div>
      </div>
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

export default NotFound
