import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

import type { Review } from '../../application/generation/get-review'
import { DEFAULT_TOOL_ICON, isToolIconName, type ToolIconName } from '../../domain/package/tool-icons'
import { FileBrowser } from '@/components/file-browser'
import { ToolPreview } from '@/components/tool-preview'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// The icon the manifest chose, or the default when it is missing or unknown.
function chosenIcon(review: Review): ToolIconName {
  let manifest: Record<string, unknown> = {}
  try {
    manifest = JSON.parse(review.manifest ?? '{}') as Record<string, unknown>
  } catch {
    // A broken manifest is reported by validation; fall back to the default icon here.
  }
  return isToolIconName(manifest.icon) ? manifest.icon : DEFAULT_TOOL_ICON
}

type ReviewTab = 'preview' | 'files'

const TABS: { id: ReviewTab; label: string }[] = [
  { id: 'preview', label: 'Preview' },
  { id: 'files', label: 'Files' },
]

interface ReviewDialogProps {
  review: Review
  busy: boolean
  onApprove: (icon: ToolIconName) => void
  onReject: () => void
  onClose: () => void
}

export function ReviewDialog({ review, busy, onApprove, onReject, onClose }: ReviewDialogProps) {
  const { request } = review
  const canApprove = request.state === 'awaiting-review' && !busy
  const icon = chosenIcon(review)
  const [tab, setTab] = useState<ReviewTab>('preview')

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Review changes"
        className="panel flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden shadow-xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b px-6">
          <h2 className="min-w-0 truncate font-semibold">Review: {request.packageId}</h2>
          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-md border px-2 py-0.5 text-xs text-muted-foreground">{request.state}</span>
            <Button variant="ghost" size="icon" aria-label="Close review" title="Close review" onClick={onClose}>
              <X />
            </Button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-4 p-6">
          <p className="shrink-0 text-sm text-muted-foreground">{request.spec}</p>

          {request.errors.length > 0 && (
            <ul role="alert" className="shrink-0 list-disc space-y-1 pl-5 text-sm text-destructive">
              {request.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border">
            <div role="tablist" aria-label="Review views" className="flex shrink-0 gap-1 border-b bg-background px-2 pt-2">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === item.id}
                  onClick={() => setTab(item.id)}
                  className={cn(
                    'rounded-t-md border border-b-0 px-4 py-2 text-sm',
                    tab === item.id ? 'bg-card font-semibold' : 'border-transparent text-muted-foreground hover:bg-accent',
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="min-h-0 flex-1" style={{ height: '52vh' }} role="tabpanel">
              {tab === 'preview' ? (
                review.entrySource ? (
                  <ToolPreview requestId={request.id} name={request.packageId} />
                ) : (
                  <p className="p-6 text-sm text-muted-foreground">This package has no ui/index.js to preview.</p>
                )
              ) : (
                <FileBrowser requestId={request.id} files={review.files} />
              )}
            </div>
          </div>

        </div>

        <footer className="flex shrink-0 justify-end gap-2 border-t px-6 py-4">
          <Button variant="outline" onClick={onReject} disabled={busy}>
            Reject
          </Button>
          <Button onClick={() => onApprove(icon)} disabled={!canApprove}>
            Approve and install
          </Button>
        </footer>
      </div>
    </div>
  )
}
