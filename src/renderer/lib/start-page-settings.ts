// Start page preferences, kept per viewer. Coordinates only leave the app for the weather service.
export interface StartPageLocation {
  name: string
  latitude: number
  longitude: number
}

export interface StartPageSettings {
  enabled: boolean
  location: StartPageLocation | null
}

export const DEFAULT_START_PAGE: StartPageSettings = { enabled: true, location: null }

const STORAGE_KEY = 'workplace-start-page'

export function parseStartPageSettings(raw: string | null): StartPageSettings {
  if (!raw) return DEFAULT_START_PAGE
  try {
    const value = JSON.parse(raw) as Partial<StartPageSettings>
    const place = value.location
    const location =
      place && typeof place.name === 'string' && typeof place.latitude === 'number' && typeof place.longitude === 'number'
        ? { name: place.name, latitude: place.latitude, longitude: place.longitude }
        : null
    return { enabled: typeof value.enabled === 'boolean' ? value.enabled : true, location }
  } catch {
    return DEFAULT_START_PAGE
  }
}

export function loadStartPageSettings(): StartPageSettings {
  try {
    return parseStartPageSettings(window.localStorage.getItem(STORAGE_KEY))
  } catch {
    return DEFAULT_START_PAGE
  }
}

export function saveStartPageSettings(settings: StartPageSettings): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Storage can be unavailable; the choice then lasts for this session only.
  }
}
