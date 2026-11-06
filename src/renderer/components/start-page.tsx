import { useEffect, useState } from 'react'
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSun, MapPin, Plus, Snowflake, Sun, type LucideIcon } from 'lucide-react'

import type { StartPageLocation } from '@/lib/start-page-settings'
import { describeWeather, fetchCurrentWeather, type CurrentWeather, type WeatherIcon } from '@/lib/weather'
import { Button } from '@/components/ui/button'

const WEATHER_ICONS: Record<WeatherIcon, LucideIcon> = {
  sun: Sun,
  'cloud-sun': CloudSun,
  cloud: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  snow: Snowflake,
  storm: CloudLightning,
}

const REFRESH_MS = 30 * 60 * 1000

interface StartPageProps {
  locations: StartPageLocation[]
  onNewTool: () => void
  onOpenSettings: () => void
}

export function StartPage({ locations, onNewTool, onOpenSettings }: StartPageProps) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const hour = now.getHours()
  const greeting = hour < 5 ? 'Good night' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const date = now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 overflow-y-auto p-8 text-center">
      <div>
        <p className="text-sm font-medium text-muted-foreground">{greeting}</p>
        <p className="mt-2 text-lg text-muted-foreground">{date}</p>
      </div>

      {locations.length === 0 ? (
        <div className="panel flex w-full max-w-sm flex-col items-center gap-3 p-5">
          <p className="text-sm text-muted-foreground">Choose cities in Settings to see their time and weather.</p>
          <Button variant="outline" size="sm" onClick={onOpenSettings}>
            <MapPin />
            Choose cities
          </Button>
        </div>
      ) : (
        <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-2">
          {locations.map((location) => (
            <CityCard key={`${location.name}-${location.latitude}-${location.longitude}`} location={location} now={now} />
          ))}
        </div>
      )}

      <Button variant="outline" onClick={onNewTool}>
        <Plus />
        New tool
      </Button>
    </div>
  )
}

function CityCard({ location, now }: { location: StartPageLocation; now: Date }) {
  const [weather, setWeather] = useState<CurrentWeather | null>(null)
  const [weatherError, setWeatherError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = () =>
      fetchCurrentWeather(location.latitude, location.longitude).then(
        (current) => {
          if (cancelled) return
          setWeather(current)
          setWeatherError(null)
        },
        () => {
          if (cancelled) return
          setWeather(null)
          setWeatherError('Weather is unavailable right now.')
        },
      )
    void load()
    const id = window.setInterval(() => void load(), REFRESH_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [location.latitude, location.longitude])

  // Without a time zone (the device location), the device's own time zone is used.
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: location.timezone })
  const day = now.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', timeZone: location.timezone })

  return (
    <div className="panel flex flex-col gap-3 p-5 text-left">
      <div className="flex items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
          <MapPin className="size-3.5 shrink-0" />
          <span className="truncate">{location.name}</span>
        </p>
        <p className="shrink-0 text-xs text-muted-foreground">{day}</p>
      </div>
      <p className="bg-gradient-to-r from-[#5b5bf0] to-[#e65bd6] bg-clip-text text-4xl font-semibold tabular-nums text-transparent">
        {time}
      </p>
      {weatherError ? (
        <p className="text-sm text-muted-foreground">{weatherError}</p>
      ) : !weather ? (
        <p className="text-sm text-muted-foreground">Loading weather…</p>
      ) : (
        (() => {
          const description = describeWeather(weather.code)
          const Icon = WEATHER_ICONS[description.icon]
          return (
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#5b5bf0] to-[#e65bd6] text-white">
                <Icon className="size-5" />
              </span>
              <div>
                <p className="text-xl font-semibold tabular-nums">{Math.round(weather.temperature)}°C</p>
                <p className="text-sm text-muted-foreground">{description.label}</p>
              </div>
            </div>
          )
        })()
      )}
    </div>
  )
}
