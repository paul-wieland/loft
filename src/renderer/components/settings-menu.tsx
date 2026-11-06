import { useEffect, useState } from 'react'
import { Database, Settings } from 'lucide-react'

import { ApiKeySettings } from '@/components/api-key-settings'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'

interface SettingsMenuProps {
  onOpenDatabase: () => void
}

export function SettingsMenu({ onOpenDatabase }: SettingsMenuProps) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <div className="relative border-t p-3">
      {open && (
        <div
          role="dialog"
          aria-label="Settings"
          className="panel absolute bottom-full left-3 right-3 mb-2 max-h-[70vh] space-y-5 overflow-y-auto p-4 shadow-lg"
        >
          <section className="space-y-2">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Appearance</h2>
            <ThemeToggle />
          </section>
          <ApiKeySettings />
          <section className="space-y-2">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Data</h2>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                setOpen(false)
                onOpenDatabase()
              }}
            >
              <Database />
              Open database view
            </Button>
          </section>
        </div>
      )}
      <Button
        variant="ghost"
        className="w-full justify-start"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Settings />
        Settings
      </Button>
    </div>
  )
}
