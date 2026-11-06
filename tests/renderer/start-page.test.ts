import { describe, expect, it } from 'vitest'
import { DEFAULT_START_PAGE, parseStartPageSettings } from '../../src/renderer/lib/start-page-settings'
import { describeWeather } from '../../src/renderer/lib/weather'

describe('start page settings', () => {
  it('is on by default with no location', () => {
    expect(parseStartPageSettings(null)).toEqual(DEFAULT_START_PAGE)
    expect(DEFAULT_START_PAGE.enabled).toBe(true)
  })

  it('falls back to the defaults for broken stored values', () => {
    expect(parseStartPageSettings('not json')).toEqual(DEFAULT_START_PAGE)
  })

  it('keeps a valid saved location and the off switch', () => {
    const saved = JSON.stringify({ enabled: false, location: { name: 'Berlin', latitude: 52.5, longitude: 13.4 } })
    expect(parseStartPageSettings(saved)).toEqual({
      enabled: false,
      location: { name: 'Berlin', latitude: 52.5, longitude: 13.4 },
    })
  })

  it('drops a location with missing coordinates', () => {
    const saved = JSON.stringify({ enabled: true, location: { name: 'Berlin' } })
    expect(parseStartPageSettings(saved).location).toBeNull()
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
