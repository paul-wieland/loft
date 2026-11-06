import { describe, expect, it } from 'vitest'
import { validateManifest } from '../../../src/domain/package/manifest'
import { validManifest } from '../../support/fakes'

function errorsFor(raw: unknown, folderName = 'todo-list'): string[] {
  const result = validateManifest(raw, folderName)
  if (result.ok) throw new Error('expected validation to fail')
  return result.error
}

describe('validateManifest', () => {
  it('accepts a valid manifest', () => {
    expect(validateManifest(validManifest, 'todo-list').ok).toBe(true)
  })

  it('C2: rejects an id that does not match the folder name', () => {
    expect(errorsFor({ ...validManifest, id: 'tasks' }, 'todo')).toContainEqual(
      expect.stringContaining('must match folder name'),
    )
  })

  it('S11: rejects permissions outside the allowed list', () => {
    expect(errorsFor({ ...validManifest, permissions: ['store', 'network'] })).toContainEqual(
      'unknown permissions: network',
    )
  })

  it('rejects an entry that escapes the package folder', () => {
    expect(errorsFor({ ...validManifest, entry: '../other/index.js' })).toContainEqual(
      expect.stringContaining('entry must be a relative path'),
    )
  })

  it('rejects a contract version newer than the host supports', () => {
    expect(errorsFor({ ...validManifest, contractVersion: 2 })).toContainEqual(
      expect.stringContaining('newer than supported'),
    )
  })

  it('requires an icon', () => {
    expect(errorsFor({ ...validManifest, icon: '' })).toContainEqual('icon is required')
  })

  it('rejects a non-object manifest', () => {
    expect(errorsFor('not an object')).toEqual(['manifest must be a JSON object'])
  })
})
