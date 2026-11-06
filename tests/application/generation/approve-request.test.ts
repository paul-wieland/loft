import { describe, expect, it } from 'vitest'
import { ApproveRequest } from '../../../src/application/generation/approve-request'
import { RejectRequest } from '../../../src/application/generation/reject-request'
import {
  InMemoryDataBackups,
  InMemoryDataStore,
  InMemoryPackageRepository,
  InMemoryRequestStore,
  InMemoryStagingArea,
  awaitingReviewRequest,
} from '../../support/fakes'

function setup() {
  const requests = new InMemoryRequestStore()
  const staging = new InMemoryStagingArea()
  const packages = new InMemoryPackageRepository()
  const data = new InMemoryDataStore()
  const backups = new InMemoryDataBackups()
  requests.seed(awaitingReviewRequest())
  return {
    requests,
    staging,
    packages,
    data,
    backups,
    approve: new ApproveRequest(requests, staging, packages, data, backups),
    reject: new RejectRequest(requests, staging),
  }
}

describe('ApproveRequest', () => {
  it('writes the chosen icon into the staged manifest before installing', async () => {
    const { staging, approve } = setup()

    await approve.execute({ requestId: 'req-1', icon: 'kanban' })

    expect(staging.icons.get('req-1')).toBe('kanban')
    expect(staging.promoted).toEqual(['todo-list'])
  })

  it('rejects an icon that is not in the tool icon list', async () => {
    const { staging, approve } = setup()

    const result = await approve.execute({ requestId: 'req-1', icon: 'not-an-icon' })

    expect(result.ok).toBe(false)
    expect(staging.promoted).toEqual([])
  })

  it('S13: installs the staged package and marks the request installed', async () => {
    const { requests, staging, approve } = setup()

    const result = await approve.execute({ requestId: 'req-1' })

    expect(result).toEqual({ ok: true, value: { status: 'installed' } })
    expect(staging.promoted).toEqual(['todo-list'])
    expect((await requests.get('req-1'))?.state).toBe('installed')
  })

  it('S15: reports an id conflict and changes nothing when the id is taken', async () => {
    const { requests, staging, packages, approve } = setup()
    packages.installed.add('todo-list')

    const result = await approve.execute({ requestId: 'req-1' })

    expect(result).toEqual({ ok: true, value: { status: 'id-conflict' } })
    expect(staging.promoted).toEqual([])
    expect((await requests.get('req-1'))?.state).toBe('awaiting-review')
  })

  it('S15: replaces an existing package when asked to', async () => {
    const { staging, packages, approve } = setup()
    packages.installed.add('todo-list')

    const result = await approve.execute({ requestId: 'req-1', replace: true })

    expect(result).toEqual({ ok: true, value: { status: 'installed' } })
    expect(staging.promoted).toEqual(['todo-list'])
  })
})

describe('RejectRequest', () => {
  it('S14: discards staging and marks the request rejected', async () => {
    const { requests, staging, reject } = setup()

    expect(await reject.execute('req-1')).toEqual({ ok: true, value: undefined })
    expect(staging.discarded).toEqual(['req-1'])
    expect((await requests.get('req-1'))?.state).toBe('rejected')
  })
})

describe('ApproveRequest schema versions', () => {
  const schemaAt = (version: number) => JSON.stringify({ collections: { items: { fields: {} } }, schemaVersion: version })

  it('installs a new schema version over data at the same version and backs the data up first', async () => {
    const { data, backups, staging, approve } = setup()
    staging.stage('req-1', { 'schema.json': schemaAt(2) })
    await data.setSchemaVersion('todo-list', 2)

    const result = await approve.execute({ requestId: 'req-1', replace: true })

    expect(result.ok).toBe(true)
    expect(backups.snapshots).toEqual(['todo-list'])
    expect(await data.schemaVersion('todo-list')).toBe(2)
  })

  it('refuses an install whose schema is older than the saved data', async () => {
    const { data, staging, approve } = setup()
    staging.stage('req-1', { 'schema.json': schemaAt(1) })
    await data.setSchemaVersion('todo-list', 2)

    const result = await approve.execute({ requestId: 'req-1', replace: true })

    expect(result.ok).toBe(false)
    expect(staging.promoted).toEqual([])
  })

  it('refuses an install that would need a migration, and leaves the data alone', async () => {
    const { data, backups, staging, approve } = setup()
    staging.stage('req-1', { 'schema.json': schemaAt(3) })
    await data.setSchemaVersion('todo-list', 2)

    const result = await approve.execute({ requestId: 'req-1', replace: true })

    expect(result.ok).toBe(false)
    expect(backups.snapshots).toEqual([])
    expect(staging.promoted).toEqual([])
  })

  it('does not back up anything for a tool that has no saved data yet', async () => {
    const { backups, staging, approve, data } = setup()
    staging.stage('req-1', { 'schema.json': schemaAt(1) })

    await approve.execute({ requestId: 'req-1' })

    expect(backups.snapshots).toEqual([])
    expect(await data.schemaVersion('todo-list')).toBe(1)
  })
})
