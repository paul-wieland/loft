import type { FormEvent } from 'react'
import { MessageSquarePlus, Send, X } from 'lucide-react'

import type { Review } from '../../application/generation/get-review'
import { ReviewPanel } from '@/components/review-panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export interface Message {
  role: 'user' | 'system'
  text: string
}

interface ChatPanelProps {
  className?: string
  banner?: string
  onClose?: () => void
  messages: Message[]
  review: Review | null
  busy: boolean
  draft: string
  placeholder: string
  emptyHint: string
  onDraftChange: (draft: string) => void
  onSend: (event: FormEvent) => void
  onApprove: () => void
  onReject: () => void
}

export function ChatPanel({
  className,
  banner,
  onClose,
  messages,
  review,
  busy,
  draft,
  placeholder,
  emptyHint,
  onDraftChange,
  onSend,
  onApprove,
  onReject,
}: ChatPanelProps) {
  return (
    <section className={cn('flex min-h-0 flex-col overflow-hidden bg-card', className)} aria-label="Chat">
      {banner && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b bg-primary/10 px-4 py-2 text-sm">
          <span className="font-medium text-primary">{banner}</span>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X />
              Close
            </Button>
          )}
        </div>
      )}

      {review && <ReviewPanel review={review} busy={busy} onApprove={onApprove} onReject={onReject} />}

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <MessageSquarePlus className="size-8" />
            <p>{emptyHint}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((message, index) =>
              message.role === 'user' ? (
                <div
                  key={index}
                  className="ml-auto max-w-[80%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground shadow-sm"
                >
                  {message.text}
                </div>
              ) : (
                <p key={index} className="text-sm text-muted-foreground">
                  {message.text}
                </p>
              ),
            )}
          </div>
        )}
      </div>

      <form onSubmit={onSend} className="flex shrink-0 gap-2 border-t p-4">
        <Input
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          placeholder={placeholder}
          aria-label="Message"
          disabled={busy}
        />
        <Button type="submit" disabled={busy || !draft.trim()}>
          <Send />
          Send
        </Button>
      </form>
    </section>
  )
}
