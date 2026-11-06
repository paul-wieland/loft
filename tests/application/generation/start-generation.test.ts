import { describe, expect, it } from 'vitest'
import { StartGeneration } from '../../../src/application/generation/start-generation'
import { ValidateStagedPackage } from '../../../src/application/generation/validate-staged-package'
import type { PackageGenerator } from '../../../src/application/ports/package-generator'
import { derivePackageId } from '../../../src/domain/package/package-id'
import { InMemoryRequestStore, InMemoryStagingArea, validManifest } from '../../support/fakes'

function goodFiles(packageId: string): Record<string, string> {
  return {
    'manifest.json': JSON.stringify({ ...validManifest, id: packageId }),
    'ui/index.js': 'export default {}',
  }
}

function packageIdFrom(instructions: string): string {
  return instructions.match(/Package id: (\S+)/)?.[1] ?? ''
}

function setup(generate: (requestId: string, instructions: string, staging: InMemoryStagingArea) => Promise<void>) {
  const requests = new InMemoryRequestStore()
  const staging = new InMemoryStagingArea()
  const instructions: string[] = []
  const generator: PackageGenerator = {
    async generate(requestId, text) {
      instructions.push(text)
      await generate(requestId, text, staging)
    },
  }
  const start = new StartGeneration(
    requests,
    staging,
    generator,
    new ValidateStagedPackage(requests, staging),
    () => 'req-1',
  )
  return { requests, start, instructions }
}

describe('StartGeneration', () => {
  it('generates, validates and leaves the request ready for review', async () => {
    const { requests, start } = setup(async (requestId, text, staging) => {
      staging.stage(requestId, goodFiles(packageIdFrom(text)))
    })

    const result = await start.execute('a todo list')

    expect(result.ok).toBe(true)
    expect((await requests.get('req-1'))?.state).toBe('awaiting-review')
  })

  it('feeds validation errors back to the generator and fixes them on the next attempt', async () => {
    const { requests, start, instructions } = setup(async (requestId, text, staging) => {
      const fixed = text.includes('previous attempt failed')
      staging.stage(requestId, fixed ? goodFiles(packageIdFrom(text)) : { 'ui/index.js': '' })
    })

    await start.execute('a todo list')

    expect(instructions).toHaveLength(2)
    expect(instructions[1]).toContain('manifest.json is missing')
    expect((await requests.get('req-1'))?.state).toBe('awaiting-review')
  })

  it('stops after the fix limit and leaves the request failed', async () => {
    const { requests, start, instructions } = setup(async (requestId, _text, staging) => {
      staging.stage(requestId, { 'ui/index.js': '' })
    })

    await start.execute('a todo list')

    expect(instructions).toHaveLength(4)
    expect((await requests.get('req-1'))?.state).toBe('failed')
  })

  it('edits an installed tool in place, keeping its package id', async () => {
    const { requests, start, instructions } = setup(async (requestId, text, staging) => {
      staging.stage(requestId, goodFiles(packageIdFrom(text)))
    })

    const result = await start.execute('add due dates', 'todo-list')

    expect(result.ok).toBe(true)
    expect((await requests.get('req-1'))?.packageId).toBe('todo-list')
    expect(instructions[0]).toContain('Modify the existing tool')
    expect(instructions[0]).toContain('Package id: todo-list')
  })

  it('refuses to edit a tool id that is not valid', async () => {
    const { instructions, start } = setup(async () => {})

    expect((await start.execute('add due dates', '../etc')).ok).toBe(false)
    expect(instructions).toHaveLength(0)
  })

  it('rejects an empty description without starting generation', async () => {
    const { instructions, start } = setup(async () => {})

    expect((await start.execute('   ')).ok).toBe(false)
    expect(instructions).toHaveLength(0)
  })
})

describe('derivePackageId', () => {
  it('builds a valid id from the first words of the description', () => {
    expect(derivePackageId('A todo list with due dates!', 'a1b2')).toBe('a-todo-list-a1b2')
  })

  it('prefixes ids that would start with a digit', () => {
    expect(derivePackageId('2fa codes', 'a1b2')).toBe('tool-2fa-codes-a1b2')
  })
})
