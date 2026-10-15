import { describe, expect, it, vi } from 'vitest'
import * as documentRendererModule from '../../src/infrastructure/figma/document-renderer'
import type { RenderPlanNode } from '../../src/domain/render-plan'

interface FakeNode {
  readonly id: string
  removed: boolean
  visible: boolean
  children: FakeNode[]
  remove(): void
}

interface FakePage {
  children: FakeNode[]
  appendChild(node: FakeNode): void
}

interface RendererFigma {
  createFrame(): FakeNode
  createText(): FakeNode
  createRectangle(): FakeNode
  loadFontAsync(font: { readonly family: string; readonly style: string }): Promise<void>
}

interface DocumentRenderer {
  createTemporaryRoot(page: FakePage): FakeNode
  renderCompleteTree(plan: RenderPlanNode, temporaryRoot: FakeNode): Promise<void>
  removeTemporaryRoot(temporaryRoot: FakeNode): void
}

type CreateDocumentRenderer = (figma: RendererFigma) => DocumentRenderer

function createNode(id: string, page: FakePage): FakeNode {
  const node: FakeNode = {
    id,
    removed: false,
    visible: true,
    children: [],
    remove(): void {
      node.removed = true
      const index = page.children.indexOf(node)
      if (index >= 0) {
        page.children.splice(index, 1)
      }
    },
  }

  return node
}

function createPage(): FakePage {
  return {
    children: [],
    appendChild(node: FakeNode): void {
      this.children.push(node)
    },
  }
}

function createFigma(page: FakePage): RendererFigma {
  let nextNodeId = 0
  const createNodeForPage = (): FakeNode => createNode(`created-${nextNodeId++}`, page)

  return {
    createFrame: vi.fn(createNodeForPage),
    createText: vi.fn(createNodeForPage),
    createRectangle: vi.fn(createNodeForPage),
    loadFontAsync: vi.fn().mockResolvedValue(undefined),
  }
}

function rendererFor(figma: RendererFigma): DocumentRenderer {
  const factory = (documentRendererModule as { createDocumentRenderer?: CreateDocumentRenderer }).createDocumentRenderer
  expect(factory).toBeTypeOf('function')
  return (factory as CreateDocumentRenderer)(figma)
}

async function renderAtomically(
  renderer: DocumentRenderer,
  page: FakePage,
  plan: RenderPlanNode,
): Promise<void> {
  const temporaryRoot = renderer.createTemporaryRoot(page)

  try {
    await renderer.renderCompleteTree(plan, temporaryRoot)
  } catch (error: unknown) {
    renderer.removeTemporaryRoot(temporaryRoot)
    throw error
  }
}

function framePlan(children: readonly RenderPlanNode[] = []): RenderPlanNode {
  return {
    id: 'design-root',
    type: 'FRAME',
    geometry: { x: 0, y: 0, width: 320, height: 180 },
    isVisible: true,
    opacity: 1,
    children,
  }
}

describe('Figma document renderer atomicity', () => {
  it('removes the temporary root and preserves existing nodes when node creation fails', async () => {
    const page = createPage()
    const existingNode = createNode('existing-node', page)
    page.appendChild(existingNode)
    const figma = createFigma(page)
    figma.createFrame = vi.fn()
      .mockImplementationOnce(() => createNode('temporary-root', page))
      .mockImplementationOnce(() => createNode('design-root', page))
      .mockImplementationOnce(() => {
        throw new Error('Unable to create child node')
      })
    const renderer = rendererFor(figma)

    await expect(renderAtomically(renderer, page, framePlan([framePlan()]))).rejects.toThrow('Unable to create child node')

    expect(page.children).toEqual([existingNode])
  })

  it('removes the temporary root and preserves existing nodes when loading a text font fails', async () => {
    const page = createPage()
    const existingNode = createNode('existing-node', page)
    page.appendChild(existingNode)
    const figma = createFigma(page)
    figma.loadFontAsync = vi.fn().mockRejectedValue(new Error('Font is unavailable'))
    const renderer = rendererFor(figma)
    const textPlan: RenderPlanNode = {
      ...framePlan(),
      id: 'headline',
      type: 'TEXT',
      text: {
        characters: 'Build faster',
        font: { family: 'Unavailable Sans', style: 'Regular' },
      },
    }

    await expect(renderAtomically(renderer, page, framePlan([textPlan]))).rejects.toThrow('Font is unavailable')

    expect(page.children).toEqual([existingNode])
  })

  it('removes the temporary root and preserves existing nodes when applying an image resource fails', async () => {
    const page = createPage()
    const existingNode = createNode('existing-node', page)
    page.appendChild(existingNode)
    const figma = createFigma(page)
    const renderer = rendererFor(figma)
    const imagePlan: RenderPlanNode = {
      ...framePlan(),
      id: 'hero-image',
      type: 'IMAGE',
      fills: [{ type: 'IMAGE', imageHash: 'unavailable-image-hash', scaleMode: 'FILL' }],
    }

    await expect(renderAtomically(renderer, page, framePlan([imagePlan]))).rejects.toThrow()

    expect(page.children).toEqual([existingNode])
  })
})
