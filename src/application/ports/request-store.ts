import type { GenerationRequest } from '../../domain/requests/generation-request'

export interface RequestStore {
  get(id: string): Promise<GenerationRequest | null>
  save(request: GenerationRequest): Promise<void>
}
