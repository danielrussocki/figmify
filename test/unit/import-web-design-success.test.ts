import { describe, expect, it, vi } from 'vitest'
import * as importWebDesignModule from '../../src/application/import-web-design'
import type { FigmaDocument, FigmaRect } from '../../src/contracts/api-v1'
import type { ApplicationMessage, AvailableFont, InterfaceMessage } from '../../src/contracts/messages'
import type { ImportDestination, VisibleContentBounds } from '../../src/domain/placement'
import type { RenderPlanNode } from '../../src/domain/render-plan'
import type { NonTypographyResourceResult } from '../../src/infrastructure/figma/resource-loader'

interface StartPage {
  readonly id: string
  readonly hasNodes: boolean
}

interface TemporaryRoot {
  readonly id: string
}

interface TemporaryRootGeometry {
  readonly width: number
  readonly height: number
}

interface ImportWebDesignDependencies {
  readonly postMessage: (message: ApplicationMessage) => void
  readonly pageReader: {
    readStartPage(): StartPage
    pageExists(pageId: string): boolean
    getVisibleContentBounds(pageId: string, excludingTemporaryRoot: TemporaryRoot): VisibleContentBounds | undefined
  }
  readonly requestFigmaDocument: (url: string, signal: AbortSignal) => Promise<FigmaDocument>
  readonly fontCatalog: {
    listAvailableFonts(): Promise<readonly AvailableFont[]>
    isAvailable(font: AvailableFont): Promise<boolean>
    loadFont(font?: AvailableFont): Promise<AvailableFont>
  }
  readonly resourceLoader: {
    resolve(resources: readonly { readonly id: string; readonly kind: 'image' | 'icon'; readonly source: string; readonly rect: FigmaRect }[]): Promise<readonly NonTypographyResourceResult[]>
  }
  readonly renderer: {
    createTemporaryRoot(pageId: string, geometry: TemporaryRootGeometry): TemporaryRoot
    renderCompleteTree(plan: RenderPlanNode, temporaryRoot: TemporaryRoot): Promise<void>
    confirmTemporaryRoot(temporaryRoot: TemporaryRoot, destination: ImportDestination): void
    removeTemporaryRoot(temporaryRoot: TemporaryRoot): void
  }
}

interface ImportWebDesign {
  handleMessage(message: InterfaceMessage): void
}

type CreateImportWebDesign = (dependencies: ImportWebDesignDependencies) => ImportWebDesign

const availableFont: AvailableFont = { family: 'Inter', style: 'Regular' }
const missingFont: AvailableFont = { family: 'Missing Sans', style: 'Bold' }

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
    rect: { x: 0, y: 0, width: 1280, height: 720, top: 0, left: 0 },
    isVisible: true,
    children: [
      {
        id: 'headline',
        tag: 'h1',
        type: 'TEXT',
        rect: { x: 80, y: 96, width: 500, height: 72, top: 96, left: 80 },
        isVisible: true,
        characters: 'Build faster',
        styles: {
          fontFamily: missingFont.family,
          fontSize: 56,
          fontWeight: 700,
          lineHeight: 64,
          letterSpacing: -1,
          textAlign: 'LEFT',
          textAutoResize: 'HEIGHT',
        },
        children: [],
      },
      {
        id: 'hero-image',
        tag: 'img',
        type: 'IMAGE',
        rect: { x: 80, y: 208, width: 640, height: 360, top: 208, left: 80 },
        isVisible: true,
        fills: [{ type: 'IMAGE', src: 'https://images.example.com/hero.jpg', scaleMode: 'FILL' }],
        children: [],
      },
    ],
  },
}

function createImportWebDesign(dependencies: ImportWebDesignDependencies): ImportWebDesign {
  const factory = (importWebDesignModule as { createImportWebDesign?: CreateImportWebDesign }).createImportWebDesign
  expect(factory).toBeTypeOf('function')

  return (factory as CreateImportWebDesign)(dependencies)
}

function createFixture(options: {
  startPageHasNodes: boolean
  resourceResults: readonly NonTypographyResourceResult[]
  document?: FigmaDocument
}): {
  application: ImportWebDesign
  messages: ApplicationMessage[]
  requestFigmaDocument: ReturnType<typeof vi.fn>
  resourceLoader: { resolve: ReturnType<typeof vi.fn> }
  renderer: ImportWebDesignDependencies['renderer']
} {
  const messages: ApplicationMessage[] = []
  const temporaryRoot = { id: 'temporary-root' }
  const renderer = {
    createTemporaryRoot: vi.fn(() => temporaryRoot),
    renderCompleteTree: vi.fn().mockResolvedValue(undefined),
    confirmTemporaryRoot: vi.fn(),
    removeTemporaryRoot: vi.fn(),
  }
  const requestFigmaDocument = vi.fn().mockResolvedValue(options.document ?? validDocument)
  const resourceLoader = { resolve: vi.fn().mockResolvedValue(options.resourceResults) }
  const application = createImportWebDesign({
    postMessage: (message) => messages.push(message),
    pageReader: {
      readStartPage: () => ({ id: 'start-page', hasNodes: options.startPageHasNodes }),
      pageExists: () => true,
      getVisibleContentBounds: vi.fn(() => ({ left: 20, top: 40, right: 320, bottom: 200 })),
    },
    requestFigmaDocument,
    fontCatalog: {
      listAvailableFonts: vi.fn().mockResolvedValue([availableFont]),
      isAvailable: vi.fn((font: AvailableFont) => Promise.resolve(font.family !== missingFont.family)),
      loadFont: vi.fn().mockResolvedValue(availableFont),
    },
    resourceLoader,
    renderer,
  })

  return { application, messages, requestFigmaDocument, resourceLoader, renderer }
}

