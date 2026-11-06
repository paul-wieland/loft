import { useEffect, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface NewToolDialogProps {
  onClose: () => void
  onCreate: (name: string, description: string, withCard: boolean) => void
}

export function NewToolDialog({ onClose, onCreate }: NewToolDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [withCard, setWithCard] = useState(false)
  const ready = name.trim() !== '' && description.trim() !== ''

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  function submit(event: FormEvent) {
    event.preventDefault()
    if (ready) onCreate(name.trim(), description.trim(), withCard)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="New tool"
        className="panel flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden shadow-xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex h-14 shrink-0 items-center justify-between border-b px-6">
          <h2 className="font-semibold">New tool</h2>
          <Button variant="ghost" size="icon" aria-label="Close" title="Close" onClick={onClose}>
            <X />
          </Button>
        </header>

        <form onSubmit={submit} className="space-y-6 overflow-y-auto p-6">
          <div className="space-y-2">
            <label htmlFor="new-tool-name" className="text-sm font-medium">
              1. Name
            </label>
            <p className="text-sm text-muted-foreground">A short title for the sidebar, for example “Recipe book”.</p>
            <Input
              id="new-tool-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Recipe book"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="new-tool-description" className="text-sm font-medium">
              2. What should it do?
            </label>
            <p className="text-sm text-muted-foreground">
              Describe what a person can see, add, change or delete. For example: “Save recipes with ingredients and
              cooking time, and search them by name.”
            </p>
            <textarea
              id="new-tool-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={5}
              placeholder="Describe the tool…"
              className="flex w-full resize-none rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={withCard}
              onChange={(event) => setWithCard(event.target.checked)}
              className="mt-1 size-4 accent-[#5b5bf0]"
            />
            <span>
              <span className="block text-sm font-medium">Show a card on the home page</span>
              <span className="block text-sm text-muted-foreground">A small read-only summary, such as due items or a shortcut.</span>
            </span>
          </label>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!ready}>
              Create tool
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
