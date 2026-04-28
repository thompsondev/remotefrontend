"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib"
import { Button, Input, InputOTP } from "@heroui/react"
import { FaEye, FaEyeSlash } from "react-icons/fa"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"

const RESEND_OTP_SECONDS = 60
const RESEND_OTP_STORAGE_KEY = "reset_resend_otp_expires_at"
const RESET_OTP_VALUE_STORAGE_KEY = "reset_password_otp_value"

const ResetView = ({ className, ...props }: React.ComponentProps<"div">) => {
  const [resendTimer, setResendTimer] = useState(RESEND_OTP_SECONDS)
  const [otpError, setOtpError] = useState("")
  const [isOtpStepComplete, setIsOtpStepComplete] = useState(() => {
    if (typeof window === "undefined") {
      return false
    }

    const savedOtpCode = window.localStorage.getItem(
      RESET_OTP_VALUE_STORAGE_KEY
    )
    return !!savedOtpCode && savedOtpCode.length === 6
  })
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

  useEffect(() => {
    const syncTimerFromStorage = () => {
      const storedExpiry = window.localStorage.getItem(RESEND_OTP_STORAGE_KEY)

      if (!storedExpiry) {
        const expiresAt = Date.now() + RESEND_OTP_SECONDS * 1000
        window.localStorage.setItem(RESEND_OTP_STORAGE_KEY, String(expiresAt))
        setResendTimer(RESEND_OTP_SECONDS)
        return
      }

      const expiresAt = Number(storedExpiry)
      const secondsLeft = Math.max(
        Math.ceil((expiresAt - Date.now()) / 1000),
        0
      )
      setResendTimer(secondsLeft)
    }

    const timeoutId = window.setTimeout(syncTimerFromStorage, 0)
    const intervalId = window.setInterval(() => {
      syncTimerFromStorage()
    }, 1000)

    return () => {
      window.clearTimeout(timeoutId)
      window.clearInterval(intervalId)
    }
  }, [])

  const handleResendOtp = () => {
    // Hook your resend API call here.
    const expiresAt = Date.now() + RESEND_OTP_SECONDS * 1000
    window.localStorage.setItem(RESEND_OTP_STORAGE_KEY, String(expiresAt))
    setResendTimer(RESEND_OTP_SECONDS)
  }

  const handleVerifyOtp = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const otpCode = String(formData.get("otp") ?? "").trim()

    if (otpCode.length !== 6) {
      setOtpError("Please enter the 6-digit OTP code.")
      return
    }

    window.localStorage.setItem(RESET_OTP_VALUE_STORAGE_KEY, otpCode)
    setOtpError("")
    setIsOtpStepComplete(true)
  }

  const handleGoToOtpStep = () => {
    setIsOtpStepComplete(false)
    setPassword("")
    setConfirmPassword("")
    setPasswordError("")
    setIsPasswordFocused(false)
    window.localStorage.removeItem(RESET_OTP_VALUE_STORAGE_KEY)
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const savedOtpCode = window.localStorage.getItem(
      RESET_OTP_VALUE_STORAGE_KEY
    )
    if (!savedOtpCode || savedOtpCode.length !== 6) {
      setPasswordError("OTP not found. Please verify OTP again.")
      setIsOtpStepComplete(false)
      return
    }

    if (!hasMinLength || !hasUppercase || !hasLowercase || !hasNumber) {
      setPasswordError(
        "Password must have at least 8 characters, uppercase, lowercase, and a number."
      )
      return
    }

    if (!passwordsMatch) {
      setPasswordError("Passwords do not match.")
      return
    }

    // Hook your reset password API call here.
    console.log("Reset password payload:", {
      otp: savedOtpCode,
      password,
      confirmPassword,
    })

    setPasswordError("")
  }

  return (
    <div
      className={cn("flex flex-col items-center gap-6", className)}
      {...props}
    >
      <div className="m-auto flex w-full max-w-sm flex-col items-center bg-background p-1.5 py-8 text-center">
        <div className="pb-5">
          <h1 className="pb-2 text-2xl font-semibold">Reset your account </h1>
          <p className="text-sm font-medium text-muted-foreground">
            we&#39;ve sent a mail to
          </p>
        </div>
        <div className="w-full pt-1">
          <form
            className="w-full"
            onSubmit={isOtpStepComplete ? handleSubmit : handleVerifyOtp}
          >
            <FieldGroup className="w-full items-center">
              {!isOtpStepComplete ? (
                <>
                  <Field className="items-center">
                    <div className="flex w-full justify-center">
                      <InputOTP
                        name="otp"
                        maxLength={6}
                        autoFocus
                        textAlign="center"
                      >
                        <InputOTP.Group>
                          <InputOTP.Slot index={0} className="rounded-md" />
                          <InputOTP.Slot index={1} className="rounded-md" />
                          <InputOTP.Slot index={2} className="rounded-md" />
                          <InputOTP.Slot index={3} className="rounded-md" />
                          <InputOTP.Slot index={4} className="rounded-md" />
                          <InputOTP.Slot index={5} className="rounded-md" />
                        </InputOTP.Group>
                      </InputOTP>
                    </div>
                  </Field>
                  <Field className="m-auto w-full items-center pb-4">
                    <Button
                      type="submit"
                      className="mx-auto w-full max-w-[70%] rounded-md bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
                    >
                      Verify OTP
                    </Button>
                    {otpError ? (
                      <p className="pt-3 text-sm text-destructive">{otpError}</p>
                    ) : null}
                    <p className="pt-4 text-sm text-muted-foreground">
                      {resendTimer > 0 ? (
                        <>Resend OTP in {resendTimer}s</>
                      ) : (
                        <>
                          Didn&apos;t receive code?{" "}
                          <button
                            type="button"
                            onClick={handleResendOtp}
                            className="cursor-pointer font-medium text-foreground hover:text-primary"
                          >
                            Resend OTP
                          </button>
                        </>
                      )}
                    </p>
                  </Field>
                </>
              ) : null}

              {isOtpStepComplete ? (
                <>
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
                  {shouldShowPasswordRules ? (
                    <div className="-mt-2 space-y-1 text-xs text-muted-foreground">
                      <p
                        className={
                          hasMinLength ? "text-emerald-600" : undefined
                        }
                      >
                        {hasMinLength ? "✓" : "•"} At least 8 characters
                      </p>
                      <p
                        className={
                          hasUppercase ? "text-emerald-600" : undefined
                        }
                      >
                        {hasUppercase ? "✓" : "•"} One uppercase letter
                      </p>
                      <p
                        className={
                          hasLowercase ? "text-emerald-600" : undefined
                        }
                      >
                        {hasLowercase ? "✓" : "•"} One lowercase letter
                      </p>
                      <p className={hasNumber ? "text-emerald-600" : undefined}>
                        {hasNumber ? "✓" : "•"} One number
                      </p>
                      <p
                        className={
                          passwordsMatch ? "text-emerald-600" : undefined
                        }
                      >
                        {passwordsMatch ? "✓" : "•"} Passwords match
                      </p>
                    </div>
                  ) : null}
                  {passwordError ? (
                    <p className="-mt-2 text-sm text-destructive">
                      {passwordError}
                    </p>
                  ) : null}

                  <Field className="m-auto w-full items-center pb-4">
                    <Button
                      type="submit"
                      className="w-full rounded-md bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
                    >
                      Reset Password
                    </Button>
                    <button
                      type="button"
                      onClick={handleGoToOtpStep}
                      className="cursor-pointer pt-3 text-sm font-medium text-muted-foreground hover:text-foreground"
                    >
                      Expired OTP? Get new OTP
                    </button>
                  </Field>
                </>
              ) : null}
            </FieldGroup>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ResetView
