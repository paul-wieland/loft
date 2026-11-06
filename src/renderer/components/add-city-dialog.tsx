import { useEffect, useState, type FormEvent } from 'react'
import { MapPin, X } from 'lucide-react'

import { DEVICE_LOCATION_NAME, MAX_LOCATIONS, type StartPageLocation } from '@/lib/start-page-settings'
import { searchCities, type CitySuggestion } from '@/lib/weather'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface AddCityDialogProps {
  locations: StartPageLocation[]
  onAdd: (place: StartPageLocation) => void
  onClose: () => void
}

export function AddCityDialog({ locations, onAdd, onClose }: AddCityDialogProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CitySuggestion[]>([])
  const [searching, setSearching] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const full = locations.length >= MAX_LOCATIONS

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  function add(place: StartPageLocation) {
    if (full) {
      setMessage(`You can show up to ${MAX_LOCATIONS} cities.`)
      return
    }
    if (locations.some((saved) => saved.latitude === place.latitude && saved.longitude === place.longitude)) {
      setMessage(`${place.name} is already shown.`)
      return
    }
    setMessage(null)
    setResults([])
    setQuery('')
    onAdd(place)
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setMessage('Location is not available here. Search for a city instead.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => add({ name: DEVICE_LOCATION_NAME, latitude: position.coords.latitude, longitude: position.coords.longitude }),
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add city"
        className="panel flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden shadow-xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex h-14 shrink-0 items-center justify-between border-b px-6">
          <h2 className="font-semibold">Add city</h2>
          <Button variant="ghost" size="icon" aria-label="Close" title="Close" onClick={onClose}>
            <X />
          </Button>
        </header>

        <div className="space-y-4 overflow-y-auto p-6">
          <Button variant="outline" size="sm" onClick={useMyLocation} disabled={full}>
            <MapPin />
            Use my location
          </Button>

          <form onSubmit={(event) => void search(event)} className="flex gap-2">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search a city"
              aria-label="City"
              autoFocus
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
                    onClick={() =>
                      add({
                        name: place.country ? `${place.name}, ${place.country}` : place.name,
                        latitude: place.latitude,
                        longitude: place.longitude,
                        timezone: place.timezone ?? undefined,
                      })
                    }
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
    </div>
  )
}
