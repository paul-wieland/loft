import { isToolIconName } from '../../domain/package/tool-icons'
import { approve } from '../../domain/requests/generation-request'
import { err, ok, type Result } from '../../domain/shared/result'
import type { PackageRepository } from '../ports/package-repository'
import type { RequestStore } from '../ports/request-store'
import type { StagingArea } from '../ports/staging-area'

export type ApproveOutcome = { status: 'installed' } | { status: 'id-conflict' }

export interface ApproveInput {
  requestId: string
  replace?: boolean
  icon?: string
}

export class ApproveRequest {
  constructor(
    private readonly requests: RequestStore,
    private readonly staging: StagingArea,
    private readonly packages: PackageRepository,
  ) {}

  async execute(input: ApproveInput): Promise<Result<ApproveOutcome, string>> {
    const request = await this.requests.get(input.requestId)
    if (!request) return err(`request ${input.requestId} not found`)

    if (input.icon !== undefined && !isToolIconName(input.icon)) return err(`unknown icon "${input.icon}"`)

    const approved = approve(request)
    if (!approved.ok) return err(approved.error)

    if (!input.replace && (await this.packages.isInstalled(request.packageId))) {
      return ok({ status: 'id-conflict' })
    }

    if (input.icon !== undefined) await this.staging.setIcon(request.id, input.icon)
    await this.staging.promote(request.id, request.packageId)
    await this.requests.save(approved.value)
    return ok({ status: 'installed' })
  }
}