describe('import web design successful orchestration', () => {
  it('requests confirmation, substitutes unavailable fonts, resolves resources, renders, places, and reports success', async () => {
    const fixture = createFixture({
      startPageHasNodes: true,
      resourceResults: [{ id: 'hero-image', kind: 'resolved', imageHash: 'hero-image-hash' }],
    })

    fixture.application.handleMessage({ type: 'IMPORT_REQUEST', requestId: 'request-1', url: 'https://example.com/' })

    expect(fixture.messages).toEqual([{ type: 'CONFIRM_APPEND', requestId: 'request-1' }])
    expect(fixture.requestFigmaDocument).not.toHaveBeenCalled()

    fixture.application.handleMessage({ type: 'IMPORT_DECISION', requestId: 'request-1', decision: 'add' })

    await vi.waitFor(() => {
      expect(fixture.messages).toContainEqual({ type: 'IMPORT_STATUS', requestId: 'request-1', status: 'processing' })
      expect(fixture.messages).toContainEqual({
        type: 'FONT_SUBSTITUTION_REQUIRED',
        requestId: 'request-1',
        sourceFont: missingFont,
        availableFonts: [availableFont],
      })
    })
    expect(fixture.requestFigmaDocument).toHaveBeenCalledWith('https://example.com/', expect.any(AbortSignal))

    fixture.application.handleMessage({
      type: 'FONT_SUBSTITUTION_DECISION',
      requestId: 'request-1',
      sourceFont: missingFont,
      selection: availableFont,
    })

    await vi.waitFor(() => {
      expect(fixture.resourceLoader.resolve).toHaveBeenCalledWith([
        {
          id: 'hero-image',
          kind: 'image',
          source: 'https://images.example.com/hero.jpg',
          rect: validDocument.document.children[1].rect,
        },
      ])
      expect(fixture.renderer.createTemporaryRoot).toHaveBeenCalledWith('start-page', {
        width: validDocument.document.rect.width,
        height: validDocument.document.rect.height,
      })
      expect(fixture.renderer.renderCompleteTree).toHaveBeenCalledOnce()
      expect(fixture.renderer.confirmTemporaryRoot).toHaveBeenCalledWith({ id: 'temporary-root' }, { x: 420, y: 40 })
      expect(fixture.messages).toContainEqual({ type: 'IMPORT_STATUS', requestId: 'request-1', status: 'success' })
    })
  })

  it('does not send an inline SVG node to the external resource resolver', async () => {
    const inlineSvgDocument: FigmaDocument = {
      ...validDocument,
      document: {
        ...validDocument.document,
        children: [{
          id: 'inline-icon',
          tag: 'svg',
          type: 'FRAME',
          rect: { x: 48, y: 72, width: 24, height: 24, top: 72, left: 48 },
          isVisible: true,
          svg: '<svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z" /></svg>',
          image: { src: 'https://images.example.com/icon.svg', backgroundSize: 'contain' },
          children: [],
        }],
      },
    }
    const fixture = createFixture({
      startPageHasNodes: false,
      resourceResults: [],
      document: inlineSvgDocument,
    })

    fixture.application.handleMessage({ type: 'IMPORT_REQUEST', requestId: 'request-inline-svg', url: 'https://example.com/' })

    await vi.waitFor(() => {
      expect(fixture.resourceLoader.resolve).toHaveBeenCalledWith([])
      expect(fixture.messages).toContainEqual({
        type: 'IMPORT_STATUS',
        requestId: 'request-inline-svg',
        status: 'success',
      })
    })
  })

  it('reports a warning after a default-font substitution or resource placeholder', async () => {
    const fixture = createFixture({
      startPageHasNodes: false,
      resourceResults: [{
        id: 'hero-image',
        kind: 'placeholder',
        rect: validDocument.document.children[1].rect,
        label: 'Image resource unavailable.',
      }],
    })

    fixture.application.handleMessage({ type: 'IMPORT_REQUEST', requestId: 'request-2', url: 'https://example.com/' })

    await vi.waitFor(() => {
      expect(fixture.messages).toContainEqual({
        type: 'FONT_SUBSTITUTION_REQUIRED',
        requestId: 'request-2',
        sourceFont: missingFont,
        availableFonts: [availableFont],
      })
    })
    fixture.application.handleMessage({
      type: 'FONT_SUBSTITUTION_DECISION',
      requestId: 'request-2',
      sourceFont: missingFont,
      selection: 'default',
    })

    await vi.waitFor(() => {
      expect(fixture.renderer.confirmTemporaryRoot).toHaveBeenCalledWith({ id: 'temporary-root' }, { x: 420, y: 40 })
      expect(fixture.messages).toContainEqual(expect.objectContaining({
        type: 'IMPORT_STATUS',
        requestId: 'request-2',
        status: 'warning',
      }))
    })
  })
})
