import type { KeyStore } from '../ports/key-store'

export interface ApiKeyStatus {
  configured: boolean
  masked: string | null
}

export class GetApiKeyStatus {
  constructor(private readonly keyStore: KeyStore) {}

  async execute(): Promise<ApiKeyStatus> {
    const key = await this.keyStore.read()
    if (!key) return { configured: false, masked: null }

    return { configured: true, masked: `••••${key.slice(-4)}` }
  }
}
