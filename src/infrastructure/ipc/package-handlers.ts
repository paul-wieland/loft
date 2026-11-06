import { ipcMain } from 'electron'

import type { ListPackages } from '../../application/packages/list-packages'
import type { UninstallPackage } from '../../application/packages/uninstall-package'
import { IPC } from '../../shared/ipc'

interface PackageUseCases {
  list: ListPackages
  uninstall: UninstallPackage
}

export function registerPackageHandlers({ list, uninstall }: PackageUseCases): void {
  ipcMain.handle(IPC.packagesList, () => list.execute())

  ipcMain.handle(IPC.packagesUninstall, (_event, packageId: unknown, deleteData: unknown) => {
    if (typeof packageId !== 'string') return { ok: false, error: 'Invalid tool' }
    return uninstall.execute({ packageId, deleteData: deleteData === true })
  })
}
