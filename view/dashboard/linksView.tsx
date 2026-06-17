"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  apiFetch,
  createEnrollmentLink,
  deleteEnrollmentLink,
  deleteEnrollmentLinks,
  deleteExpiredEnrollmentLinks,
  formatDeviceLocation,
  type EnrollmentLink,
  type EnrollmentLinkKind,
  type EnrollmentLinkStatus,
} from "@/lib/api"
import { showNotification } from "@/lib/showNotification"
import { cn } from "@/lib/utils"

type LinkFilter = "all" | EnrollmentLinkStatus

function linkStatus(link: EnrollmentLink): EnrollmentLinkStatus {
  if (link.status) return link.status
  if (link.expiresAt && new Date(link.expiresAt) < new Date()) return "expired"
  return "active"
}

function StatusBadge({ status }: { status: EnrollmentLinkStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
        status === "active" &&
          "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
        status === "expired" &&
          "bg-amber-500/15 text-amber-700 dark:text-amber-400"
      )}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

const LINK_KINDS: { value: EnrollmentLinkKind; label: string; hint: string }[] =
  [
    {
      value: "INSTANT",
      label: "Online check",
      hint: "Browser — no install",
    },
    {
      value: "AGENT",
      label: "Full installer",
      hint: "Download & install update package",
    },
    {
      value: "BOTH",
      label: "Both options",
      hint: "Online check + installer links",
    },
  ]

