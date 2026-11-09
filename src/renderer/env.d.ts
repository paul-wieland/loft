import type { WorkplaceApi } from '../shared/ipc'

declare global {
  interface Window {
    workplace: WorkplaceApi
  }
  // Replaced at build time with the version in package.json.
  const __APP_VERSION__: string
}

export {}
