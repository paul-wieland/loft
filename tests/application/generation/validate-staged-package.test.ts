import { describe, expect, it } from 'vitest'
import { ValidateStagedPackage } from '../../../src/application/generation/validate-staged-package'
import { createRequest } from '../../../src/domain/requests/generation-request'
import {
  InMemoryRequestStore,
  InMemoryStagingArea,
  validatingRequest,
  validManifest,
} from '../../support/fakes'
import type { GenerationRequest } from '../../../src/domain/requests/generation-request'

const validFiles = {
  'manifest.json': JSON.stringify(validManifest),
  'ui/index.js': 'export default {}',
}

function setup(files: Record<string, string>, request: GenerationRequest = validatingRequest()) {
  const requests = new InMemoryRequestStore()
  const staging = new InMemoryStagingArea()
  requests.seed(request)
  staging.stage(request.id, files)
  return { requests, staging, validate: new ValidateStagedPackage(requests, staging) }
}

describe('ValidateStagedPackage', () => {
  it('S9: passes a complete package and moves the request to review', async () => {
    const { requests, validate } = setup(validFiles)

    const result = await validate.execute('req-1')

    expect(result.ok).toBe(true)
    expect((await requests.get('req-1'))?.state).toBe('awaiting-review')
  })

  it('S10: a missing manifest sends the request back for a fix and records the error', async () => {
    const { requests, validate } = setup({ 'ui/index.js': 'export default {}' })

    const result = await validate.execute('req-1')

    expect(result).toEqual({ ok: false, error: ['manifest.json is missing'] })
    const saved = await requests.get('req-1')
    expect(saved?.state).toBe('needs-fix')
    expect(saved?.errors).toEqual(['manifest.json is missing'])
  })

  it('S11: rejects a manifest that requests an unknown permission', async () => {
    const manifest = { ...validManifest, permissions: ['network'] }
    const { validate } = setup({ ...validFiles, 'manifest.json': JSON.stringify(manifest) })

    expect(await validate.execute('req-1')).toEqual({
      ok: false,
      error: ['unknown permissions: network'],
    })
  })

  it('reports a missing entry file', async () => {
    const { validate } = setup({ 'manifest.json': JSON.stringify(validManifest) })

    expect(await validate.execute('req-1')).toEqual({
      ok: false,
      error: ['entry file "ui/index.js" is missing'],
    })
  })

  it('C7: rejects a package with symlinks pointing outside its folder', async () => {
    const { staging, validate } = setup(validFiles)
    staging.escapingSymlinks.add('req-1')

    expect(await validate.execute('req-1')).toEqual({
      ok: false,
      error: ['package contains symlinks that point outside its folder'],
    })
  })

  it('refuses to validate a request that is not in the validating state', async () => {
    const generating = createRequest({ id: 'req-1', packageId: 'todo-list', spec: 'x' })
    const { validate } = setup(validFiles, generating)

    expect(await validate.execute('req-1')).toEqual({
      ok: false,
      error: ['request is "generating", expected "validating"'],
    })
  })
})
