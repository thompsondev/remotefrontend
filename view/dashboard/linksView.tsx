"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  apiFetch,
  createEnrollmentLink,
  deleteEnrollmentLink,
  deleteEnrollmentLinks,
  deleteExpiredEnrollmentLinks,
  type EnrollmentLink,
  type EnrollmentLinkKind,
  type EnrollmentLinkStatus,
} from "@/lib/api"
import { showNotification } from "@/lib/showNotification"
import { cn } from "@/lib/utils"

type LinkFilter = "all" | EnrollmentLinkStatus

function linkStatus(link: EnrollmentLink): EnrollmentLinkStatus {
  if (link.status) return link.status
  if (link.usedAt) return "used"
  if (new Date(link.expiresAt) < new Date()) return "expired"
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
          "bg-amber-500/15 text-amber-700 dark:text-amber-400",
        status === "used" && "bg-sky-500/15 text-sky-700 dark:text-sky-400"
      )}
    >
      {status === "used"
        ? "Enrolled"
        : status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

const LINK_KINDS: { value: EnrollmentLinkKind; label: string; hint: string }[] =
  [
    {
      value: "INSTANT",
      label: "Instant connect",
      hint: "Browser — no install (v2)",
    },
    {
      value: "AGENT",
      label: "Windows agent",
      hint: "Download & install (v1)",
    },
    {
      value: "BOTH",
      label: "Both options",
      hint: "Instant + agent links",
    },
  ]

export default function LinksView() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<LinkFilter>("all")
  const [linkKind, setLinkKind] = useState<EnrollmentLinkKind>("INSTANT")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const { data: links = [], isLoading } = useQuery({
    queryKey: ["enrollment-links"],
    queryFn: () => apiFetch<EnrollmentLink[]>("/enrollment-links"),
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
      const copyUrl = link.instantUrl || link.url
      if (copyUrl) {
        void navigator.clipboard.writeText(copyUrl)
        showNotification({
          type: "success",
          message: "Instant connect link copied to clipboard",
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
    if (window.confirm("Delete this enrollment link?")) {
      deleteOneMutation.mutate(id)
    }
  }

  function confirmDeleteSelected() {
    if (!selectedIds.size) return
    if (
      window.confirm(`Delete ${selectedIds.size} selected enrollment link(s)?`)
    ) {
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
    { key: "used", label: "Enrolled" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Enrollment links</h1>
          <p className="text-sm text-muted-foreground">
            Share instant connect links (v2) or agent install links (v1)
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
            Generate link
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
          return (
            <div
              key={link.id}
              className={cn(
                "flex flex-wrap items-center justify-between gap-4 p-4",
                status === "expired" && "bg-amber-500/5"
              )}
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedIds.has(link.id)}
                  onChange={() => toggleSelected(link.id)}
                  className="mt-1 size-4 rounded border-border"
                  aria-label={`Select link ${link.code}`}
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={status} />
                    {link.kind && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {link.kind === "INSTANT"
                          ? "Instant"
                          : link.kind === "AGENT"
                            ? "Agent"
                            : "Both"}
                      </span>
                    )}
                    <p className="truncate font-mono text-sm">{primaryUrl}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Expires {new Date(link.expiresAt).toLocaleString()}
                    {link.stats
                      ? ` · ${link.stats.uniqueOpenCount} opened · ${link.stats.uniqueConnectCount} connected · ${link.stats.uniqueDownloadCount} downloaded`
                      : ""}
                    {status === "used" && link.device
                      ? ` · ${link.device.deviceType === "BROWSER" ? "Instant" : "Agent"}: ${link.device.name}`
                      : ""}
                  </p>
                  {link.kind !== "AGENT" && (
                    <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                      Instant: {instantUrl}
                    </p>
                  )}
                  {link.kind !== "INSTANT" && (
                    <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                      Agent: {agentUrl}
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
                          `${link.stats.lastOpenedAt != null ? " · " : ""}Last connected ${new Date(link.stats.lastConnectedAt).toLocaleString()}`}
                        {link.stats.lastDownloadAt != null &&
                          `${link.stats.lastOpenedAt != null || link.stats.lastConnectedAt != null ? " · " : ""}Last download ${new Date(link.stats.lastDownloadAt).toLocaleString()}`}
                      </p>
                    )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
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
                    Copy agent
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
          )
        })}
      </Card>
    </div>
  )
}
