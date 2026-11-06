import { ipcMain } from 'electron'

import type { InspectData } from '../../application/data/inspect-data'
import { IPC } from '../../shared/ipc'

export function registerDebugHandlers({ inspect }: { inspect: InspectData }): void {
  ipcMain.handle(IPC.debugDatabases, () => inspect.databases())

  ipcMain.handle(IPC.debugTables, (_event, packageId: unknown) => {
    if (typeof packageId !== 'string') return { ok: false, error: 'Unknown database' }
    return inspect.tables(packageId)
  })

  ipcMain.handle(IPC.debugRows, (_event, packageId: unknown, table: unknown) => {
    if (typeof packageId !== 'string' || typeof table !== 'string') {
      return { ok: false, error: 'Unknown table' }
    }
    return inspect.rows(packageId, table)
  })
}
