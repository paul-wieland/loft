import { derivePackageId, isValidPackageId } from '../../domain/package/package-id'
import {
  createRequest,
  finishGeneration,
  requestFix,
  type GenerationRequest,
} from '../../domain/requests/generation-request'
import { err, ok, type Result } from '../../domain/shared/result'
import type { PackageGenerator } from '../ports/package-generator'
import type { RequestStore } from '../ports/request-store'
import type { StagingArea } from '../ports/staging-area'
import type { ValidateStagedPackage } from './validate-staged-package'

export class StartGeneration {
  constructor(
    private readonly requests: RequestStore,
    private readonly staging: StagingArea,
    private readonly generator: PackageGenerator,
    private readonly validate: ValidateStagedPackage,
    private readonly newRequestId: () => string,
  ) {}

  async execute(spec: string, basePackageId?: string): Promise<Result<GenerationRequest, string>> {
    const trimmed = spec.trim()
    if (trimmed.length === 0) return err('Describe the tool you want')
    if (basePackageId !== undefined && !isValidPackageId(basePackageId)) return err('Unknown tool')

    const id = this.newRequestId()
    let request = createRequest({
      id,
      packageId: basePackageId ?? derivePackageId(trimmed, id.slice(0, 4)),
      spec: trimmed,
    })
    try {
      await this.staging.prepare(id, trimmed, basePackageId)
    } catch {
      return err('That tool is not installed')
    }
    await this.requests.save(request)

    for (;;) {
      try {
        await this.generator.generate(id, instructionsFor(request, basePackageId !== undefined))
      } catch (error) {
        return err(error instanceof Error ? error.message : 'Generation failed')
      }

      const validating = finishGeneration(request)
      if (!validating.ok) return err(validating.error)
      await this.requests.save(validating.value)

      await this.validate.execute(id)
      const checked = await this.requests.get(id)
      if (!checked) return err('Request disappeared during validation')
      request = checked

      if (request.state !== 'needs-fix') return ok(request)

      const fix = requestFix(request)
      if (!fix.ok) return err(fix.error)
      request = fix.value
      await this.requests.save(request)
    }
  }
}

function instructionsFor(request: GenerationRequest, isEdit: boolean): string {
  const lines = [
    `Package id: ${request.packageId}`,
    '',
    isEdit
      ? 'Modify the existing tool in the working directory. Its current files are already there. Keep the package id and change only what is needed for this request:'
      : 'Build this tool:',
    request.spec,
  ]
  if (request.errors.length > 0) {
    lines.push('', 'The previous attempt failed validation with these errors. Fix them:')
    lines.push(...request.errors.map((error) => `- ${error}`))
  }
  return lines.join('\n')
}
