import { contextBridge, ipcRenderer } from 'electron'

import { IPC, type WorkplaceApi } from '../shared/ipc'

const api: WorkplaceApi = {
  platform: process.platform,
  keys: {
    status: () => ipcRenderer.invoke(IPC.keysStatus),
    save: (key) => ipcRenderer.invoke(IPC.keysSave, key),
  },
  generation: {
    start: (spec, basePackageId) => ipcRenderer.invoke(IPC.generationStart, spec, basePackageId),
    review: (requestId) => ipcRenderer.invoke(IPC.generationReview, requestId),
    approve: (requestId, replace, icon) => ipcRenderer.invoke(IPC.generationApprove, requestId, replace, icon),
    reject: (requestId) => ipcRenderer.invoke(IPC.generationReject, requestId),
  },
  packages: {
    list: () => ipcRenderer.invoke(IPC.packagesList),
    uninstall: (packageId, deleteData) => ipcRenderer.invoke(IPC.packagesUninstall, packageId, deleteData),
  },
  store: {
    call: (call) => ipcRenderer.invoke(IPC.storeCall, call),
  },
  marketplace: {
    catalog: () => ipcRenderer.invoke(IPC.marketplaceCatalog),
    install: (packageId) => ipcRenderer.invoke(IPC.marketplaceInstall, packageId),
  },
  debug: {
    databases: () => ipcRenderer.invoke(IPC.debugDatabases),
    tables: (packageId) => ipcRenderer.invoke(IPC.debugTables, packageId),
    rows: (packageId, table) => ipcRenderer.invoke(IPC.debugRows, packageId, table),
  },
}

contextBridge.exposeInMainWorld('workplace', api)
