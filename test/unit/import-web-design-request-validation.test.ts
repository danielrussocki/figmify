import { describe, expect, it, vi } from 'vitest'
import { createImportWebDesign, type ImportWebDesignDependencies } from '../../src/application/import-web-design'
import type { FigmaDocument } from '../../src/contracts/api-v1'
import type { ApplicationMessage } from '../../src/contracts/messages'

const validDocument: FigmaDocument = {
  schemaVersion: '1.1',
  source: {
    url: 'https://example.com/',
    viewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
  },
  styles: { colors: [], typographies: [] },
  assets: [],
  document: {
    id: 'root',
    tag: 'body',
    type: 'FRAME',
    rect: { x: 0, y: 0, width: 1440, height: 900, top: 0, left: 0 },
    isVisible: true,
    children: [],
  },
}

function createFixture(options: { readonly startPageHasNodes: boolean; readonly response?: unknown }) {
  const messages: ApplicationMessage[] = []
  const onValidatedDocument = vi.fn()
  const requestFigmaDocument = vi.fn().mockResolvedValue(options.response ?? validDocument)
  const dependencies: ImportWebDesignDependencies = {
    postMessage: (message) => messages.push(message),
    pageReader: {
      readStartPage: () => ({ id: 'start-page', hasNodes: options.startPageHasNodes }),
      pageExists: () => true,
    },
    requestFigmaDocument,
    onValidatedDocument,
  }

  return {
    application: createImportWebDesign(dependencies),
    messages,
    onValidatedDocument,
    requestFigmaDocument,
  }
}

describe('import web design request orchestration', () => {
  it('starts a session, publishes processing, requests the original URL, and passes a validated response onward', async () => {
    const fixture = createFixture({ startPageHasNodes: false })

    fixture.application.handleMessage({ type: 'IMPORT_REQUEST', requestId: 'request-1', url: ' https://example.com/ ' })

    await vi.waitFor(() => {
      expect(fixture.messages).toEqual([{ type: 'IMPORT_STATUS', requestId: 'request-1', status: 'processing' }])
      expect(fixture.requestFigmaDocument).toHaveBeenCalledWith(' https://example.com/ ', expect.any(AbortSignal))
      expect(fixture.onValidatedDocument).toHaveBeenCalledWith(validDocument, {
        requestId: 'request-1',
        startPageId: 'start-page',
      })
    })
  })

  it('waits for append confirmation before starting the session request', async () => {
    const fixture = createFixture({ startPageHasNodes: true })

    fixture.application.handleMessage({ type: 'IMPORT_REQUEST', requestId: 'request-2', url: 'https://example.com/' })

    expect(fixture.messages).toEqual([{ type: 'CONFIRM_APPEND', requestId: 'request-2' }])
    expect(fixture.requestFigmaDocument).not.toHaveBeenCalled()

    fixture.application.handleMessage({ type: 'IMPORT_DECISION', requestId: 'request-2', decision: 'add' })

    await vi.waitFor(() => {
      expect(fixture.messages).toContainEqual({ type: 'IMPORT_STATUS', requestId: 'request-2', status: 'processing' })
      expect(fixture.requestFigmaDocument).toHaveBeenCalledWith('https://example.com/', expect.any(AbortSignal))
    })
  })

  it('does not pass an incompatible response beyond validation', async () => {
    const fixture = createFixture({ startPageHasNodes: false, response: { schemaVersion: '2.0' } })

    fixture.application.handleMessage({ type: 'IMPORT_REQUEST', requestId: 'request-3', url: 'https://example.com/' })

    await vi.waitFor(() => {
      expect(fixture.requestFigmaDocument).toHaveBeenCalledOnce()
    })
    expect(fixture.onValidatedDocument).not.toHaveBeenCalled()
  })
})
