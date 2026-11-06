import { ipcMain } from 'electron'

import type { ApproveRequest } from '../../application/generation/approve-request'
import type { GetReview } from '../../application/generation/get-review'
import type { RejectRequest } from '../../application/generation/reject-request'
import type { StartGeneration } from '../../application/generation/start-generation'
import { IPC } from '../../shared/ipc'

interface GenerationUseCases {
  start: StartGeneration
  review: GetReview
  approve: ApproveRequest
  reject: RejectRequest
}

export function registerGenerationHandlers({ start, review, approve, reject }: GenerationUseCases): void {
  ipcMain.handle(IPC.generationStart, (_event, spec: unknown, basePackageId: unknown) => {
    if (typeof spec !== 'string') return { ok: false, error: 'Describe the tool you want' }
    if (basePackageId !== undefined && typeof basePackageId !== 'string') return { ok: false, error: 'Unknown tool' }
    return start.execute(spec, basePackageId)
  })

  ipcMain.handle(IPC.generationReview, (_event, requestId: unknown) => {
    if (typeof requestId !== 'string') return null
    return review.execute(requestId)
  })

  ipcMain.handle(IPC.generationApprove, (_event, requestId: unknown, replace: unknown, icon: unknown) => {
    if (typeof requestId !== 'string') return { ok: false, error: 'Invalid request' }
    return approve.execute({ requestId, replace: replace === true, icon: typeof icon === 'string' ? icon : undefined })
  })

  ipcMain.handle(IPC.generationReject, (_event, requestId: unknown) => {
    if (typeof requestId !== 'string') return { ok: false, error: 'Invalid request' }
    return reject.execute(requestId)
  })
}
