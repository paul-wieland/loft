import { Pencil, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface ToolActionsProps {
  editing: boolean
  onEdit: () => void
  onDelete: () => void
}

export function ToolActions({ editing, onEdit, onDelete }: ToolActionsProps) {
  return (
    <div role="toolbar" aria-label="Tool actions" className="flex items-center gap-1 rounded-lg border p-1">
      <Button variant={editing ? 'outline' : 'ghost'} size="sm" aria-pressed={editing} onClick={onEdit}>
        <Pencil />
        Edit
      </Button>
      <Button variant="ghost" size="sm" className="text-destructive" onClick={onDelete}>
        <Trash2 />
        Delete
      </Button>
    </div>
  )
}
