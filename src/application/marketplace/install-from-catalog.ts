import { createRequest, finishGeneration, type GenerationRequest } from '../../domain/requests/generation-request'
import { err, ok, type Result } from '../../domain/shared/result'
import type { RequestStore } from '../ports/request-store'
import type { StagingArea } from '../ports/staging-area'
import type { ValidateStagedPackage } from '../generation/validate-staged-package'
import type { CatalogTool } from './catalog'

// Puts a downloaded tool through the same review as a generated one. Nothing is installed until it is approved.
export class InstallFromCatalog {
  constructor(
    private readonly requests: RequestStore,
    private readonly staging: StagingArea,
    private readonly validate: ValidateStagedPackage,
    private readonly newRequestId: () => string,
  ) {}

  async execute(tool: CatalogTool, files: Record<string, string>): Promise<Result<GenerationRequest, string>> {
    const id = this.newRequestId()
    const request = createRequest({ id, packageId: tool.id, spec: `Install ${tool.name} ${tool.version} from the tools repository` })
    await this.staging.prepare(id, request.spec)
    for (const [path, content] of Object.entries(files)) await this.staging.writeFile(id, path, content)

    const validating = finishGeneration(request)
    if (!validating.ok) return err(validating.error)
    await this.requests.save(validating.value)

    await this.validate.execute(id)
    const checked = await this.requests.get(id)
    if (!checked) return err('the request disappeared during validation')
    if (checked.state !== 'awaiting-review') {
      return err(checked.errors.join('; ') || `${tool.name} did not pass validation`)
    }
    return ok(checked)
  }
}
