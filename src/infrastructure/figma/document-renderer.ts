import type { RenderPlanNode } from '../../domain/render-plan'

export interface TemporaryRootNode {
  visible: boolean
  x: number
  y: number
  appendChild?(node: TemporaryRootNode): void
  remove(): void
}

export interface TemporaryRootPage {
  appendChild(node: TemporaryRootNode): void
}

export interface DocumentRendererFigma {
  createFrame(): TemporaryRootNode
  createText(): TemporaryRootNode
  createRectangle(): TemporaryRootNode
  loadFontAsync(font: { readonly family: string; readonly style: string }): Promise<void>
}

export interface DocumentRenderer {
  createTemporaryRoot(page: TemporaryRootPage): TemporaryRootNode
  renderCompleteTree(plan: RenderPlanNode, temporaryRoot: TemporaryRootNode): Promise<void>
  removeTemporaryRoot(temporaryRoot: TemporaryRootNode): void
}

const STAGING_ROOT_COORDINATE = -10000

export function createDocumentRenderer(figma: DocumentRendererFigma): DocumentRenderer {
  const removedTemporaryRoots = new WeakSet<TemporaryRootNode>()

  async function renderNode(plan: RenderPlanNode, parent: TemporaryRootNode): Promise<void> {
    const node = plan.type === 'FRAME'
      ? figma.createFrame()
      : plan.type === 'TEXT'
        ? figma.createText()
        : figma.createRectangle()

    parent.appendChild?.(node)

    if (plan.type === 'TEXT' && plan.text?.font !== undefined) {
      await figma.loadFontAsync(plan.text.font)
    }

    if (plan.type === 'IMAGE' && plan.fills?.some((fill) => fill.type === 'IMAGE')) {
      throw new Error('Unable to apply image resource')
    }

    for (const child of plan.children) {
      await renderNode(child, node)
    }
  }

  return {
    createTemporaryRoot(page: TemporaryRootPage): TemporaryRootNode {
      const temporaryRoot = figma.createFrame()
      temporaryRoot.visible = false
      temporaryRoot.x = STAGING_ROOT_COORDINATE
      temporaryRoot.y = STAGING_ROOT_COORDINATE
      page.appendChild(temporaryRoot)

      return temporaryRoot
    },
    async renderCompleteTree(plan: RenderPlanNode, temporaryRoot: TemporaryRootNode): Promise<void> {
      await renderNode(plan, temporaryRoot)
    },
    removeTemporaryRoot(temporaryRoot: TemporaryRootNode): void {
      if (removedTemporaryRoots.has(temporaryRoot)) {
        return
      }

      removedTemporaryRoots.add(temporaryRoot)
      temporaryRoot.remove()
    },
  }
}
