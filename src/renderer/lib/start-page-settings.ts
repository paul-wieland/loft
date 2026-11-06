// Start page preferences, kept per viewer. Coordinates only leave the app for the weather service.
export interface StartPageLocation {
  name: string
  latitude: number
  longitude: number
  timezone?: string
}

export interface StartPageSettings {
  enabled: boolean
  locations: StartPageLocation[]
}

export const MAX_LOCATIONS = 4
export const DEFAULT_START_PAGE: StartPageSettings = { enabled: true, locations: [] }

const STORAGE_KEY = 'workplace-start-page'

function parsePlace(value: unknown): StartPageLocation | null {
  if (typeof value !== 'object' || value === null) return null
  const place = value as Record<string, unknown>
  if (typeof place.name !== 'string' || typeof place.latitude !== 'number' || typeof place.longitude !== 'number') {
    return null
  }
  return {
    name: place.name,
    latitude: place.latitude,
    longitude: place.longitude,
    timezone: typeof place.timezone === 'string' ? place.timezone : undefined,
  }
}

export function parseStartPageSettings(raw: string | null): StartPageSettings {
  if (!raw) return DEFAULT_START_PAGE
  try {
    const value = JSON.parse(raw) as Record<string, unknown>
    const enabled = typeof value.enabled === 'boolean' ? value.enabled : true
    // Earlier versions stored a single city under "location".
    const saved = Array.isArray(value.locations) ? value.locations : value.location ? [value.location] : []
    const locations = saved
      .map(parsePlace)
      .filter((place): place is StartPageLocation => place !== null)
      .slice(0, MAX_LOCATIONS)
    return { enabled, locations }
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
