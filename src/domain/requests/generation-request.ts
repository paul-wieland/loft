import { err, ok, type Result } from '../shared/result'

export const MAX_FIX_ATTEMPTS = 3

export type RequestState =
  | 'generating'
  | 'validating'
  | 'needs-fix'
  | 'awaiting-review'
  | 'failed'
  | 'installed'
  | 'rejected'
  | 'discarded'

export interface GenerationRequest {
  id: string
  packageId: string
  spec: string
  state: RequestState
  fixAttempts: number
  errors: string[]
}

export interface NewRequest {
  id: string
  packageId: string
  spec: string
}

type Outcome = Result<GenerationRequest, string>

export function createRequest(input: NewRequest): GenerationRequest {
  return { ...input, state: 'generating', fixAttempts: 0, errors: [] }
}

export const finishGeneration = (request: GenerationRequest): Outcome =>
  move(request, ['generating'], { state: 'validating' })

export const passValidation = (request: GenerationRequest): Outcome =>
  move(request, ['validating'], { state: 'awaiting-review', errors: [] })

export function failValidation(request: GenerationRequest, errors: string[]): Outcome {
  const exhausted = request.fixAttempts >= MAX_FIX_ATTEMPTS
  return move(request, ['validating'], { state: exhausted ? 'failed' : 'needs-fix', errors })
}

export const requestFix = (request: GenerationRequest): Outcome =>
  move(request, ['needs-fix'], { state: 'generating', fixAttempts: request.fixAttempts + 1 })

export const approve = (request: GenerationRequest): Outcome =>
  move(request, ['awaiting-review'], { state: 'installed' })

export const reject = (request: GenerationRequest): Outcome =>
  move(request, ['awaiting-review', 'needs-fix', 'failed'], { state: 'rejected' })

export const cancel = (request: GenerationRequest): Outcome =>
  move(request, ['generating', 'validating'], { state: 'discarded' })

function move(
  request: GenerationRequest,
  from: RequestState[],
  patch: Partial<GenerationRequest> & { state: RequestState },
): Outcome {
  if (!from.includes(request.state)) {
    return err(`cannot change a request in state "${request.state}"`)
  }
  return ok({ ...request, ...patch })
}
