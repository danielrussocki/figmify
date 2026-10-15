import { hasValidApiV1Document, type FigmaDocument } from '../contracts/api-v1'
import type { ApplicationMessage, InterfaceMessage, RequestId } from '../contracts/messages'
import { createImportStateMachine, type ImportStateMachine } from '../domain/import-session'
import { requiresAppendConfirmation } from '../domain/placement'

export interface StartPageReader {
  readStartPage(): { readonly id: string; readonly hasNodes: boolean }
}

export interface ValidatedImport {
  readonly requestId: RequestId
  readonly startPageId: string
}

export interface ImportWebDesignDependencies {
  readonly postMessage: (message: ApplicationMessage) => void
  readonly pageReader: StartPageReader
  readonly requestFigmaDocument: (url: string, signal: AbortSignal) => Promise<unknown>
  readonly onValidatedDocument?: (document: FigmaDocument, importContext: ValidatedImport) => void
}

export interface ImportWebDesign {
  handleMessage(message: InterfaceMessage): void
}

interface ActiveImport {
  readonly requestId: RequestId
  readonly url: string
  readonly startPageId: string
  readonly abortController: AbortController
}

export function createImportWebDesign(dependencies: ImportWebDesignDependencies): ImportWebDesign {
  const stateMachine = createImportStateMachine()
  let activeImport: ActiveImport | undefined

  const startRequest = (active: ActiveImport): void => {
    dependencies.postMessage({ type: 'IMPORT_STATUS', requestId: active.requestId, status: 'processing' })
    void requestAndValidate(active, dependencies, stateMachine, () => activeImport)
  }

  return {
    handleMessage(message: InterfaceMessage): void {
      if (message.type === 'IMPORT_REQUEST') {
        const startPage = dependencies.pageReader.readStartPage()
        const needsConfirmation = requiresAppendConfirmation(startPage.hasNodes)
        if (!stateMachine.requestImport(message.requestId, needsConfirmation)) {
          return
        }

        activeImport = {
          requestId: message.requestId,
          url: message.url,
          startPageId: startPage.id,
          abortController: new AbortController(),
        }

        if (needsConfirmation) {
          dependencies.postMessage({ type: 'CONFIRM_APPEND', requestId: message.requestId })
        } else {
          startRequest(activeImport)
        }
        return
      }

      if (message.type === 'IMPORT_DECISION') {
        if (!stateMachine.resolveAppendDecision(message.requestId, message.decision)) {
          return
        }
        if (message.decision === 'cancel') {
          activeImport = undefined
          return
        }
        if (activeImport !== undefined && activeImport.requestId === message.requestId) {
          startRequest(activeImport)
        }
        return
      }

      if (message.type === 'CANCEL_IMPORT' || message.type === 'CLOSE_PLUGIN') {
        if (stateMachine.cancel(message.requestId) && activeImport?.requestId === message.requestId) {
          activeImport.abortController.abort()
          activeImport = undefined
        }
      }
    },
  }
}

async function requestAndValidate(
  activeImport: ActiveImport,
  dependencies: ImportWebDesignDependencies,
  stateMachine: ImportStateMachine,
  getActiveImport: () => ActiveImport | undefined,
): Promise<void> {
  let response: unknown
  try {
    response = await dependencies.requestFigmaDocument(activeImport.url, activeImport.abortController.signal)
  } catch {
    return
  }

  if (getActiveImport()?.requestId !== activeImport.requestId || stateMachine.state !== 'processing') {
    return
  }

  if (!hasValidApiV1Document(response)) {
    return
  }

  dependencies.onValidatedDocument?.(response, {
    requestId: activeImport.requestId,
    startPageId: activeImport.startPageId,
  })
}
