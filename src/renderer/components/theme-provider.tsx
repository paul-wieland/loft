import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'workplace-theme'

interface ThemeContextValue {
  theme: Theme
  dark: boolean
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readStoredTheme(): Theme {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    if (value === 'light' || value === 'dark' || value === 'system') return value
  } catch {
    // Storage can be unavailable; fall back to the system setting.
  }
  return 'system'
}

function isDarkTheme(theme: Theme): boolean {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  return theme === 'dark' || (theme === 'system' && prefersDark)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme)
  const [dark, setDark] = useState(() => isDarkTheme(theme))

  useEffect(() => {
    const update = () => {
      const next = isDarkTheme(theme)
      document.documentElement.classList.toggle('dark', next)
      setDark(next)
    }
    update()
    if (theme !== 'system') return

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [theme])

  function setTheme(next: Theme): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Keep the theme in memory when storage is unavailable.
    }
    setThemeState(next)
  }

  return <ThemeContext.Provider value={{ theme, dark, setTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used inside ThemeProvider')
  return context
}
