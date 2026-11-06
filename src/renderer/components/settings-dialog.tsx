import { useEffect, useState } from 'react'
import { Database, Palette, Sparkles, X, type LucideIcon } from 'lucide-react'

import { ApiKeySettings } from '@/components/api-key-settings'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'

interface SettingsDialogProps {
  onClose: () => void
  onOpenDatabase: () => void
}

type SectionId = 'appearance' | 'claude' | 'data'

const SECTIONS: { id: SectionId; label: string; icon: LucideIcon }[] = [
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'claude', label: 'Claude', icon: Sparkles },
  { id: 'data', label: 'Data', icon: Database },
]

export function SettingsDialog({ onClose, onOpenDatabase }: SettingsDialogProps) {
  const [section, setSection] = useState<SectionId>('appearance')

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
        className="panel flex h-[min(560px,85vh)] w-full max-w-2xl overflow-hidden shadow-xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <nav className="flex w-48 shrink-0 flex-col gap-1 border-r p-3" aria-label="Settings sections">
          <p className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Settings</p>
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              variant={id === section ? 'outline' : 'ghost'}
              className="w-full justify-start"
              aria-current={id === section ? 'page' : undefined}
              onClick={() => setSection(id)}
            >
              <Icon />
              {label}
            </Button>
          ))}
        </nav>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center justify-between border-b px-6">
            <h2 className="font-semibold">{SECTIONS.find((item) => item.id === section)?.label}</h2>
            <Button variant="ghost" size="icon" aria-label="Close settings" title="Close settings" onClick={onClose}>
              <X />
            </Button>
          </header>
          <div className="flex-1 overflow-y-auto p-6">
            {section === 'appearance' && <ThemeToggle />}
            {section === 'claude' && <ApiKeySettings />}
            {section === 'data' && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Read-only view of each tool's saved data.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onClose()
                    onOpenDatabase()
                  }}
                >
                  <Database />
                  Open database view
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
