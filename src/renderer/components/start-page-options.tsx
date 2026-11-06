import { useState, type FormEvent } from 'react'
import { MapPin, X } from 'lucide-react'

import { MAX_LOCATIONS, type StartPageLocation, type StartPageSettings } from '@/lib/start-page-settings'
import { searchCities, type CitySuggestion } from '@/lib/weather'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface StartPageOptionsProps {
  settings: StartPageSettings
  onChange: (settings: StartPageSettings) => void
}

export function StartPageOptions({ settings, onChange }: StartPageOptionsProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CitySuggestion[]>([])
  const [searching, setSearching] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const full = settings.locations.length >= MAX_LOCATIONS

  function add(place: StartPageLocation) {
    if (full) {
      setMessage(`You can show up to ${MAX_LOCATIONS} cities.`)
      return
    }
    const duplicate = settings.locations.some(
      (saved) => saved.latitude === place.latitude && saved.longitude === place.longitude,
    )
    if (duplicate) {
      setMessage(`${place.name} is already shown.`)
      return
    }
    setMessage(null)
    onChange({ ...settings, locations: [...settings.locations, place] })
  }

  function remove(index: number) {
    onChange({ ...settings, locations: settings.locations.filter((_, position) => position !== index) })
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setMessage('Location is not available here. Search for a city instead.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        add({ name: 'My location', latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => setMessage('Could not get your location. Search for a city instead.'),
      { timeout: 10000 },
    )
  }

  async function search(event: FormEvent) {
    event.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    setMessage(null)
    try {
      const found = await searchCities(query.trim())
      setResults(found)
      if (found.length === 0) setMessage('No cities found.')
    } catch {
      setMessage('City search is unavailable right now.')
    } finally {
      setSearching(false)
    }
  }

  function choose(place: CitySuggestion) {
    setResults([])
    setQuery('')
    add({
      name: place.country ? `${place.name}, ${place.country}` : place.name,
      latitude: place.latitude,
      longitude: place.longitude,
      timezone: place.timezone ?? undefined,
    })
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium">Show start page</p>
        <button
          type="button"
          role="switch"
          aria-checked={settings.enabled}
          aria-label="Show start page"
          onClick={() => onChange({ ...settings, enabled: !settings.enabled })}
          className={cn(
            'relative h-6 w-11 shrink-0 rounded-full transition-colors',
            settings.enabled ? 'bg-primary' : 'bg-muted',
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 size-5 rounded-full bg-card shadow transition-transform',
              settings.enabled ? 'translate-x-[22px]' : 'translate-x-[2px]',
            )}
          />
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-medium">Cities</p>
          <p className="text-xs text-muted-foreground">
            {settings.locations.length} of {MAX_LOCATIONS}
          </p>
        </div>

        {settings.locations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No cities yet.</p>
        ) : (
          <ul className="space-y-1">
            {settings.locations.map((place, index) => (
              <li
                key={`${place.name}-${place.latitude}-${place.longitude}`}
                className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{place.name}</span>
                </span>
                <Button variant="ghost" size="icon" aria-label={`Remove ${place.name}`} title="Remove" onClick={() => remove(index)}>
                  <X />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <Button variant="outline" size="sm" onClick={useMyLocation} disabled={full}>
          <MapPin />
          Use my location
        </Button>

        <form onSubmit={(event) => void search(event)} className="flex gap-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search a city to add"
            aria-label="City"
            disabled={full}
          />
          <Button type="submit" variant="outline" disabled={searching || full || !query.trim()}>
            Search
          </Button>
        </form>

        {results.length > 0 && (
          <ul className="space-y-1">
            {results.map((place) => (
              <li key={`${place.name}-${place.latitude}-${place.longitude}`}>
                <button
                  type="button"
                  onClick={() => choose(place)}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  Add {place.name}
                  {place.country ? `, ${place.country}` : ''}
                </button>
              </li>
            ))}
          </ul>
        )}

        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </div>
    </div>
  )
}
