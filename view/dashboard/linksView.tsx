"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { apiFetch, type EnrollmentLink } from "@/lib/api"
import { showNotification } from "@/lib/showNotification"

export default function LinksView() {
  const queryClient = useQueryClient()

  const { data: links = [], isLoading } = useQuery({
    queryKey: ["enrollment-links"],
    queryFn: () => apiFetch<EnrollmentLink[]>("/enrollment-links"),
  })

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch<EnrollmentLink>("/enrollment-links", { method: "POST" }),
    onSuccess: (link) => {
      void queryClient.invalidateQueries({ queryKey: ["enrollment-links"] })
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

  async function copyUrl(url: string) {
    await navigator.clipboard.writeText(url)
    showNotification({ type: "info", message: "Link copied" })
  }

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

      <Card className="divide-y">
        {isLoading && (
          <p className="p-6 text-sm text-muted-foreground">Loading links...</p>
        )}
        {!isLoading && links.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground">No links yet.</p>
        )}
        {links.map((link) => {
          const used = !!link.usedAt
          const expired = new Date(link.expiresAt) < new Date()
          const baseUrl =
            process.env.NEXT_PUBLIC_ENROLL_BASE_URL ||
            "http://localhost:3001/enroll"
          const url = link.url || `${baseUrl}/${link.code}`
          return (
            <div
              key={link.id}
              className="flex flex-wrap items-center justify-between gap-4 p-4"
            >
              <div>
                <p className="font-mono text-sm">{url}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Expires {new Date(link.expiresAt).toLocaleString()}
                  {used && link.device
                    ? ` · Used by ${link.device.name}`
                    : used
                      ? " · Used"
                      : expired
                        ? " · Expired"
                        : " · Active"}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => copyUrl(url)}>
                Copy
              </Button>
            </div>
          )
        })}
      </Card>
    </div>
  )
}
