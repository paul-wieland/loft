import { STYLES, useTheme, type AppStyle } from '@/components/theme-provider'
import { cn } from '@/lib/utils'

// The three colours shown on each style's swatch: background, accent, text.
const SWATCH: Record<AppStyle, string[]> = {
  loft: ['#F6E6C8', '#E2711D', '#4A2412'],
  'classic-white': ['#ffffff', '#5b5bf0', '#1d2033'],
  'classic-dark': ['#111327', '#8b8bff', '#eef0fa'],
}

export function ThemeToggle() {
  const { style, setStyle } = useTheme()

  return (
    <div className="grid gap-2">
      {STYLES.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={style === option.id}
          onClick={() => setStyle(option.id)}
          className={cn(
            'flex items-center gap-3 rounded-xl border p-3 text-left text-sm transition-colors',
            style === option.id ? 'border-primary bg-primary/10 ring-2 ring-primary' : 'hover:bg-accent',
          )}
        >
          <span className="flex h-8 w-16 shrink-0 overflow-hidden rounded-md border">
            {SWATCH[option.id].map((colour) => (
              <span key={colour} className="flex-1" style={{ background: colour }} />
            ))}
          </span>
          <span className="font-medium">{option.label}</span>
        </button>
      ))}
    </div>
  )
}
