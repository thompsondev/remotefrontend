"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button, Input } from "@heroui/react"
import { FaEye, FaEyeSlash } from "react-icons/fa"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import Link from "next/link"
import { loginAdmin, setAdminToken } from "@/lib/api"
import { showNotification } from "@/lib/showNotification"

const LoginView = ({ className, ...props }: React.ComponentProps<"div">) => {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await loginAdmin({ email, password })
      setAdminToken(result.token)
      showNotification({ type: "success", message: "Welcome back" })
      router.push("/dashboard")
    } catch (err) {
      showNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Login failed",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="bg-background p-1.5 py-8">
        <div className="pb-5">
          <h1 className="pb-2 text-2xl font-semibold">Welcome back</h1>
          <p className="text-sm font-medium text-muted-foreground">
            Sign in to the remote admin dashboard
          </p>
        </div>
        <div className="pt-3">
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  className="h-9 w-full rounded-md"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <div className="relative w-full">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="********"
                    className="h-9 w-full rounded-md pr-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <FaEyeSlash className="size-4" aria-hidden="true" />
                    ) : (
                      <FaEye className="size-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </Field>
              <Field className="pb-4">
                <Button
                  type="submit"
                  className="rounded-md bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
                  isDisabled={loading}
                >
                  {loading ? "Signing in..." : "Login"}
                </Button>
              </Field>
              <p className="pt-2 text-center text-sm text-muted-foreground">
                Default: admin@example.com / admin123
              </p>
            </FieldGroup>
          </form>
        </div>
      </div>
    </div>
  )
}

export default LoginView
