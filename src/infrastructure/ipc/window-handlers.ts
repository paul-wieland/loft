import { ipcMain } from 'electron'

import { IPC } from '../../shared/ipc'

interface WindowActions {
  openSettings: () => void
  requestDatabase: () => void
}

export function registerWindowHandlers({ openSettings, requestDatabase }: WindowActions): void {
  ipcMain.handle(IPC.windowOpenSettings, () => openSettings())
  ipcMain.handle(IPC.windowOpenDatabase, () => requestDatabase())
}
