import { describe, expect, it } from 'vitest'
import { DEFAULT_START_PAGE, MAX_LOCATIONS, parseStartPageSettings } from '../../src/renderer/lib/start-page-settings'
import { describeWeather } from '../../src/renderer/lib/weather'

describe('start page settings', () => {
  it('is on by default with no cities', () => {
    expect(parseStartPageSettings(null)).toEqual(DEFAULT_START_PAGE)
    expect(DEFAULT_START_PAGE).toEqual({ enabled: true, locations: [] })
  })

  it('falls back to the defaults for broken stored values', () => {
    expect(parseStartPageSettings('not json')).toEqual(DEFAULT_START_PAGE)
  })

  it('keeps several saved cities with their time zones and the off switch', () => {
    const saved = JSON.stringify({
      enabled: false,
      locations: [
        { name: 'Berlin', latitude: 52.5, longitude: 13.4, timezone: 'Europe/Berlin' },
        { name: 'Tokyo', latitude: 35.7, longitude: 139.7, timezone: 'Asia/Tokyo' },
      ],
    })
    expect(parseStartPageSettings(saved)).toEqual({
      enabled: false,
      locations: [
        { name: 'Berlin', latitude: 52.5, longitude: 13.4, timezone: 'Europe/Berlin' },
        { name: 'Tokyo', latitude: 35.7, longitude: 139.7, timezone: 'Asia/Tokyo' },
      ],
    })
  })

  it('reads an older single city and drops entries with missing coordinates', () => {
    const older = JSON.stringify({ enabled: true, location: { name: 'Berlin', latitude: 52.5, longitude: 13.4 } })
    expect(parseStartPageSettings(older).locations).toEqual([{ name: 'Berlin', latitude: 52.5, longitude: 13.4, timezone: undefined }])
    const broken = JSON.stringify({ enabled: true, locations: [{ name: 'Berlin' }] })
    expect(parseStartPageSettings(broken).locations).toEqual([])
  })

  it('keeps at most the maximum number of cities', () => {
    const many = Array.from({ length: MAX_LOCATIONS + 2 }, (_, index) => ({ name: `City ${index}`, latitude: index, longitude: index }))
    expect(parseStartPageSettings(JSON.stringify({ enabled: true, locations: many })).locations).toHaveLength(MAX_LOCATIONS)
  })
})

describe('weather codes', () => {
  it('maps common codes to labels and icons', () => {
    expect(describeWeather(0)).toEqual({ label: 'Clear', icon: 'sun' })
    expect(describeWeather(45)).toEqual({ label: 'Fog', icon: 'fog' })
    expect(describeWeather(61)).toEqual({ label: 'Rain', icon: 'rain' })
    expect(describeWeather(73)).toEqual({ label: 'Snow', icon: 'snow' })
    expect(describeWeather(95)).toEqual({ label: 'Thunderstorm', icon: 'storm' })
  })
})
