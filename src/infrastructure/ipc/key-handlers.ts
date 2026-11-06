import { ipcMain } from 'electron'

import type { GetApiKeyStatus } from '../../application/keys/get-api-key-status'
import type { SaveApiKey } from '../../application/keys/save-api-key'
import { IPC } from '../../shared/ipc'

interface KeyUseCases {
  status: GetApiKeyStatus
  save: SaveApiKey
}

export function registerKeyHandlers({ status, save }: KeyUseCases): void {
  ipcMain.handle(IPC.keysStatus, () => status.execute())

  ipcMain.handle(IPC.keysSave, async (_event, key: unknown) => {
    if (typeof key !== 'string') return { ok: false, error: 'API key must be text' }

    try {
      return await save.execute(key)
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Could not save the API key' }
    }
  })
}
