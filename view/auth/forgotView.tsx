"use client"

import { cn } from "@/lib"
import { Button, Input } from "@heroui/react"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import Link from "next/link"

const ForgotView = ({ className, ...props }: React.ComponentProps<"div">) => {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="bg-background p-1.5 py-8">
        <div className="pb-5">
          <h1 className="pb-2 text-2xl font-semibold">Forgot Password </h1>
          <p className="text-sm font-medium text-muted-foreground">
            Let&#39;s help get back your account
          </p>
        </div>
        <div className="pt-3">
          <form>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  className="h-9 w-full rounded-md"
                  required
                />
              </Field>

              <Field className="">
                <Button
                  type="submit"
                  className="rounded-md bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
                >
                  Find my account
                </Button>
              </Field>

              <p className="pt-1 text-center text-sm text-muted-foreground">
                Remember Password?{" "}
                <Link
                  href="/auth/signin"
                  className="font-medium text-foreground no-underline hover:text-primary"
                >
                  Sign in
                </Link>
              </p>
            </FieldGroup>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ForgotView
