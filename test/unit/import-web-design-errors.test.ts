import { describe, expect, it, vi } from 'vitest'
import { createImportWebDesign, type ImportRenderer, type ImportWebDesignDependencies } from '../../src/application/import-web-design'
import type { FigmaDocument } from '../../src/contracts/api-v1'
import type { ApplicationMessage, AvailableFont } from '../../src/contracts/messages'

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

function errorMessage(requestId: string, message: string): ApplicationMessage {
  return { type: 'IMPORT_STATUS', requestId, status: 'error', message }
}

function createFixture(options: {
  readonly response?: unknown
  readonly requestError?: Error
  readonly pageExists?: boolean
  readonly renderer?: ImportRenderer
}) {
  const messages: ApplicationMessage[] = []
  const requestFigmaDocument = options.requestError === undefined
    ? vi.fn().mockResolvedValue(options.response)
    : vi.fn().mockRejectedValue(options.requestError)
  const dependencies: ImportWebDesignDependencies = {
    postMessage: (message) => messages.push(message),
    pageReader: {
      readStartPage: () => ({ id: 'start-page', hasNodes: false }),
      pageExists: () => options.pageExists ?? true,
      getVisibleContentBounds: () => undefined,
    },
    requestFigmaDocument,
    ...(options.renderer === undefined ? {} : {
      fontCatalog: {
        listAvailableFonts: vi.fn().mockResolvedValue([]),
        isAvailable: vi.fn((font: AvailableFont) => Promise.resolve(font.family === 'available')),
        loadFont: vi.fn().mockResolvedValue({ family: 'Inter', style: 'Regular' }),
      },
      resourceLoader: { resolve: vi.fn().mockResolvedValue([]) },
      renderer: options.renderer,
    }),
  }

  return {
    application: createImportWebDesign(dependencies),
    messages,
    requestFigmaDocument,
  }
}

function startImport(fixture: ReturnType<typeof createFixture>, requestId: string): void {
  fixture.application.handleMessage({ type: 'IMPORT_REQUEST', requestId, url: 'https://example.com/' })
}

describe('import web design error orchestration', () => {
  it('reports the API error message without creating a design', async () => {
    const fixture = createFixture({ response: { code: 'INVALID_URL', message: 'The URL is invalid.' } })

    startImport(fixture, 'api-error')

    await vi.waitFor(() => {
      expect(fixture.messages).toContainEqual(errorMessage('api-error', 'The URL is invalid.'))
    })
  })

  it('reports the defined network error message without creating a design', async () => {
    const fixture = createFixture({ requestError: new Error('Network unavailable') })

    startImport(fixture, 'network-error')

    await vi.waitFor(() => {
      expect(fixture.messages).toContainEqual(
        errorMessage('network-error', 'Unable to reach Figmify API. Please try again.'),
      )
    })
  })

  it('reports an incompatible API v1 contract without creating a design', async () => {
    const fixture = createFixture({ response: { schemaVersion: '2.0' } })

    startImport(fixture, 'invalid-contract')

    await vi.waitFor(() => {
      expect(fixture.messages).toContainEqual(
        errorMessage('invalid-contract', 'The API response is not compatible with API v1.'),
      )
    })
  })

  it('reports that a deleted start page is unavailable without creating a design', async () => {
    const fixture = createFixture({ response: validDocument, pageExists: false })

    startImport(fixture, 'deleted-page')

    await vi.waitFor(() => {
      expect(fixture.messages).toContainEqual(
        errorMessage('deleted-page', 'The import page is no longer available.'),
      )
    })
  })

  it('removes the temporary root and reports a creation failure', async () => {
    const temporaryRoot = { id: 'temporary-root' }
    const renderer: ImportRenderer = {
      createTemporaryRoot: vi.fn(() => temporaryRoot),
      renderCompleteTree: vi.fn().mockRejectedValue(new Error('Figma node creation failed')),
      confirmTemporaryRoot: vi.fn(),
      removeTemporaryRoot: vi.fn(),
    }
    const fixture = createFixture({ response: validDocument, renderer })

    startImport(fixture, 'creation-error')

    await vi.waitFor(() => {
      expect(renderer.removeTemporaryRoot).toHaveBeenCalledWith(temporaryRoot)
      expect(renderer.confirmTemporaryRoot).not.toHaveBeenCalled()
      expect(fixture.messages).toContainEqual(
        errorMessage('creation-error', 'The design could not be created.'),
      )
    })
  })

  it('finishes an errored session so a new import can be requested', async () => {
    const messages: ApplicationMessage[] = []
    const requestFigmaDocument = vi.fn()
      .mockResolvedValueOnce({ schemaVersion: '2.0' })
      .mockResolvedValueOnce(validDocument)
    const application = createImportWebDesign({
      postMessage: (message) => messages.push(message),
      pageReader: {
        readStartPage: () => ({ id: 'start-page', hasNodes: false }),
        pageExists: () => true,
      },
      requestFigmaDocument,
    })

    application.handleMessage({ type: 'IMPORT_REQUEST', requestId: 'failed-request', url: 'https://example.com/' })

    await vi.waitFor(() => {
      expect(messages).toContainEqual(
        errorMessage('failed-request', 'The API response is not compatible with API v1.'),
      )
    })

    application.handleMessage({ type: 'IMPORT_REQUEST', requestId: 'retry-request', url: 'https://example.org/' })

    await vi.waitFor(() => {
      expect(requestFigmaDocument).toHaveBeenCalledTimes(2)
      expect(messages).toContainEqual({
        type: 'IMPORT_STATUS',
        requestId: 'retry-request',
        status: 'processing',
      })
    })
  })
})
