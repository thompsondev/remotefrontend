"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

type FileEntry = {
  name: string
  path: string
  isDirectory: boolean
  size?: number
}

export function FileBrowser({ sessionId }: { sessionId: string }) {
  const [path, setPath] = useState("C:\\Users")
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [loading, setLoading] = useState(false)

  function requestList(targetPath: string) {
    setLoading(true)
    window.dispatchEvent(
      new CustomEvent("remote-admin-command", {
        detail: { type: "list_files", path: targetPath, sessionId },
      })
    )
  }

  useEffect(() => {
    function onMessage(e: Event) {
      const detail = (e as CustomEvent).detail as {
        type?: string
        path?: string
        entries?: FileEntry[]
        content?: string
        fileName?: string
      }
      if (detail.type === "file_list" && detail.entries) {
        setEntries(detail.entries)
        if (detail.path) setPath(detail.path)
        setLoading(false)
      }
      if (
        detail.type === "file_download" &&
        detail.content &&
        detail.fileName
      ) {
        const blob = new Blob([
          Uint8Array.from(atob(detail.content), (c) => c.charCodeAt(0)),
        ])
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = detail.fileName
        a.click()
        URL.revokeObjectURL(url)
        setLoading(false)
      }
    }
    window.addEventListener("remote-agent-message", onMessage)
    return () => window.removeEventListener("remote-agent-message", onMessage)
  }, [])

  useEffect(() => {
    requestList(path)
  }, [sessionId])

  function download(filePath: string, fileName: string) {
    setLoading(true)
    window.dispatchEvent(
      new CustomEvent("remote-admin-command", {
        detail: { type: "download_file", path: filePath, fileName, sessionId },
      })
    )
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="truncate font-mono text-xs">{path}</p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => requestList(path)}
          disabled={loading}
        >
          Refresh
        </Button>
      </div>
      <div className="max-h-64 space-y-1 overflow-y-auto text-sm">
        {path.length > 3 && (
          <button
            type="button"
            className="block w-full rounded px-2 py-1 text-left hover:bg-muted"
            onClick={() => {
              const parent = path.replace(/\\[^\\]+$/, "") || path
              requestList(parent)
            }}
          >
            ..
          </button>
        )}
        {entries.map((entry) => (
          <div
            key={entry.path}
            className="flex items-center justify-between rounded px-2 py-1 hover:bg-muted"
          >
            <button
              type="button"
              className="truncate text-left"
              onClick={() =>
                entry.isDirectory ? requestList(entry.path) : undefined
              }
            >
              {entry.isDirectory ? "📁" : "📄"} {entry.name}
            </button>
            {!entry.isDirectory && (
              <Button
                size="xs"
                variant="ghost"
                onClick={() => download(entry.path, entry.name)}
              >
                Download
              </Button>
            )}
          </div>
        ))}
        {!loading && entries.length === 0 && (
          <p className="text-muted-foreground">
            No files or waiting for update service…
          </p>
        )}
      </div>
    </Card>
  )
}
