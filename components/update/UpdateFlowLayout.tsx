import type { ReactNode } from "react"

type UpdateFlowLayoutProps = {
  title: string
  subtitle?: string
  children: ReactNode
}

export function UpdateFlowLayout({
  title,
  subtitle,
  children,
}: UpdateFlowLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#ececec] p-6">
      <div className="w-full max-w-lg overflow-hidden rounded-md border border-[#c8c8c8] bg-white shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
        <div className="bg-[#0078d4] px-6 py-5 text-white">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-white/80 uppercase">
            Software Update
          </p>
          <h1 className="mt-1 text-xl leading-tight font-semibold">{title}</h1>
          {subtitle ? (
            <p className="mt-2 text-sm leading-relaxed text-white/90">
              {subtitle}
            </p>
          ) : null}
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

export function UpdateProgressBar({ active }: { active?: boolean }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#e5e5e5]">
      <div
        className={`h-full rounded-full bg-[#0078d4] ${
          active ? "w-2/3 animate-pulse" : "w-full"
        }`}
      />
    </div>
  )
}
