import { useEffect, useRef, useState } from 'react'
import { Database, Ellipsis, Pencil, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface ToolActionsProps {
  editing: boolean
  onEdit: () => void
  onDelete: () => void
  onViewDatabase: () => void
}

export function ToolActions({ editing, onEdit, onDelete, onViewDatabase }: ToolActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function onPointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  return (
    <div role="toolbar" aria-label="Tool actions" className="flex items-center gap-1 rounded-lg border p-1">
      <Button variant={editing ? 'outline' : 'ghost'} size="sm" aria-pressed={editing} onClick={onEdit}>
        <Pencil />
        Edit
      </Button>

      <div ref={menuRef} className="relative">
        <Button
          variant="ghost"
          size="icon"
          aria-label="More tool actions"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          title="More"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <Ellipsis />
        </Button>
        {menuOpen && (
          <div role="menu" className="panel absolute right-0 top-full z-20 mt-2 w-44 p-1 shadow-lg">
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
              onClick={() => {
                setMenuOpen(false)
                onViewDatabase()
              }}
            >
              <Database className="size-4" />
              View database
            </button>
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-accent"
              onClick={() => {
                setMenuOpen(false)
                onDelete()
              }}
            >
              <Trash2 className="size-4" />
              Delete tool
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
