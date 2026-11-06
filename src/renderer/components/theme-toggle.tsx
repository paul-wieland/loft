import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useTheme, type Theme } from '@/components/theme-provider'

const OPTIONS: { value: Theme; label: string; icon: LucideIcon }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="grid grid-cols-3 gap-1" aria-label="Theme">
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <Button
          key={value}
          size="sm"
          variant={theme === value ? 'outline' : 'ghost'}
          aria-pressed={theme === value}
          onClick={() => setTheme(value)}
        >
          <Icon />
          {label}
        </Button>
      ))}
    </div>
  )
}
