import { describe, expect, it } from 'vitest'
import { validateManifest } from '../../../src/domain/package/manifest'

const base = {
  id: 'due-tasks',
  name: 'Due tasks',
  version: '1.0.0',
  icon: 'list-todo',
  entry: 'ui/index.js',
  permissions: ['store'],
  contractVersion: 1,
}

describe('home card in the manifest', () => {
  it('accepts a small or wide card', () => {
    const small = validateManifest({ ...base, homeCard: { size: 'small' } }, 'due-tasks')
    expect(small.ok && small.value.homeCard).toEqual({ size: 'small' })
    const wide = validateManifest({ ...base, homeCard: { size: 'wide' } }, 'due-tasks')
    expect(wide.ok && wide.value.homeCard).toEqual({ size: 'wide' })
  })

  it('leaves a tool without a card unchanged', () => {
    const plain = validateManifest(base, 'due-tasks')
    expect(plain.ok && plain.value.homeCard).toBeUndefined()
  })

  it('rejects an unknown card size', () => {
    const bad = validateManifest({ ...base, homeCard: { size: 'huge' } }, 'due-tasks')
    expect(bad.ok).toBe(false)
  })
})
