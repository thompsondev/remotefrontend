import { DashboardGuard } from "@/components/dashboard/DashboardGuard"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardGuard>{children}</DashboardGuard>
}
