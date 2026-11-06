import { Database } from 'lucide-react'

import { ApiKeySettings } from '@/components/api-key-settings'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'

export function SettingsWindow() {
  return (
    <div className="dot-grid flex h-screen p-3">
      <main className="panel flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center border-b px-6 font-semibold">Settings</header>
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <section className="space-y-2">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Appearance</h2>
            <ThemeToggle />
          </section>
          <section className="space-y-2">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Claude</h2>
            <ApiKeySettings />
          </section>
          <section className="space-y-2">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Data</h2>
            <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => void window.workplace.windows.openDatabase()}>
              <Database />
              Open database view
            </Button>
          </section>
        </div>
      </main>
    </div>
  )
}
