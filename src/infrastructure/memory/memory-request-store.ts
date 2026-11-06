import type { RequestStore } from '../../application/ports/request-store'
import type { GenerationRequest } from '../../domain/requests/generation-request'

export class MemoryRequestStore implements RequestStore {
  private readonly requests = new Map<string, GenerationRequest>()

  async get(id: string): Promise<GenerationRequest | null> {
    return this.requests.get(id) ?? null
  }

  async save(request: GenerationRequest): Promise<void> {
    this.requests.set(request.id, { ...request, errors: [...request.errors] })
  }
}
