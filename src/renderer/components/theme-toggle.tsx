import { Monitor, Moon, Sun } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useTheme, type Theme } from '@/components/theme-provider'

const NEXT_THEME: Record<Theme, Theme> = {
  light: 'dark',
  dark: 'system',
  system: 'light',
}

const LABEL: Record<Theme, string> = {
  light: 'Light mode',
  dark: 'Dark mode',
  system: 'System theme',
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`${LABEL[theme]}. Switch theme`}
      title={LABEL[theme]}
      onClick={() => setTheme(NEXT_THEME[theme])}
    >
      <Icon />
    </Button>
  )
}