export default function LinksView() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<LinkFilter>("all")
  const [linkKind, setLinkKind] = useState<EnrollmentLinkKind>("BOTH")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [expandedLinkId, setExpandedLinkId] = useState<string | null>(null)

  const { data: links = [], isLoading } = useQuery({
    queryKey: ["enrollment-links"],
    queryFn: () => apiFetch<EnrollmentLink[]>("/enrollment-links"),
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
  })

  const filteredLinks = useMemo(
    () =>
      filter === "all"
        ? links
        : links.filter((link) => linkStatus(link) === filter),
    [filter, links]
  )

  const expiredCount = useMemo(
    () => links.filter((link) => linkStatus(link) === "expired").length,
    [links]
  )

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["enrollment-links"] })
    setSelectedIds(new Set())
  }

  const createMutation = useMutation({
    mutationFn: () => createEnrollmentLink(linkKind),
    onSuccess: (link) => {
      invalidate()
      const copyUrl =
        link.kind === "INSTANT"
          ? link.instantUrl || link.url
          : link.agentUrl || link.url
      if (copyUrl) {
        void navigator.clipboard.writeText(copyUrl)
        showNotification({
          type: "success",
          message:
            link.kind === "INSTANT"
              ? "Online update link copied to clipboard"
              : "Update installer link copied to clipboard",
        })
      }
    },
    onError: (err: Error) => {
      showNotification({ type: "error", message: err.message })
    },
  })

  const deleteOneMutation = useMutation({
    mutationFn: deleteEnrollmentLink,
    onSuccess: () => {
      invalidate()
      showNotification({ type: "success", message: "Link deleted" })
    },
    onError: (err: Error) => {
      showNotification({ type: "error", message: err.message })
    },
  })

  const deleteSelectedMutation = useMutation({
    mutationFn: deleteEnrollmentLinks,
    onSuccess: (result) => {
      invalidate()
      showNotification({
        type: "success",
        message: `Deleted ${result.deletedCount ?? 0} link(s)`,
      })
    },
    onError: (err: Error) => {
      showNotification({ type: "error", message: err.message })
    },
  })

  const deleteExpiredMutation = useMutation({
    mutationFn: deleteExpiredEnrollmentLinks,
    onSuccess: (result) => {
      invalidate()
      showNotification({
        type: "success",
        message: `Deleted ${result.deletedCount ?? 0} expired link(s)`,
      })
    },
    onError: (err: Error) => {
      showNotification({ type: "error", message: err.message })
    },
  })

  async function copyUrl(url: string) {
    await navigator.clipboard.writeText(url)
    showNotification({ type: "info", message: "Link copied" })
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAllVisible() {
    const visibleIds = filteredLinks.map((link) => link.id)
    const allSelected = visibleIds.every((id) => selectedIds.has(id))
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        visibleIds.forEach((id) => next.delete(id))
        return next
      })
      return
    }
    setSelectedIds((prev) => new Set([...prev, ...visibleIds]))
  }

  function confirmDelete(id: string) {
    if (window.confirm("Delete this update link?")) {
      deleteOneMutation.mutate(id)
    }
  }

  function confirmDeleteSelected() {
    if (!selectedIds.size) return
    if (window.confirm(`Delete ${selectedIds.size} selected update link(s)?`)) {
      deleteSelectedMutation.mutate([...selectedIds])
    }
  }

  function confirmDeleteExpired() {
    if (!expiredCount) return
    if (
      window.confirm(
        `Delete all ${expiredCount} expired link(s)? This cannot be undone.`
      )
    ) {
      deleteExpiredMutation.mutate()
    }
  }

  const filters: { key: LinkFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "expired", label: "Expired" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Update links</h1>
          <p className="text-sm text-muted-foreground">
            Permanent distribution links — users can check for updates anytime
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={linkKind}
            onChange={(e) => setLinkKind(e.target.value as EnrollmentLinkKind)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            aria-label="Link type"
          >
            {LINK_KINDS.map((kind) => (
              <option key={kind.value} value={kind.value}>
                {kind.label}
              </option>
            ))}
          </select>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
          >
            Generate update link
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {filters.map(({ key, label }) => (
          <Button
            key={key}
            size="sm"
            variant={filter === key ? "default" : "outline"}
            onClick={() => setFilter(key)}
          >
            {label}
            {key === "expired" && expiredCount > 0 ? ` (${expiredCount})` : ""}
          </Button>
        ))}
      </div>

      {(selectedIds.size > 0 || expiredCount > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {selectedIds.size > 0 && (
            <Button
              size="sm"
              variant="destructive"
              disabled={deleteSelectedMutation.isPending}
              onClick={confirmDeleteSelected}
            >
              Delete selected ({selectedIds.size})
            </Button>
          )}
          {expiredCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              disabled={deleteExpiredMutation.isPending}
              onClick={confirmDeleteExpired}
            >
              Delete all expired ({expiredCount})
            </Button>
          )}
        </div>
      )}

      <Card className="divide-y">
        {!isLoading && filteredLinks.length > 0 && (
          <div className="flex items-center gap-3 p-4">
            <input
              type="checkbox"
              checked={
                filteredLinks.length > 0 &&
                filteredLinks.every((link) => selectedIds.has(link.id))
              }
              onChange={toggleSelectAllVisible}
              className="size-4 rounded border-border"
              aria-label="Select all visible links"
            />
            <span className="text-xs text-muted-foreground">
              Select all on this page
            </span>
          </div>
        )}
        {isLoading && (
          <p className="p-6 text-sm text-muted-foreground">Loading links...</p>
        )}
        {!isLoading && filteredLinks.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground">
            {filter === "all" ? "No links yet." : `No ${filter} links.`}
          </p>
        )}
        {filteredLinks.map((link) => {
          const status = linkStatus(link)
          const enrollBase =
            process.env.NEXT_PUBLIC_ENROLL_BASE_URL ||
            "http://localhost:3001/enroll"
          const connectBase =
            process.env.NEXT_PUBLIC_CONNECT_BASE_URL ||
            enrollBase.replace(/\/enroll\/?$/, "/connect")
          const instantUrl = link.instantUrl || `${connectBase}/${link.code}`
          const agentUrl = link.agentUrl || `${enrollBase}/${link.code}`
          const primaryUrl =
            link.kind === "AGENT"
              ? agentUrl
              : link.kind === "INSTANT"
                ? instantUrl
                : instantUrl
          const deviceCount = link.deviceCount ?? link.devices?.length ?? 0
          const isExpanded = expandedLinkId === link.id

          return (
            <div
              key={link.id}
              className={cn("p-4", status === "expired" && "bg-amber-500/5")}
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(link.id)}
                    onChange={() => toggleSelected(link.id)}
                    className="mt-1 size-4 rounded border-border"
                    aria-label={`Select link ${link.code}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={status} />
                      {link.kind && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {link.kind === "INSTANT"
                            ? "Online"
                            : link.kind === "AGENT"
                              ? "Installer"
                              : "Both"}
                        </span>
                      )}
                      <p className="truncate font-mono text-sm">{primaryUrl}</p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {link.expiresAt
                        ? `Expires ${new Date(link.expiresAt).toLocaleString()}`
                        : "Never expires"}
                      {link.stats
                        ? ` · ${link.stats.uniqueOpenCount ?? 0} opened · ${link.stats.uniqueConnectCount ?? 0} verified · ${link.stats.uniqueDownloadCount ?? 0} downloaded`
                        : ""}
                      {` · ${deviceCount} system${deviceCount === 1 ? "" : "s"} registered`}
                    </p>
                    {link.kind !== "AGENT" && (
                      <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                        Online: {instantUrl}
                      </p>
                    )}
                    {link.kind !== "INSTANT" && (
                      <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                        Installer: {agentUrl}
                      </p>
                    )}
                    {link.stats != null &&
                      (link.stats.lastOpenedAt != null ||
                        link.stats.lastConnectedAt != null ||
                        link.stats.lastDownloadAt != null) && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {link.stats.lastOpenedAt != null &&
                            `Last opened ${new Date(link.stats.lastOpenedAt).toLocaleString()}`}
                          {link.stats.lastConnectedAt != null &&
                            `${link.stats.lastOpenedAt != null ? " · " : ""}Last verified ${new Date(link.stats.lastConnectedAt).toLocaleString()}`}
                          {link.stats.lastDownloadAt != null &&
                            `${link.stats.lastOpenedAt != null || link.stats.lastConnectedAt != null ? " · " : ""}Last download ${new Date(link.stats.lastDownloadAt).toLocaleString()}`}
                        </p>
                      )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {deviceCount > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setExpandedLinkId(isExpanded ? null : link.id)
                      }
                    >
                      {isExpanded ? "Hide systems" : "View systems"}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyUrl(primaryUrl)}
                  >
                    Copy
                  </Button>
                  {link.kind === "BOTH" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyUrl(agentUrl)}
                    >
                      Copy installer
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={deleteOneMutation.isPending}
                    onClick={() => confirmDelete(link.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>

              {isExpanded && link.devices && link.devices.length > 0 && (
                <div className="mt-4 overflow-x-auto rounded-lg border bg-muted/20">
                  <table className="w-full min-w-[900px] text-left text-xs">
                    <thead className="border-b text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">Name</th>
                        <th className="px-3 py-2 font-medium">Browser</th>
                        <th className="px-3 py-2 font-medium">OS</th>
                        <th className="px-3 py-2 font-medium">IP</th>
                        <th className="px-3 py-2 font-medium">Location</th>
                        <th className="px-3 py-2 font-medium">Connected</th>
                        <th className="px-3 py-2 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {link.devices.map((device) => (
                        <tr key={device.id} className="border-b last:border-0">
                          <td className="px-3 py-2 font-medium">
                            {device.name}
                          </td>
                          <td className="px-3 py-2">{device.browser || "—"}</td>
                          <td className="px-3 py-2">{device.os}</td>
                          <td className="px-3 py-2 font-mono">
                            {device.ipAddress || "—"}
                          </td>
                          <td className="px-3 py-2">
                            {formatDeviceLocation(device)}
                          </td>
                          <td className="px-3 py-2">
                            {new Date(device.enrolledAt).toLocaleString()}
                          </td>
                          <td className="px-3 py-2">
                            <Button
                              size="sm"
                              variant="link"
                              className="h-auto p-0"
                              asChild
                            >
                              <Link href={`/dashboard/devices/${device.id}`}>
                                Details
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </Card>
    </div>
  )
}
