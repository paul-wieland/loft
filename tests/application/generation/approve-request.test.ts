import { describe, expect, it } from 'vitest'
import { ApproveRequest } from '../../../src/application/generation/approve-request'
import { RejectRequest } from '../../../src/application/generation/reject-request'
import {
  InMemoryPackageRepository,
  InMemoryRequestStore,
  InMemoryStagingArea,
  awaitingReviewRequest,
} from '../../support/fakes'

function setup() {
  const requests = new InMemoryRequestStore()
  const staging = new InMemoryStagingArea()
  const packages = new InMemoryPackageRepository()
  requests.seed(awaitingReviewRequest())
  return {
    requests,
    staging,
    packages,
    approve: new ApproveRequest(requests, staging, packages),
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
