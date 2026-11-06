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
  location: StartPageLocation | null
  onNewTool: () => void
  onOpenSettings: () => void
}

export function StartPage({ location, onNewTool, onOpenSettings }: StartPageProps) {
  const [now, setNow] = useState(() => new Date())
  const [weather, setWeather] = useState<CurrentWeather | null>(null)
  const [weatherError, setWeatherError] = useState<string | null>(null)

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (!location) {
      setWeather(null)
      setWeatherError(null)
      return
    }
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
  }, [location])

  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const date = now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })
  const hour = now.getHours()
  const greeting = hour < 5 ? 'Good night' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 overflow-y-auto p-8 text-center">
      <div>
        <p className="text-sm font-medium text-muted-foreground">{greeting}</p>
        <p className="mt-2 bg-gradient-to-r from-[#5b5bf0] to-[#e65bd6] bg-clip-text text-7xl font-semibold tabular-nums text-transparent">
          {time}
        </p>
        <p className="mt-2 text-lg text-muted-foreground">{date}</p>
      </div>

      <div className="panel w-full max-w-sm p-5">
        {!location ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Add a city or your location to see the weather.</p>
            <Button variant="outline" size="sm" onClick={onOpenSettings}>
              <MapPin />
              Set location
            </Button>
          </div>
        ) : weatherError ? (
          <p className="text-sm text-muted-foreground">{weatherError}</p>
        ) : !weather ? (
          <p className="text-sm text-muted-foreground">Loading weather…</p>
        ) : (
          <div className="flex items-center justify-center gap-4">
            {(() => {
              const description = describeWeather(weather.code)
              const Icon = WEATHER_ICONS[description.icon]
              return (
                <>
                  <span className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#5b5bf0] to-[#e65bd6] text-white">
                    <Icon className="size-7" />
                  </span>
                  <div className="text-left">
                    <p className="text-3xl font-semibold tabular-nums">{Math.round(weather.temperature)}°C</p>
                    <p className="text-sm text-muted-foreground">{description.label}</p>
                  </div>
                </>
              )
            })()}
          </div>
        )}
        {location && <p className="mt-4 flex items-center justify-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3" />{location.name}</p>}
      </div>

      <Button variant="outline" onClick={onNewTool}>
        <Plus />
        New tool
      </Button>
    </div>
  )
}
