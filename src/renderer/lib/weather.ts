// Weather from Open-Meteo, which needs no API key.
export type WeatherIcon = 'sun' | 'cloud-sun' | 'cloud' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm'

export interface CurrentWeather {
  temperature: number
  code: number
}

export interface CitySuggestion {
  name: string
  country: string | null
  latitude: number
  longitude: number
  timezone: string | null
}

export async function fetchCurrentWeather(latitude: number, longitude: number): Promise<CurrentWeather> {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.search = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: 'temperature_2m,weather_code',
    timezone: 'auto',
  }).toString()

  const response = await fetch(url)
  if (!response.ok) throw new Error(`weather service returned ${response.status}`)
  const body = (await response.json()) as { current?: { temperature_2m?: number; weather_code?: number } }
  const temperature = body.current?.temperature_2m
  const code = body.current?.weather_code
  if (typeof temperature !== 'number' || typeof code !== 'number') throw new Error('weather data is missing')
  return { temperature, code }
}

export async function searchCities(query: string): Promise<CitySuggestion[]> {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search')
  url.search = new URLSearchParams({ name: query, count: '5', language: 'en', format: 'json' }).toString()

  const response = await fetch(url)
  if (!response.ok) throw new Error(`city search returned ${response.status}`)
  const body = (await response.json()) as {
    results?: { name: string; country?: string; latitude: number; longitude: number; timezone?: string }[]
  }
  return (body.results ?? []).map((place) => ({
    name: place.name,
    country: place.country ?? null,
    latitude: place.latitude,
    longitude: place.longitude,
    timezone: place.timezone ?? null,
  }))
}

// WMO weather codes, as used by Open-Meteo.
export function describeWeather(code: number): { label: string; icon: WeatherIcon } {
  if (code === 0) return { label: 'Clear', icon: 'sun' }
  if (code <= 2) return { label: 'Partly cloudy', icon: 'cloud-sun' }
  if (code === 3) return { label: 'Overcast', icon: 'cloud' }
  if (code === 45 || code === 48) return { label: 'Fog', icon: 'fog' }
  if (code >= 51 && code <= 57) return { label: 'Drizzle', icon: 'drizzle' }
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { label: 'Rain', icon: 'rain' }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { label: 'Snow', icon: 'snow' }
  if (code >= 95) return { label: 'Thunderstorm', icon: 'storm' }
  return { label: 'Unknown', icon: 'cloud' }
}
