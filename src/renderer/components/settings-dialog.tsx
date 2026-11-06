import { useEffect } from 'react'
import { Database, X } from 'lucide-react'

import { ApiKeySettings } from '@/components/api-key-settings'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'

interface SettingsDialogProps {
  onClose: () => void
  onOpenDatabase: () => void
}

export function SettingsDialog({ onClose, onOpenDatabase }: SettingsDialogProps) {
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
        aria-label="Settings"
        className="panel flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden shadow-xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex h-14 shrink-0 items-center justify-between border-b px-6">
          <h2 className="font-semibold">Settings</h2>
          <Button variant="ghost" size="icon" aria-label="Close settings" title="Close settings" onClick={onClose}>
            <X />
          </Button>
        </header>
        <div className="space-y-6 overflow-y-auto p-6">
          <section className="space-y-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Appearance</h3>
            <ThemeToggle />
          </section>
          <ApiKeySettings />
          <section className="space-y-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Data</h3>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                onClose()
                onOpenDatabase()
              }}
            >
              <Database />
              Open database view
            </Button>
          </section>
        </div>
      </div>
    </div>
  )
}
