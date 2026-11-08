import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

// Loft is the default look. Classic white and Classic dark keep the look the app had before.
export type AppStyle = 'loft' | 'classic-white' | 'classic-dark'

export const STYLES: { id: AppStyle; label: string }[] = [
  { id: 'loft', label: 'Loft' },
  { id: 'classic-white', label: 'Classic white' },
  { id: 'classic-dark', label: 'Classic dark' },
]

export const DEFAULT_STYLE: AppStyle = 'loft'

const STORAGE_KEY = 'workplace-style'

interface ThemeContextValue {
  style: AppStyle
  dark: boolean
  setStyle: (style: AppStyle) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readStoredStyle(): AppStyle {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    if (value === 'loft' || value === 'classic-white' || value === 'classic-dark') return value
  } catch {
    // Storage can be unavailable; use the default look.
  }
  return DEFAULT_STYLE
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [style, setStyleState] = useState<AppStyle>(readStoredStyle)
  const dark = style === 'classic-dark'

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    document.documentElement.dataset.style = style
  }, [style, dark])

  function setStyle(next: AppStyle): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Keep the style in memory when storage is unavailable.
    }
    setStyleState(next)
  }

  return <ThemeContext.Provider value={{ style, dark, setStyle }}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used inside ThemeProvider')
  return context
}
