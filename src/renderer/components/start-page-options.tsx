import type { StartPageSettings } from '@/lib/start-page-settings'
import { cn } from '@/lib/utils'

interface StartPageOptionsProps {
  settings: StartPageSettings
  onChange: (settings: StartPageSettings) => void
}

export function StartPageOptions({ settings, onChange }: StartPageOptionsProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-sm font-medium">Show start page</p>
      <button
        type="button"
        role="switch"
        aria-checked={settings.enabled}
        aria-label="Show start page"
        onClick={() => onChange({ ...settings, enabled: !settings.enabled })}
        className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors', settings.enabled ? 'bg-primary' : 'bg-muted')}
      >
        <span
          className={cn(
            'absolute top-0.5 size-5 rounded-full bg-card shadow transition-transform',
            settings.enabled ? 'translate-x-[22px]' : 'translate-x-[2px]',
          )}
        />
      </button>
    </div>
  )
}
