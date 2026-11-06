import type { ApiKeyStatus } from '../application/keys/get-api-key-status'
import type { DataCall } from '../application/data/package-data'
import type { TableRows } from '../application/ports/data-inspector'
import type { ApproveOutcome } from '../application/generation/approve-request'
import type { Review } from '../application/generation/get-review'
import type { PackageManifest } from '../domain/package/manifest'
import type { GenerationRequest } from '../domain/requests/generation-request'
import type { Result } from '../domain/shared/result'

export const IPC = {
  keysStatus: 'keys:status',
  keysSave: 'keys:save',
  generationStart: 'generation:start',
  generationReview: 'generation:review',
  generationApprove: 'generation:approve',
  generationReject: 'generation:reject',
  packagesList: 'packages:list',
  storeCall: 'store:call',
  packagesUninstall: 'packages:uninstall',
  debugDatabases: 'debug:databases',
  debugTables: 'debug:tables',
  debugRows: 'debug:rows',
} as const

export interface WorkplaceApi {
  platform: NodeJS.Platform
  keys: {
    status(): Promise<ApiKeyStatus>
    save(key: string): Promise<Result<void, string>>
  }
  generation: {
    start(spec: string, basePackageId?: string): Promise<Result<GenerationRequest, string>>
    review(requestId: string): Promise<Review | null>
    approve(requestId: string, replace: boolean): Promise<Result<ApproveOutcome, string>>
    reject(requestId: string): Promise<Result<void, string>>
  }
  packages: {
    list(): Promise<PackageManifest[]>
    uninstall(packageId: string, deleteData: boolean): Promise<Result<void, string>>
  }
  store: {
    call(call: DataCall): Promise<Result<unknown, string>>
  }
  debug: {
    databases(): Promise<string[]>
    tables(packageId: string): Promise<Result<string[], string>>
    rows(packageId: string, table: string): Promise<Result<TableRows, string>>
  }
}
