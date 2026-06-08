"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  apiFetch,
  deleteEnrollmentLink,
  deleteEnrollmentLinks,
  deleteExpiredEnrollmentLinks,
  type EnrollmentLink,
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

export default function LinksView() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<LinkFilter>("all")
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
    mutationFn: () =>
      apiFetch<EnrollmentLink>("/enrollment-links", { method: "POST" }),
    onSuccess: (link) => {
      invalidate()
      if (link.url) {
        void navigator.clipboard.writeText(link.url)
        showNotification({
          type: "success",
          message: "Link created and copied to clipboard",
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
            One-time links for users to install the agent and grant persistent
            access
          </p>
        </div>
        <Button
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
        >
          Generate new link
        </Button>
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
          const baseUrl =
            process.env.NEXT_PUBLIC_ENROLL_BASE_URL ||
            "http://localhost:3001/enroll"
          const url = link.url || `${baseUrl}/${link.code}`
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
                    <p className="truncate font-mono text-sm">{url}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Expires {new Date(link.expiresAt).toLocaleString()}
                    {link.stats
                      ? ` · ${link.stats.uniqueOpenCount} opened · ${link.stats.uniqueDownloadCount} downloaded`
                      : ""}
                    {status === "used" && link.device
                      ? ` · Device: ${link.device.name}`
                      : ""}
                  </p>
                  {link.stats?.lastOpenedAt && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Last opened{" "}
                      {new Date(link.stats.lastOpenedAt).toLocaleString()}
                      {link.stats.lastDownloadAt
                        ? ` · Last download ${new Date(link.stats.lastDownloadAt).toLocaleString()}`
                        : ""}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyUrl(url)}
                >
                  Copy
                </Button>
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
