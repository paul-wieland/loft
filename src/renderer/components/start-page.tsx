import { useEffect, useState } from 'react'
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSun, Info, MapPin, Plus, Snowflake, Sun, X, type LucideIcon } from 'lucide-react'

import type { PackageManifest } from '../../domain/package/manifest'
import { MAX_LOCATIONS, nearestCity, needsTimezone, type StartPageLocation } from '@/lib/start-page-settings'
import { describeWeather, fetchCurrentWeather, searchCities, type CurrentWeather, type WeatherIcon } from '@/lib/weather'
import { AddCityDialog } from '@/components/add-city-dialog'
import { HomeCards } from '@/components/home-cards'
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
  cards: PackageManifest[]
  dataRevisions: Record<string, number>
  onOpenTool: (id: string) => void
}

export function StartPage({ locations, onLocationsChange, onNewTool, cards, dataRevisions, onOpenTool }: StartPageProps) {
  const [now, setNow] = useState(() => new Date())
  const [addingCity, setAddingCity] = useState(false)
  const [showSource, setShowSource] = useState(false)

  useEffect(() => {
    if (!showSource) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setShowSource(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showSource])

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  // Cities saved without a time zone get one from the city search, so their time is right.
  useEffect(() => {
    const index = locations.findIndex(needsTimezone)
    const place = index < 0 ? undefined : locations[index]
    if (!place) return
    let cancelled = false
    searchCities((place.name.split(',')[0] ?? place.name).trim()).then(
      (found) => {
        const match = nearestCity(found, place.latitude, place.longitude)
        if (cancelled || !match?.timezone) return
        onLocationsChange(
          locations.map((saved, position) => (position === index ? { ...saved, timezone: match.timezone ?? undefined } : saved)),
        )
      },
      () => undefined,
    )
    return () => {
      cancelled = true
    }
  }, [locations, onLocationsChange])

  const hour = now.getHours()
  const greeting = hour < 5 ? 'Good night' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const date = now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="flex min-h-0 flex-1 flex-col items-start gap-6 overflow-y-auto p-8 text-left">
      <div>
        <p className="text-sm font-medium text-muted-foreground">{greeting}</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight">{date}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {locations.length < MAX_LOCATIONS && (
          <button
            type="button"
            onClick={() => setAddingCity(true)}
            className="inline-flex h-9 items-center gap-2 rounded-full bg-primary/10 px-4 text-sm font-medium text-primary transition-colors hover:bg-primary/15"
          >
            <Plus className="size-4" />
            Add city
          </button>
        )}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Where the weather comes from"
          aria-haspopup="dialog"
          aria-expanded={showSource}
          title="Where the weather comes from"
          onClick={() => setShowSource((open) => !open)}
        >
          <Info />
        </Button>
      </div>

      {showSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={() => setShowSource(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Where the weather comes from"
            className="panel w-full max-w-md space-y-3 p-6 text-left shadow-xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <h2 className="font-semibold">Where the weather comes from</h2>
              <Button variant="ghost" size="icon" aria-label="Close" title="Close" onClick={() => setShowSource(false)}>
                <X />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Weather and the time zone of each city come from Open-Meteo (open-meteo.com), a free service that needs no
              account.
            </p>
            <p className="text-sm text-muted-foreground">Only the coordinates of your cities are sent to it.</p>
            <p className="text-sm text-muted-foreground">
              Weather is refreshed every 30 minutes. City search uses Open-Meteo's geocoding service.
            </p>
          </div>
        </div>
      )}

      {locations.length === 0 ? (
        <p className="text-sm text-muted-foreground">Add a city to see its time and weather.</p>
      ) : (
        <div className="grid w-full max-w-2xl gap-2 sm:grid-cols-2 lg:grid-cols-3">
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
    <div className="panel group relative flex flex-col gap-1 p-2 text-left">
      <div className="flex min-w-0 items-center gap-1 pr-5 text-[11px] font-medium">
        <MapPin className="size-2.5 shrink-0" />
        <span className="truncate">{location.name}</span>
      </div>
      <div>
        <p className="bg-gradient-to-r from-[#5b5bf0] to-[#e65bd6] bg-clip-text text-xl font-semibold tabular-nums text-transparent">
          {time}
        </p>
        <p className="text-[10px] text-muted-foreground">{day}</p>
      </div>
      {weatherError ? (
        <p className="text-xs text-muted-foreground">{weatherError}</p>
      ) : !weather ? (
        <p className="text-xs text-muted-foreground">Loading weather…</p>
      ) : (
        (() => {
          const description = describeWeather(weather.code)
          const Icon = WEATHER_ICONS[description.icon]
          return (
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-md bg-gradient-to-br from-[#5b5bf0] to-[#e65bd6] text-white">
                <Icon className="size-3" />
              </span>
              <div>
                <p className="text-sm font-semibold tabular-nums">{Math.round(weather.temperature)}°C</p>
                <p className="text-[10px] text-muted-foreground">{description.label}</p>
              </div>
            </div>
          )
        })()
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${location.name}`}
        className="self-end text-xs text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus:opacity-100 group-hover:opacity-100"
      >
        Remove
      </button>
    </div>
  )
}
