import type { GenerationRequest } from '../../domain/requests/generation-request'
import type { RequestStore } from '../ports/request-store'
import type { StagingArea } from '../ports/staging-area'

export interface Review {
  request: GenerationRequest
  files: string[]
  manifest: string | null
  entrySource: string | null
}

export class GetReview {
  constructor(
    private readonly requests: RequestStore,
    private readonly staging: StagingArea,
  ) {}

  async execute(requestId: string): Promise<Review | null> {
    const request = await this.requests.get(requestId)
    if (!request) return null

    return {
      request,
      files: await this.staging.listFiles(requestId),
      manifest: await this.staging.readFile(requestId, 'manifest.json'),
      entrySource: await this.staging.readFile(requestId, 'ui/index.js'),
    }
  }
}
