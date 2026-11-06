import { reject } from '../../domain/requests/generation-request'
import { err, ok, type Result } from '../../domain/shared/result'
import type { RequestStore } from '../ports/request-store'
import type { StagingArea } from '../ports/staging-area'

export class RejectRequest {
  constructor(
    private readonly requests: RequestStore,
    private readonly staging: StagingArea,
  ) {}

  async execute(requestId: string): Promise<Result<void, string>> {
    const request = await this.requests.get(requestId)
    if (!request) return err(`request ${requestId} not found`)

    const rejected = reject(request)
    if (!rejected.ok) return err(rejected.error)

    await this.requests.save(rejected.value)
    await this.staging.discard(request.id)
    return ok(undefined)
  }
}
