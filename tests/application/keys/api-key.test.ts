import { describe, expect, it } from 'vitest'
import { GetApiKeyStatus } from '../../../src/application/keys/get-api-key-status'
import { SaveApiKey } from '../../../src/application/keys/save-api-key'
import { InMemoryKeyStore } from '../../support/fakes'

describe('API key use cases', () => {
  it('S1: reports no key configured before one is saved', async () => {
    const status = await new GetApiKeyStatus(new InMemoryKeyStore()).execute()

    expect(status).toEqual({ configured: false, masked: null })
  })

  it('S2: stores the trimmed key and shows only its last four characters', async () => {
    const keys = new InMemoryKeyStore()

    const saved = await new SaveApiKey(keys).execute('  sk-ant-api03-abcd1234  ')
    const status = await new GetApiKeyStatus(keys).execute()

    expect(saved.ok).toBe(true)
    expect(keys.value).toBe('sk-ant-api03-abcd1234')
    expect(status).toEqual({ configured: true, masked: '••••1234' })
  })

  it('rejects an empty key or one containing spaces without storing it', async () => {
    const keys = new InMemoryKeyStore()
    const save = new SaveApiKey(keys)

    expect((await save.execute('   ')).ok).toBe(false)
    expect((await save.execute('sk-ant with space')).ok).toBe(false)
    expect(keys.value).toBeNull()
  })
})
