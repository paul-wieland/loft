import { readFile, writeFile } from 'node:fs/promises'
import { safeStorage } from 'electron'

import type { KeyStore } from '../../application/ports/key-store'

export class SafeStorageKeyStore implements KeyStore {
  constructor(private readonly filePath: string) {}

  async read(): Promise<string | null> {
    let encrypted: Buffer
    try {
      encrypted = await readFile(this.filePath)
    } catch (error) {
      if (isNotFound(error)) return null
      throw error
    }
    return safeStorage.decryptString(encrypted)
  }

  async write(key: string): Promise<void> {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Secure storage is not available on this system')
    }
    await writeFile(this.filePath, safeStorage.encryptString(key), { mode: 0o600 })
  }
}

function isNotFound(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}
