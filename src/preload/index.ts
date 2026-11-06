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
    approve: (requestId, replace) => ipcRenderer.invoke(IPC.generationApprove, requestId, replace),
    reject: (requestId) => ipcRenderer.invoke(IPC.generationReject, requestId),
  },
  packages: {
    list: () => ipcRenderer.invoke(IPC.packagesList),
    uninstall: (packageId, deleteData) => ipcRenderer.invoke(IPC.packagesUninstall, packageId, deleteData),
  },
  store: {
    call: (call) => ipcRenderer.invoke(IPC.storeCall, call),
  },
  debug: {
    databases: () => ipcRenderer.invoke(IPC.debugDatabases),
    tables: (packageId) => ipcRenderer.invoke(IPC.debugTables, packageId),
    rows: (packageId, table) => ipcRenderer.invoke(IPC.debugRows, packageId, table),
  },
}

contextBridge.exposeInMainWorld('workplace', api)
