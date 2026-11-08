import { useEffect, useState } from 'react'
import { Download, RefreshCw, Trash2 } from 'lucide-react'

import type { CatalogTool } from '../../application/marketplace/catalog'
import type { PackageManifest } from '../../domain/package/manifest'
import { ToolIcon } from '@/components/tool-icon'
import { Button } from '@/components/ui/button'

interface MarketplacePageProps {
  installed: PackageManifest[]
  busyId: string | null
  onInstall: (packageId: string) => void
  onRemove: (packageId: string) => void
}

export function MarketplacePage({ installed, busyId, onInstall, onRemove }: MarketplacePageProps) {
  const [tools, setTools] = useState<CatalogTool[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void window.workplace.marketplace.catalog().then((result) => {
      if (result.ok) setTools(result.value)
      else setError(result.error)
    })
  }, [])

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-8">
      <div className="mb-6 max-w-2xl">
        <h2 className="text-2xl font-semibold tracking-tight">Marketplace</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tools from the Loft tools repository. Each one is reviewed before it is added to your workplace.
        </p>
      </div>

      {error && <p role="alert" className="text-sm text-destructive">Could not load the marketplace: {error}</p>}
      {!error && tools === null && <p className="text-sm text-muted-foreground">Loading tools…</p>}

      {tools && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {tools.map((tool) => {
            const current = installed.find((t) => t.id === tool.id)
            const outdated = current !== undefined && current.version !== tool.version
            const status = !current
              ? 'Not installed'
              : outdated
                ? `Update available: ${current.version} → ${tool.version}`
                : `Installed · version ${current.version}`
            return (
              <div key={tool.id} className="panel flex flex-col gap-3 p-4">
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--brand-a)] to-[var(--brand-b)] text-white">
                    <ToolIcon name={tool.icon} className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{tool.name}</p>
                    <p className="text-xs text-muted-foreground">{status}</p>
                  </div>
                </div>
                {tool.description && <p className="text-sm text-muted-foreground">{tool.description}</p>}
                <div className="mt-auto flex gap-2 pt-2">
                  {(!current || outdated) && (
                    <Button size="sm" disabled={busyId !== null} onClick={() => onInstall(tool.id)}>
                      {outdated ? <RefreshCw /> : <Download />}
                      {busyId === tool.id ? 'Downloading…' : outdated ? 'Update' : 'Install'}
                    </Button>
                  )}
                  {current && (
                    <Button size="sm" variant="outline" className="text-destructive" disabled={busyId !== null} onClick={() => onRemove(tool.id)}>
                      <Trash2 />
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
