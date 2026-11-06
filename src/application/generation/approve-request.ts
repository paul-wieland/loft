import { validateDataSchema } from '../../domain/package/data-schema'
import { isToolIconName } from '../../domain/package/tool-icons'
import { approve } from '../../domain/requests/generation-request'
import { err, ok, type Result } from '../../domain/shared/result'
import type { DataBackups } from '../ports/data-backups'
import type { DataStore } from '../ports/data-store'
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
    private readonly data: DataStore,
    private readonly backups: DataBackups,
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

    const schemaVersion = await stagedSchemaVersion(this.staging, request.id)
    if (!schemaVersion.ok) return err(schemaVersion.error)
    const version = schemaVersion.value
    if (version !== null) {
      const stored = await this.data.schemaVersion(request.packageId)
      if (stored !== null && stored > version) {
        return err(`the saved data is at schema version ${stored}, newer than ${version}; install refused`)
      }
      if (stored !== null && stored < version) {
        return err(`the saved data needs a migration from schema version ${stored} to ${version}, which is not supported yet`)
      }
      if (stored !== null) await this.backups.snapshot(request.packageId)
    }

    if (input.icon !== undefined) await this.staging.setIcon(request.id, input.icon)
    await this.staging.promote(request.id, request.packageId)
    if (version !== null) await this.data.setSchemaVersion(request.packageId, version)
    await this.requests.save(approved.value)
    return ok({ status: 'installed' })
  }
}

// null when the package keeps no data, so there is no schema to check.
async function stagedSchemaVersion(staging: StagingArea, requestId: string): Promise<Result<number | null, string>> {
  const text = await staging.readFile(requestId, 'schema.json')
  if (text === null) return ok(null)
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return err('schema.json is not valid JSON')
  }
  const schema = validateDataSchema(raw)
  return schema.ok ? ok(schema.value.schemaVersion) : err(schema.error.join('; '))
}
