import { app, BrowserWindow } from 'electron'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'

import { ApproveRequest } from '../application/generation/approve-request'
import { GetReview } from '../application/generation/get-review'
import { RejectRequest } from '../application/generation/reject-request'
import { StartGeneration } from '../application/generation/start-generation'
import { ValidateStagedPackage } from '../application/generation/validate-staged-package'
import { GetApiKeyStatus } from '../application/keys/get-api-key-status'
import { SaveApiKey } from '../application/keys/save-api-key'
import { InspectData } from '../application/data/inspect-data'
import { PackageData } from '../application/data/package-data'
import { ListPackages } from '../application/packages/list-packages'
import { UninstallPackage } from '../application/packages/uninstall-package'
import { AgentSdkPackageGenerator } from '../infrastructure/agent-sdk/package-generator'
import { FilePackageRepository } from '../infrastructure/fs/file-package-repository'
import { FileStagingArea } from '../infrastructure/fs/file-staging-area'
import { registerDataHandlers } from '../infrastructure/ipc/data-handlers'
import { registerDebugHandlers } from '../infrastructure/ipc/debug-handlers'
import { registerGenerationHandlers } from '../infrastructure/ipc/generation-handlers'
import { registerKeyHandlers } from '../infrastructure/ipc/key-handlers'
import { registerPackageHandlers } from '../infrastructure/ipc/package-handlers'
import { SafeStorageKeyStore } from '../infrastructure/keychain/safe-storage-key-store'
import { MemoryRequestStore } from '../infrastructure/memory/memory-request-store'
import { registerPackageScheme, servePackages } from '../infrastructure/protocol/package-protocol'
import { SqliteDataStore } from '../infrastructure/sqlite/sqlite-data-store'

registerPackageScheme()

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1100,
    height: 720,
    title: 'Workplace',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  window.webContents.on('console-message', (_event, _level, message) => {
    console.log('[renderer]', message)
  })

  const rendererUrl = process.env['ELECTRON_RENDERER_URL']
  if (rendererUrl) {
    void window.loadURL(rendererUrl)
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  const userData = app.getPath('userData')
  const stagingRoot = join(userData, 'staging')
  const packagesRoot = join(userData, 'packages')

  const keyStore = new SafeStorageKeyStore(join(userData, 'api-key.bin'))
  const staging = new FileStagingArea(stagingRoot, packagesRoot)
  const requests = new MemoryRequestStore()
  const packages = new FilePackageRepository(packagesRoot)
  const validate = new ValidateStagedPackage(requests, staging)
  const generator = new AgentSdkPackageGenerator(stagingRoot, keyStore)

  registerKeyHandlers({
    status: new GetApiKeyStatus(keyStore),
    save: new SaveApiKey(keyStore),
  })
  registerGenerationHandlers({
    start: new StartGeneration(requests, staging, generator, validate, randomUUID),
    review: new GetReview(requests, staging),
    approve: new ApproveRequest(requests, staging, packages),
    reject: new RejectRequest(requests, staging),
  })
  const data = new SqliteDataStore(join(userData, 'data'))
  registerPackageHandlers({
    list: new ListPackages(packages),
    uninstall: new UninstallPackage(packages, data),
  })
  registerDataHandlers({ call: new PackageData(packages, data) })
  registerDebugHandlers({ inspect: new InspectData(data) })
  servePackages(packagesRoot)

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
