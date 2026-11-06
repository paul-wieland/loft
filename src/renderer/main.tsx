import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { SettingsWindow } from '@/components/settings-window'
import { ThemeProvider } from '@/components/theme-provider'
import './index.css'

const isSettingsWindow = new URLSearchParams(window.location.search).get('window') === 'settings'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>{isSettingsWindow ? <SettingsWindow /> : <App />}</ThemeProvider>
  </StrictMode>,
)
