import { describe, expect, it } from 'vitest'
import { UninstallPackage } from '../../../src/application/packages/uninstall-package'
import { InMemoryDataStore, InMemoryPackageRepository } from '../../support/fakes'

function setup() {
  const packages = new InMemoryPackageRepository()
  const data = new InMemoryDataStore()
  packages.installed.add('todo-list')
  return { packages, data, uninstall: new UninstallPackage(packages, data) }
}

describe('UninstallPackage', () => {
  it('removes the package and keeps its data by default', async () => {
    const { packages, data, uninstall } = setup()

    expect(await uninstall.execute({ packageId: 'todo-list', deleteData: false })).toEqual({
      ok: true,
      value: undefined,
    })
    expect(packages.installed.has('todo-list')).toBe(false)
    expect(data.deletedStores).toEqual([])
  })

  it('also deletes the data when asked to', async () => {
    const { data, uninstall } = setup()

    await uninstall.execute({ packageId: 'todo-list', deleteData: true })

    expect(data.deletedStores).toEqual(['todo-list'])
  })

  it('refuses to uninstall a tool that is not installed', async () => {
    const { uninstall } = setup()

    expect((await uninstall.execute({ packageId: 'missing', deleteData: true })).ok).toBe(false)
  })
})
