import { describe, expect, it } from 'vitest'
import {
  MAX_FIX_ATTEMPTS,
  approve,
  cancel,
  createRequest,
  failValidation,
  finishGeneration,
  passValidation,
  reject,
  requestFix,
  type GenerationRequest,
} from '../../../src/domain/requests/generation-request'
import { unwrap } from '../../support/fakes'

function newRequest(): GenerationRequest {
  return createRequest({ id: 'req-1', packageId: 'todo-list', spec: 'a todo list' })
}

describe('generation request', () => {
  it('S12: moves from generation through review to install', () => {
    let request = unwrap(finishGeneration(newRequest()))
    request = unwrap(passValidation(request))
    expect(request.state).toBe('awaiting-review')
    expect(unwrap(approve(request)).state).toBe('installed')
  })

  it('S10: allows at most three fix attempts, then fails', () => {
    let request = unwrap(finishGeneration(newRequest()))
    request = unwrap(failValidation(request, ['bad manifest']))
    expect(request.state).toBe('needs-fix')

    for (let attempt = 0; attempt < MAX_FIX_ATTEMPTS; attempt++) {
      request = unwrap(requestFix(request))
      request = unwrap(finishGeneration(request))
      request = unwrap(failValidation(request, ['still bad']))
    }

    expect(request.state).toBe('failed')
    expect(request.fixAttempts).toBe(MAX_FIX_ATTEMPTS)
    expect(requestFix(request).ok).toBe(false)
  })

  it('S13: cannot approve a request that is not awaiting review', () => {
    expect(approve(newRequest()).ok).toBe(false)
  })

  it('S14: can reject from review, but not after install', () => {
    const reviewed = unwrap(passValidation(unwrap(finishGeneration(newRequest()))))
    expect(unwrap(reject(reviewed)).state).toBe('rejected')

    const installed = unwrap(approve(reviewed))
    expect(reject(installed).ok).toBe(false)
  })

  it('S8: cancel is allowed while generating, not while awaiting review', () => {
    expect(unwrap(cancel(newRequest())).state).toBe('discarded')

    const reviewed = unwrap(passValidation(unwrap(finishGeneration(newRequest()))))
    expect(cancel(reviewed).ok).toBe(false)
  })
})
