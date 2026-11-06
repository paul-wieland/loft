import { err, ok, type Result } from '../../domain/shared/result'
import type { KeyStore } from '../ports/key-store'

export class SaveApiKey {
  constructor(private readonly keyStore: KeyStore) {}

  async execute(rawKey: string): Promise<Result<void, string>> {
    const key = rawKey.trim()
    if (key.length === 0 || /\s/.test(key)) {
      return err('API key must not be empty or contain spaces')
    }

    await this.keyStore.write(key)
    return ok(undefined)
  }
}
