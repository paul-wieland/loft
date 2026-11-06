import { validateDataSchema } from '../../domain/package/data-schema'
import { validateManifest, type PackageManifest } from '../../domain/package/manifest'
import { failValidation, passValidation } from '../../domain/requests/generation-request'
import { err, ok, type Result } from '../../domain/shared/result'
import type { RequestStore } from '../ports/request-store'
import type { StagingArea } from '../ports/staging-area'

export class ValidateStagedPackage {
  constructor(
    private readonly requests: RequestStore,
    private readonly staging: StagingArea,
  ) {}

  async execute(requestId: string): Promise<Result<PackageManifest, string[]>> {
    const request = await this.requests.get(requestId)
    if (!request) return err([`request ${requestId} not found`])
    if (request.state !== 'validating') {
      return err([`request is "${request.state}", expected "validating"`])
    }

    const { errors, manifest } = await this.inspect(request.id, request.packageId)

    if (errors.length > 0 || !manifest) {
      const failed = failValidation(request, errors)
      if (!failed.ok) return err([failed.error])
      await this.requests.save(failed.value)
      return err(errors)
    }

    const passed = passValidation(request)
    if (!passed.ok) return err([passed.error])
    await this.requests.save(passed.value)
    return ok(manifest)
  }

  private async inspect(
    requestId: string,
    packageId: string,
  ): Promise<{ errors: string[]; manifest?: PackageManifest }> {
    const manifestText = await this.staging.readFile(requestId, 'manifest.json')
    if (manifestText === null) return { errors: ['manifest.json is missing'] }

    const manifestJson = parseJson(manifestText)
    if (!manifestJson.ok) return { errors: ['manifest.json is not valid JSON'] }

    const manifest = validateManifest(manifestJson.value, packageId)
    if (!manifest.ok) return { errors: manifest.error }

    const errors: string[] = []

    if (!(await this.staging.exists(requestId, manifest.value.entry))) {
      errors.push(`entry file "${manifest.value.entry}" is missing`)
    }

    const schemaText = await this.staging.readFile(requestId, 'schema.json')
    if (schemaText !== null) {
      const schemaJson = parseJson(schemaText)
      if (!schemaJson.ok) {
        errors.push('schema.json is not valid JSON')
      } else {
        const schema = validateDataSchema(schemaJson.value)
        if (!schema.ok) errors.push(...schema.error)
      }
    }

    if (await this.staging.hasExternalSymlinks(requestId)) {
      errors.push('package contains symlinks that point outside its folder')
    }

    return errors.length > 0 ? { errors } : { errors, manifest: manifest.value }
  }
}

function parseJson(text: string): Result<unknown, string> {
  try {
    return ok(JSON.parse(text))
  } catch {
    return err('invalid JSON')
  }
}
