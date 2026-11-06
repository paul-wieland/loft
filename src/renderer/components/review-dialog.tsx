import { useEffect } from 'react'
import { X } from 'lucide-react'

import type { Review } from '../../application/generation/get-review'
import { Button } from '@/components/ui/button'

interface ReviewDialogProps {
  review: Review
  busy: boolean
  onApprove: () => void
  onReject: () => void
  onClose: () => void
}

export function ReviewDialog({ review, busy, onApprove, onReject, onClose }: ReviewDialogProps) {
  const { request } = review
  const canApprove = request.state === 'awaiting-review' && !busy

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
        className="panel flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden shadow-xl"
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

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6">
          <p className="text-sm text-muted-foreground">{request.spec}</p>

          {request.errors.length > 0 && (
            <ul role="alert" className="list-disc space-y-1 pl-5 text-sm text-destructive">
              {request.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">manifest.json</p>
              <pre className="max-h-72 overflow-auto rounded-md border bg-background p-3 text-xs">
                {review.manifest ?? 'No manifest.json'}
              </pre>
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">ui/index.js</p>
              <pre className="max-h-72 overflow-auto rounded-md border bg-background p-3 text-xs">
                {review.entrySource ?? 'No ui/index.js'}
              </pre>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">Files: {review.files.join(', ') || 'none'}</p>
        </div>

        <footer className="flex shrink-0 justify-end gap-2 border-t px-6 py-4">
          <Button variant="outline" onClick={onReject} disabled={busy}>
            Reject
          </Button>
          <Button onClick={onApprove} disabled={!canApprove}>
            Approve and install
          </Button>
        </footer>
      </div>
    </div>
  )
}
