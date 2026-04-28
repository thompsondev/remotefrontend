import { toast } from "sonner"

type ToastType = "success" | "error" | "info" | "warning"
type ToastPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "top-center"
  | "bottom-center"

interface ToastOptions {
  type: ToastType
  message: string
  duration?: number // Optional duration in milliseconds
  position?: ToastPosition
}

const DEFAULT_DURATION_MS = 2000
const ERROR_DURATION_MS = 6500

function trimPublicEnv(value: string | undefined): string {
  if (value == null) return ""
  return value.trim().replace(/^["']|["']$/g, "")
}

/** Normalize bare 3/6-digit hex so contrast + CSS parsing behave consistently. */
function normalizeCssColor(value: string): string {
  const v = value.trim()
  if (!v) return ""
  if (/^[0-9a-fA-F]{6}$/.test(v) || /^[0-9a-fA-F]{3}$/.test(v)) return `#${v}`
  return v
}

const APP_THEME_BACKGROUND = normalizeCssColor(
  trimPublicEnv(process.env.NEXT_PUBLIC_APP_THEME)
)
const APP_THEME_TEXT = trimPublicEnv(process.env.NEXT_PUBLIC_APP_THEME_TEXT)

function hexToSrgb(hex: string): { r: number; g: number; b: number } | null {
  let h = hex.trim().replace(/^#/, "")
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("")
  }
  if (h.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(h)) return null
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

/** Dark or light foreground for WCAG-style contrast on a solid hex background. */
function contrastTextOnHex(backgroundHex: string): string {
  const rgb = hexToSrgb(backgroundHex)
  if (!rgb) return "#ffffff"
  const linear = [rgb.r, rgb.g, rgb.b].map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  const L = 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!
  return L > 0.45 ? "#171717" : "#fafafa"
}

export const showToast = ({
  type,
  message,
  duration,
  position = "top-right",
}: ToastOptions) => {
  const resolvedDuration =
    duration !== undefined
      ? duration
      : type === "error"
        ? ERROR_DURATION_MS
        : DEFAULT_DURATION_MS

  const successUsesThemeBackground = Boolean(APP_THEME_BACKGROUND)

  const baseStyle = {
    color: "#fff",
  }

  // Define background colors for each type
  const backgroundColors: Record<ToastType, string> = {
    success: "#4CAF50", // Fallback when NEXT_PUBLIC_APP_THEME is unset
    error: "#FF5722", // Error color (red)
    info: "#2196F3", // Info color (blue)
    warning: "#FFC107", // Warning color (yellow-orange)
  }

  // Call the appropriate toast function based on the type with the duration and position
  switch (type) {
    case "success": {
      const successColor = successUsesThemeBackground
        ? APP_THEME_TEXT || contrastTextOnHex(APP_THEME_BACKGROUND)
        : baseStyle.color
      const successBackground = successUsesThemeBackground
        ? APP_THEME_BACKGROUND
        : backgroundColors.success
      toast.success(message, {
        duration: resolvedDuration,
        // Sonner's global `richColors` uses `--success-bg` (soft green). Turn off for this toast
        // so NEXT_PUBLIC_APP_THEME lime (or our fallback) always wins.
        richColors: false,
        style: {
          ...baseStyle,
          color: successColor,
          borderColor: "transparent",
          // Use `background` so we override Sonner's default / themed success surface.
          background: successBackground,
        },
        position,
      })
      break
    }
    case "error":
      toast.error(message, {
        duration: resolvedDuration,
        style: {
          ...baseStyle,
          backgroundColor: backgroundColors.error,
        },
        position,
      })
      break
    case "info":
      toast(message, {
        duration: resolvedDuration,
        style: {
          ...baseStyle,
          backgroundColor: backgroundColors.info,
        },
        position,
      })
      break
    case "warning":
      toast(message, {
        duration: resolvedDuration,
        style: {
          ...baseStyle,
          backgroundColor: backgroundColors.warning,
        },
        position,
      })
      break
    default:
      console.warn("Invalid toast type")
  }
}

/** App-facing name for the same toast helper as `showToast`. */
export const showNotification = showToast
