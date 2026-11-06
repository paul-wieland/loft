import type { WorkplaceApi } from '../shared/ipc'

declare global {
  interface Window {
    workplace: WorkplaceApi
  }
}

export {}
