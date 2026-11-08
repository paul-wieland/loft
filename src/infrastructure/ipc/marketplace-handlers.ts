import { ipcMain } from 'electron'

import { parseCatalog } from '../../application/marketplace/catalog'
import type { InstallFromCatalog } from '../../application/marketplace/install-from-catalog'
import { err } from '../../domain/shared/result'
import { IPC } from '../../shared/ipc'
import { fetchCatalog, fetchToolFiles } from '../marketplace/catalog-client'

export function registerMarketplaceHandlers({ install }: { install: InstallFromCatalog }): void {
  ipcMain.handle(IPC.marketplaceCatalog, async () => {
    try {
      return parseCatalog(await fetchCatalog())
    } catch (error) {
      return err(error instanceof Error ? error.message : 'the catalog could not be loaded')
    }
  })

  ipcMain.handle(IPC.marketplaceInstall, async (_event, packageId: unknown) => {
    if (typeof packageId !== 'string') return err('unknown tool')
    try {
      const catalog = parseCatalog(await fetchCatalog())
      if (!catalog.ok) return catalog
      const tool = catalog.value.find((t) => t.id === packageId)
      if (!tool) return err(`${packageId} is not in the catalog`)
      return install.execute(tool, await fetchToolFiles(tool))
    } catch (error) {
      return err(error instanceof Error ? error.message : 'the tool could not be downloaded')
    }
  })
}
