import type { RequestId } from '../contracts/messages'

export type ImportState =
  | 'idle'
  | 'confirming'
  | 'processing'
  | 'success'
  | 'warning'
  | 'error'
  | 'cancelled'

export type AppendDecision = 'add' | 'cancel'
export type ImportCompletion = 'success' | 'warning' | 'error'

export interface ImportStateMachine {
  readonly state: ImportState
  requestImport(requestId: RequestId, requiresAppendConfirmation: boolean): boolean
  resolveAppendDecision(requestId: RequestId, decision: AppendDecision): boolean
  complete(requestId: RequestId, completion: ImportCompletion): boolean
  cancel(requestId: RequestId): boolean
}

export function createImportStateMachine(): ImportStateMachine {
  let state: ImportState = 'idle'
  let activeRequestId: RequestId | undefined

  const isActiveRequest = (requestId: RequestId): boolean => activeRequestId === requestId

  const endActiveSession = (nextState: ImportState): void => {
    state = nextState
    activeRequestId = undefined
  }

  return {
    get state(): ImportState {
      return state
    },

    requestImport(requestId: RequestId, requiresAppendConfirmation: boolean): boolean {
      if (activeRequestId !== undefined) {
        return false
      }

      activeRequestId = requestId
      state = requiresAppendConfirmation ? 'confirming' : 'processing'
      return true
    },

    resolveAppendDecision(requestId: RequestId, decision: AppendDecision): boolean {
      if (!isActiveRequest(requestId) || state !== 'confirming') {
        return false
      }

      if (decision === 'cancel') {
        endActiveSession('cancelled')
      } else {
        state = 'processing'
      }

      return true
    },

    complete(requestId: RequestId, completion: ImportCompletion): boolean {
      if (!isActiveRequest(requestId) || state !== 'processing') {
        return false
      }

      endActiveSession(completion)
      return true
    },

    cancel(requestId: RequestId): boolean {
      if (!isActiveRequest(requestId)) {
        return false
      }

      endActiveSession('cancelled')
      return true
    },
  }
}
