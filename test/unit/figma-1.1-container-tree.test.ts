import { describe, expect, it, vi } from 'vitest'
import type { FigmaDocument } from '../../src/contracts/api-v1'
import { buildRenderPlan } from '../../src/domain/render-plan'
import {
  createDocumentRenderer,
  type DocumentRendererFigma,
  type TemporaryRootNode,
} from '../../src/infrastructure/figma/document-renderer'
import { createResourceLoader } from '../../src/infrastructure/figma/resource-loader'
import { apiV1Schema11Fixture } from '../fixtures/api-v1-schema-1.1'

interface FakeNode extends TemporaryRootNode {
  name?: string
  opacity?: number
  fills?: unknown
  readonly children: FakeNode[]
}

function createNode(): FakeNode {
  return {
    visible: true,
    x: 0,
    y: 0,
    children: [],
    resize: vi.fn(),
    appendChild(node: TemporaryRootNode): void {
      this.children.push(node as FakeNode)
    },
    remove: vi.fn(),
  }
}

describe('Figma 1.1 image-background container tree', () => {
  it('imports simplesite into one Frame > html > body > div tree and preserves the body background', async () => {
    const document = apiV1Schema11Fixture as unknown as FigmaDocument
    const pageChildren: FakeNode[] = []
    const figma = {
      createFrame: vi.fn(createNode),
      createText: vi.fn(createNode),
      createRectangle: vi.fn(createNode),
      createNodeFromSvg: vi.fn(createNode),
      createImageAsync: vi.fn().mockResolvedValue({ hash: 'body-background-hash' }),
      loadFontAsync: vi.fn().mockResolvedValue(undefined),
    }
    const resourceLoader = createResourceLoader(figma)
    const body = document.document.children[0]
    const backgroundPaint = body.fills?.[0]

    if (backgroundPaint?.type !== 'IMAGE') {
      throw new Error('The Figma 1.1 fixture must define an image background on body.')
    }

    const resources = await resourceLoader.resolve([{
      id: body.id,
      kind: 'image',
      source: backgroundPaint.src,
      rect: body.rect,
    }])
    const plan = buildRenderPlan(document.document, document.styles, [], resources)
    const renderer = createDocumentRenderer(figma as unknown as DocumentRendererFigma)
    const page = {
      appendChild(node: TemporaryRootNode): void {
        pageChildren.push(node as FakeNode)
      },
    }

    const temporaryRoot = renderer.createTemporaryRoot(page, document.document.rect)
    await renderer.renderCompleteTree(plan, temporaryRoot)
    renderer.confirmTemporaryRoot(temporaryRoot, { x: 0, y: 0 })

    const [importFrame] = pageChildren
    const [html] = importFrame.children
    const [renderedBody] = html.children
    const [div] = renderedBody.children

    expect(document.source.url).toBe('https://simplesite.ayra.ch/')
    expect(figma.createImageAsync).toHaveBeenCalledWith(backgroundPaint.src)
    expect(pageChildren).toEqual([importFrame])
    expect(importFrame.children).toEqual([html])
    expect(html).toMatchObject({ name: 'html' })
    expect(html.children).toEqual([renderedBody])
    expect(renderedBody).toMatchObject({
      name: 'body',
      fills: [{ type: 'IMAGE', imageHash: 'body-background-hash', scaleMode: 'FILL' }],
    })
    expect(renderedBody.children).toEqual([div])
    expect(div).toMatchObject({ name: 'div' })
    expect(div.children).toEqual([])
  })
})
