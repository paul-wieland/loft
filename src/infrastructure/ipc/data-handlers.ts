import { ipcMain } from 'electron'

import type { DataCall, DataOperation, PackageData } from '../../application/data/package-data'
import { IPC } from '../../shared/ipc'

const OPERATIONS: DataOperation[] = ['list', 'get', 'insert', 'update', 'remove']

export function registerDataHandlers({ call }: { call: PackageData }): void {
  ipcMain.handle(IPC.storeCall, async (_event, request: unknown) => {
    if (!isDataCall(request)) return { ok: false, error: 'Invalid store call' }
    try {
      const result = await call.execute(request)
      console.log('[store]', request.packageId, request.op, result.ok ? 'ok' : result.error)
      return result
    } catch (error) {
      console.error('[store]', request.packageId, request.op, error)
      return { ok: false, error: error instanceof Error ? error.message : 'Store call failed' }
    }
  })
}

function isDataCall(value: unknown): value is DataCall {
  if (typeof value !== 'object' || value === null) return false
  const request = value as Record<string, unknown>
  const args = request.args as Record<string, unknown> | undefined
  return (
    typeof request.packageId === 'string' &&
    OPERATIONS.includes(request.op as DataOperation) &&
    typeof args === 'object' &&
    args !== null &&
    typeof args.collection === 'string'
  )
}
