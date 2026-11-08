import { describe, expect, it } from 'vitest'
import { parseCatalog } from '../../../src/application/marketplace/catalog'
import { InstallFromCatalog } from '../../../src/application/marketplace/install-from-catalog'
import { ValidateStagedPackage } from '../../../src/application/generation/validate-staged-package'
import { InMemoryRequestStore, InMemoryStagingArea } from '../../support/fakes'

const manifest = JSON.stringify({
  id: 'sample-tool', name: 'Sample', version: '1.0.0', icon: 'wrench',
  entry: 'ui/index.js', permissions: [], contractVersion: 1,
})

const tool = {
  id: 'sample-tool', name: 'Sample', version: '1.0.0', description: '', icon: 'wrench',
  files: [{ path: 'manifest.json', sha256: '' }, { path: 'ui/index.js', sha256: '' }],
}

function setup() {
  const requests = new InMemoryRequestStore()
  const staging = new InMemoryStagingArea()
  const validate = new ValidateStagedPackage(requests, staging)
  const install = new InstallFromCatalog(requests, staging, validate, () => 'req-catalog')
  return { requests, staging, install }
}

describe('parseCatalog', () => {
  it('accepts a catalog with tools that list their manifest and entry file', () => {
    const result = parseCatalog({ tools: [tool] })
    expect(result.ok && result.value.map((t) => t.id)).toEqual(['sample-tool'])
  })

  it('rejects a file path that leaves the tool folder', () => {
    const bad = { ...tool, files: [...tool.files, { path: '../escape.js', sha256: '' }] }
    expect(parseCatalog({ tools: [bad] }).ok).toBe(false)
  })

  it('rejects a tool that does not list its entry file', () => {
    const bad = { ...tool, files: [{ path: 'manifest.json', sha256: '' }] }
    expect(parseCatalog({ tools: [bad] }).ok).toBe(false)
  })
})

describe('InstallFromCatalog', () => {
  it('stages the downloaded files and leaves the request awaiting review', async () => {
    const { requests, install } = setup()

    const result = await install.execute(tool, { 'manifest.json': manifest, 'ui/index.js': 'export {}' })

    expect(result.ok && result.value.state).toBe('awaiting-review')
    expect((await requests.get('req-catalog'))?.state).toBe('awaiting-review')
  })

  it('refuses a download whose manifest is invalid, with the validation errors', async () => {
    const { install } = setup()

    const result = await install.execute(tool, { 'manifest.json': '{"id": 3}', 'ui/index.js': 'export {}' })

    expect(result.ok).toBe(false)
  })
})
