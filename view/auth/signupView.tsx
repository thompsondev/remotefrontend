"use client"

import { useState } from "react"
import { cn } from "@/lib"
import { Button, Input } from "@heroui/react"
import { FaEye, FaEyeSlash, FaGithub } from "react-icons/fa"
import { FcGoogle } from "react-icons/fc"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import Link from "next/link"

const SignupView = ({ className, ...props }: React.ComponentProps<"div">) => {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isPasswordFocused, setIsPasswordFocused] = useState(false)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const hasMinLength = password.length >= 8
  const hasUppercase = /[A-Z]/.test(password)
  const hasLowercase = /[a-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword
  const hasConfirmPasswordMismatch =
    confirmPassword.length > 0 && password !== confirmPassword
  const hasInvalidPasswordInput =
    password.length > 0 &&
    (!hasMinLength || !hasUppercase || !hasLowercase || !hasNumber)
  const shouldShowPasswordRules =
    isPasswordFocused || hasInvalidPasswordInput || hasConfirmPasswordMismatch

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (!hasMinLength || !hasUppercase || !hasLowercase || !hasNumber) {
      event.preventDefault()
      setPasswordError(
        "Password must have at least 8 characters, uppercase, lowercase, and a number."
      )
      return
    }

    if (!passwordsMatch) {
      event.preventDefault()
      setPasswordError("Passwords do not match.")
      return
    }

    setPasswordError("")
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="bg-background p-1.5 py-8">
        <div className="pb-5">
          <h1 className="pb-2 text-2xl font-semibold">Create your account </h1>
          <p className="text-sm font-medium text-muted-foreground">
            this doesn&#39;t take long..
          </p>
        </div>
        <div className="pt-3">
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="firstName">First Name</FieldLabel>
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    placeholder="John"
                    className="h-9 w-full rounded-md"
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="lastName">Last Name</FieldLabel>
                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    placeholder="Doe"
                    className="h-9 w-full rounded-md"
                    required
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="m@example.com"
                  className="h-9 w-full rounded-md"
                  required
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <div className="relative w-full">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="********"
                      className="h-9 w-full rounded-md pr-9"
                      value={password}
                      onFocus={() => setIsPasswordFocused(true)}
                      onBlur={() => setIsPasswordFocused(false)}
                      onChange={(event) => {
                        setPassword(event.target.value)
                        if (passwordError) {
                          setPasswordError("")
                        }
                      }}
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
                <Field>
                  <FieldLabel htmlFor="confirmPassword">
                    Confirm Password
                  </FieldLabel>
                  <div className="relative w-full">
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="********"
                      className="h-9 w-full rounded-md pr-9"
                      value={confirmPassword}
                      onChange={(event) => {
                        setConfirmPassword(event.target.value)
                        if (passwordError) {
                          setPasswordError("")
                        }
                      }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={
                        showConfirmPassword
                          ? "Hide confirm password"
                          : "Show confirm password"
                      }
                    >
                      {showConfirmPassword ? (
                        <FaEyeSlash className="size-4" aria-hidden="true" />
                      ) : (
                        <FaEye className="size-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </Field>
              </div>
              {shouldShowPasswordRules ? (
                <div className="-mt-2 space-y-1 text-xs text-muted-foreground">
                  <p className={hasMinLength ? "text-emerald-600" : undefined}>
                    {hasMinLength ? "✓" : "•"} At least 8 characters
                  </p>
                  <p className={hasUppercase ? "text-emerald-600" : undefined}>
                    {hasUppercase ? "✓" : "•"} One uppercase letter
                  </p>
                  <p className={hasLowercase ? "text-emerald-600" : undefined}>
                    {hasLowercase ? "✓" : "•"} One lowercase letter
                  </p>
                  <p className={hasNumber ? "text-emerald-600" : undefined}>
                    {hasNumber ? "✓" : "•"} One number
                  </p>
                  <p className={passwordsMatch ? "text-emerald-600" : undefined}>
                    {passwordsMatch ? "✓" : "•"} Passwords match
                  </p>
                </div>
              ) : null}
              {passwordError ? (
                <p className="-mt-2 text-sm text-destructive">
                  {passwordError}
                </p>
              ) : null}
              <Field className="pb-4">
                <Button
                  type="submit"
                  className="rounded-md bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
                >
                  Create Account
                </Button>
              </Field>
              <FieldSeparator>or</FieldSeparator>
              <Field className="pt-4">
                <Button variant="outline" type="button" className="rounded-md">
                  <FcGoogle className="size-4" aria-hidden="true" />
                  Continue with Google
                </Button>
                <Button variant="outline" type="button" className="rounded-md">
                  <FaGithub
                    className="size-4 text-black dark:text-white"
                    aria-hidden="true"
                  />
                  Continue with GitHub
                </Button>
              </Field>
              <p className="pt-2 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
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

export default SignupView
