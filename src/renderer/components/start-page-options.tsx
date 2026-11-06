import { useState, type FormEvent } from 'react'
import { MapPin } from 'lucide-react'

import type { StartPageSettings } from '@/lib/start-page-settings'
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

  function useMyLocation() {
    if (!navigator.geolocation) {
      setMessage('Location is not available here. Search for a city instead.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setMessage(null)
        onChange({
          ...settings,
          location: { name: 'My location', latitude: position.coords.latitude, longitude: position.coords.longitude },
        })
      },
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
    onChange({
      ...settings,
      location: {
        name: place.country ? `${place.name}, ${place.country}` : place.name,
        latitude: place.latitude,
        longitude: place.longitude,
      },
    })
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Show start page</p>
          <p className="text-sm text-muted-foreground">The time and weather when the app opens.</p>
        </div>
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
        <p className="text-sm font-medium">Weather location</p>
        <p className="text-sm text-muted-foreground">
          {settings.location ? `Showing weather for ${settings.location.name}.` : 'No location set.'}
        </p>
        <Button variant="outline" size="sm" onClick={useMyLocation}>
          <MapPin />
          Use my location
        </Button>

        <form onSubmit={(event) => void search(event)} className="flex gap-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Or search a city"
            aria-label="City"
          />
          <Button type="submit" variant="outline" disabled={searching || !query.trim()}>
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
                  {place.name}
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
