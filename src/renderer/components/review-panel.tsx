import type { Review } from '../../application/generation/get-review'
import { Button } from '@/components/ui/button'

interface ReviewPanelProps {
  review: Review
  busy: boolean
  onApprove: () => void
  onReject: () => void
}

export function ReviewPanel({ review, busy, onApprove, onReject }: ReviewPanelProps) {
  const { request } = review
  const canApprove = request.state === 'awaiting-review' && !busy

  return (
    <section aria-label="Review" className="space-y-3 border-b bg-card px-6 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-sm font-medium">Review: {request.packageId}</h2>
          <p className="truncate text-sm text-muted-foreground">{request.spec}</p>
        </div>
        <span className="shrink-0 rounded-md border px-2 py-0.5 text-xs text-muted-foreground">{request.state}</span>
      </div>

      {request.errors.length > 0 && (
        <ul role="alert" className="list-disc space-y-1 pl-5 text-sm text-destructive">
          {request.errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <pre className="max-h-48 overflow-auto rounded-md border bg-background p-3 text-xs">
          {review.manifest ?? 'No manifest.json'}
        </pre>
        <pre className="max-h-48 overflow-auto rounded-md border bg-background p-3 text-xs">
          {review.entrySource ?? 'No ui/index.js'}
        </pre>
      </div>

      <p className="text-xs text-muted-foreground">Files: {review.files.join(', ') || 'none'}</p>

      <div className="flex gap-2">
        <Button onClick={onApprove} disabled={!canApprove}>
          Approve and install
        </Button>
        <Button variant="outline" onClick={onReject} disabled={busy}>
          Reject
        </Button>
      </div>
    </section>
  )
}
