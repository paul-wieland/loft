import { useEffect, useState } from 'react'
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSun, MapPin, Plus, Snowflake, Sun, X, type LucideIcon } from 'lucide-react'

import { MAX_LOCATIONS, type StartPageLocation } from '@/lib/start-page-settings'
import { describeWeather, fetchCurrentWeather, type CurrentWeather, type WeatherIcon } from '@/lib/weather'
import { AddCityDialog } from '@/components/add-city-dialog'
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
  onLocationsChange: (locations: StartPageLocation[]) => void
  onNewTool: () => void
}

export function StartPage({ locations, onLocationsChange, onNewTool }: StartPageProps) {
  const [now, setNow] = useState(() => new Date())
  const [addingCity, setAddingCity] = useState(false)

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const hour = now.getHours()
  const greeting = hour < 5 ? 'Good night' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const date = now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="flex min-h-0 flex-1 flex-col items-start gap-6 overflow-y-auto p-8 text-left">
      <div>
        <p className="text-sm font-medium text-muted-foreground">{greeting}</p>
        <p className="mt-1 text-lg text-muted-foreground">{date}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {locations.length < MAX_LOCATIONS && (
          <Button variant="outline" onClick={() => setAddingCity(true)}>
            <Plus />
            Add city
          </Button>
        )}
        <Button variant="outline" onClick={onNewTool}>
          <Plus />
          New tool
        </Button>
      </div>

      {locations.length === 0 ? (
        <p className="text-sm text-muted-foreground">Add a city to see its time and weather.</p>
      ) : (
        <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-2">
          {locations.map((location, index) => (
            <CityCard
              key={`${location.name}-${location.latitude}-${location.longitude}`}
              location={location}
              now={now}
              onRemove={() => onLocationsChange(locations.filter((_, position) => position !== index))}
            />
          ))}
        </div>
      )}

      {addingCity && (
        <AddCityDialog
          locations={locations}
          onAdd={(place) => onLocationsChange([...locations, place])}
          onClose={() => setAddingCity(false)}
        />
      )}
    </div>
  )
}

function CityCard({ location, now, onRemove }: { location: StartPageLocation; now: Date; onRemove: () => void }) {
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
    <div className="panel relative flex flex-col gap-3 p-5 text-left">
      <Button variant="ghost" size="icon" className="absolute right-2 top-2 size-7" aria-label={`Remove ${location.name}`} title="Remove city" onClick={onRemove}>
        <X className="size-4" />
      </Button>
      <div className="flex min-w-0 items-center gap-1.5 pr-8 text-sm font-medium">
        <MapPin className="size-3.5 shrink-0" />
        <span className="truncate">{location.name}</span>
      </div>
      <div>
        <p className="bg-gradient-to-r from-[#5b5bf0] to-[#e65bd6] bg-clip-text text-4xl font-semibold tabular-nums text-transparent">
          {time}
        </p>
        <p className="text-xs text-muted-foreground">{day}</p>
      </div>
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
