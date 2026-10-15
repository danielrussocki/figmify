import { describe, expect, it, vi } from 'vitest'
import { createImportWebDesign, type ImportWebDesignDependencies, type ImportRenderer } from '../../src/application/import-web-design'
import type { FigmaDocument } from '../../src/contracts/api-v1'
import type { ApplicationMessage } from '../../src/contracts/messages'

const validDocument: FigmaDocument = {
  schemaVersion: '1.0',
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

interface DeferredPromise<T> {
  readonly promise: Promise<T>
  resolve(value: T): void
}

function createDeferred<T>(): DeferredPromise<T> {
  let resolvePromise: (value: T) => void = () => undefined
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve
  })

  return { promise, resolve: resolvePromise }
}

function createFixture(options: {
  readonly pageExists?: () => boolean
  readonly getVisibleContentBounds?: ImportWebDesignDependencies['pageReader']['getVisibleContentBounds']
  readonly renderer?: ImportRenderer
}) {
  const messages: ApplicationMessage[] = []
  const requestFigmaDocument = vi.fn()
  const renderer = options.renderer ?? {
    createTemporaryRoot: vi.fn(() => ({ id: 'temporary-root' })),
    renderCompleteTree: vi.fn().mockResolvedValue(undefined),
    confirmTemporaryRoot: vi.fn(),
    removeTemporaryRoot: vi.fn(),
  }
  const application = createImportWebDesign({
    postMessage: (message) => messages.push(message),
    pageReader: {
      readStartPage: () => ({ id: 'start-page', hasNodes: false }),
      pageExists: options.pageExists ?? (() => true),
      getVisibleContentBounds: options.getVisibleContentBounds,
    },
    requestFigmaDocument,
    fontCatalog: {
      listAvailableFonts: vi.fn().mockResolvedValue([]),
      isAvailable: vi.fn().mockResolvedValue(true),
      loadFont: vi.fn().mockResolvedValue({ family: 'Inter', style: 'Regular' }),
    },
    resourceLoader: { resolve: vi.fn().mockResolvedValue([]) },
    renderer,
  })

  return { application, messages, requestFigmaDocument, renderer }
}

describe('import web design lifecycle and races', () => {
  it('aborts a cancelled request and discards its late response', async () => {
    const response = createDeferred<FigmaDocument>()
    const fixture = createFixture({})
    fixture.requestFigmaDocument.mockImplementationOnce((_url: string, signal: AbortSignal) => {
      expect(signal.aborted).toBe(false)
      return response.promise
    })

    fixture.application.handleMessage({ type: 'IMPORT_REQUEST', requestId: 'cancelled-request', url: 'https://example.com/' })
    fixture.application.handleMessage({ type: 'CANCEL_IMPORT', requestId: 'cancelled-request' })
    response.resolve(validDocument)

    await vi.waitFor(() => {
      expect(fixture.requestFigmaDocument).toHaveBeenCalledOnce()
    })
    await Promise.resolve()

    expect(fixture.renderer.createTemporaryRoot).not.toHaveBeenCalled()
    expect(fixture.messages).not.toContainEqual({ type: 'IMPORT_STATUS', requestId: 'cancelled-request', status: 'success' })
  })

  it('aborts a request when the plugin closes and discards its late response', async () => {
    const response = createDeferred<FigmaDocument>()
    const fixture = createFixture({})
    fixture.requestFigmaDocument.mockReturnValueOnce(response.promise)

    fixture.application.handleMessage({ type: 'IMPORT_REQUEST', requestId: 'closed-request', url: 'https://example.com/' })
    fixture.application.handleMessage({ type: 'CLOSE_PLUGIN', requestId: 'closed-request' })
    response.resolve(validDocument)

    await vi.waitFor(() => {
      expect(fixture.requestFigmaDocument).toHaveBeenCalledOnce()
    })
    await Promise.resolve()

    expect(fixture.renderer.createTemporaryRoot).not.toHaveBeenCalled()
    expect(fixture.messages).not.toContainEqual({ type: 'IMPORT_STATUS', requestId: 'closed-request', status: 'success' })
  })

  it('does not let a late response from an inactive request affect a later import', async () => {
    const firstResponse = createDeferred<FigmaDocument>()
    const fixture = createFixture({})
    fixture.requestFigmaDocument
      .mockReturnValueOnce(firstResponse.promise)
      .mockResolvedValueOnce(validDocument)

    fixture.application.handleMessage({ type: 'IMPORT_REQUEST', requestId: 'first-request', url: 'https://example.com/first' })
    fixture.application.handleMessage({ type: 'CANCEL_IMPORT', requestId: 'first-request' })
    fixture.application.handleMessage({ type: 'IMPORT_REQUEST', requestId: 'second-request', url: 'https://example.com/second' })
    firstResponse.resolve(validDocument)

    await vi.waitFor(() => {
      expect(fixture.renderer.createTemporaryRoot).toHaveBeenCalledTimes(1)
      expect(fixture.messages).toContainEqual({ type: 'IMPORT_STATUS', requestId: 'second-request', status: 'success' })
    })

    expect(fixture.messages).not.toContainEqual({ type: 'IMPORT_STATUS', requestId: 'first-request', status: 'success' })
  })

  it('renders on the captured start page after the user changes the current page', async () => {
    const response = createDeferred<FigmaDocument>()
    const fixture = createFixture({})
    fixture.requestFigmaDocument.mockReturnValueOnce(response.promise)

    fixture.application.handleMessage({ type: 'IMPORT_REQUEST', requestId: 'page-change', url: 'https://example.com/' })
    response.resolve(validDocument)

    await vi.waitFor(() => {
      expect(fixture.renderer.createTemporaryRoot).toHaveBeenCalledWith('start-page')
      expect(fixture.renderer.confirmTemporaryRoot).toHaveBeenCalled()
    })
  })

  it('reports a deleted start page when it disappears while the response is pending', async () => {
    const response = createDeferred<FigmaDocument>()
    let pageExists = true
    const fixture = createFixture({ pageExists: () => pageExists })
    fixture.requestFigmaDocument.mockReturnValueOnce(response.promise)

    fixture.application.handleMessage({ type: 'IMPORT_REQUEST', requestId: 'deleted-page', url: 'https://example.com/' })
    pageExists = false
    response.resolve(validDocument)

    await vi.waitFor(() => {
      expect(fixture.messages).toContainEqual({
        type: 'IMPORT_STATUS',
        requestId: 'deleted-page',
        status: 'error',
        message: 'The import page is no longer available.',
      })
    })
    expect(fixture.renderer.createTemporaryRoot).not.toHaveBeenCalled()
  })

  it('uses content added during the wait to calculate the final destination', async () => {
    const response = createDeferred<FigmaDocument>()
    let contentWasAdded = false
    const fixture = createFixture({
      getVisibleContentBounds: () => contentWasAdded
        ? { left: 20, top: 40, right: 320, bottom: 200 }
        : undefined,
    })
    fixture.requestFigmaDocument.mockReturnValueOnce(response.promise)

    fixture.application.handleMessage({ type: 'IMPORT_REQUEST', requestId: 'content-change', url: 'https://example.com/' })
    contentWasAdded = true
    response.resolve(validDocument)

    await vi.waitFor(() => {
      expect(fixture.renderer.confirmTemporaryRoot).toHaveBeenCalledWith({ id: 'temporary-root' }, { x: 420, y: 40 })
    })
  })
})
