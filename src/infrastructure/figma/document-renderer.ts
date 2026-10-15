import type { RenderPlanNode, RenderPlanPaint } from '../../domain/render-plan'

export interface TemporaryRootNode {
  visible: boolean
  x: number
  y: number
  appendChild?(node: TemporaryRootNode): void
  remove(): void
}

interface RenderableNode extends TemporaryRootNode {
  width?: number
  height?: number
  opacity?: number
  fills?: readonly Paint[] | typeof figma.mixed
  strokes?: readonly Paint[] | typeof figma.mixed
  strokeWeight?: number | typeof figma.mixed
  strokeTopWeight?: number | typeof figma.mixed
  strokeRightWeight?: number | typeof figma.mixed
  strokeBottomWeight?: number | typeof figma.mixed
  strokeLeftWeight?: number | typeof figma.mixed
  cornerRadius?: number | typeof figma.mixed
  topLeftRadius?: number | typeof figma.mixed
  topRightRadius?: number | typeof figma.mixed
  bottomRightRadius?: number | typeof figma.mixed
  bottomLeftRadius?: number | typeof figma.mixed
  effects?: readonly Effect[] | typeof figma.mixed
  layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL'
  itemSpacing?: number
  paddingTop?: number
  paddingRight?: number
  paddingBottom?: number
  paddingLeft?: number
  primaryAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN'
  counterAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX'
  layoutGrow?: number
  layoutPositioning?: 'AUTO' | 'ABSOLUTE'
  characters?: string
  fontName?: FontName | typeof figma.mixed
  fontSize?: number | typeof figma.mixed
  lineHeight?: LineHeight | typeof figma.mixed
  letterSpacing?: LetterSpacing | typeof figma.mixed
  textAlignHorizontal?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED'
  textAutoResize?: 'NONE' | 'WIDTH_AND_HEIGHT' | 'HEIGHT' | 'TRUNCATE'
  name?: string
}

export interface TemporaryRootPage {
  appendChild(node: TemporaryRootNode): void
}

export interface TemporaryRootDestination {
  readonly x: number
  readonly y: number
}

export interface DocumentRendererFigma {
  createFrame(): RenderableNode
  createText(): RenderableNode
  createRectangle(): RenderableNode
  loadFontAsync(font: { readonly family: string; readonly style: string }): Promise<void>
}

export interface DocumentRenderer {
  createTemporaryRoot(page: TemporaryRootPage): TemporaryRootNode
  renderCompleteTree(plan: RenderPlanNode, temporaryRoot: TemporaryRootNode): Promise<void>
  confirmTemporaryRoot(temporaryRoot: TemporaryRootNode, destination: TemporaryRootDestination): void
  removeTemporaryRoot(temporaryRoot: TemporaryRootNode): void
}

const STAGING_ROOT_COORDINATE = -10000

function paintFrom(planPaint: RenderPlanPaint): Paint {
  if (planPaint.type === 'IMAGE') {
    return {
      type: 'IMAGE',
      imageHash: planPaint.imageHash,
      scaleMode: planPaint.scaleMode,
    }
  }

  return {
    type: 'SOLID',
    color: {
      r: planPaint.color.r,
      g: planPaint.color.g,
      b: planPaint.color.b,
    },
    opacity: planPaint.color.a,
  }
}

function effectFrom(effect: NonNullable<RenderPlanNode['effects']>[number]): Effect {
  return {
    type: effect.type,
    color: {
      r: effect.color.r,
      g: effect.color.g,
      b: effect.color.b,
      a: effect.color.a,
    },
    offset: { ...effect.offset },
    radius: effect.radius,
    spread: effect.spread,
    visible: true,
    blendMode: 'NORMAL',
  }
}

function applyGeometryAndAppearance(plan: RenderPlanNode, node: RenderableNode): void {
  node.x = plan.geometry.x
  node.y = plan.geometry.y
  node.width = plan.geometry.width
  node.height = plan.geometry.height
  node.visible = plan.isVisible
  node.opacity = plan.opacity

  if (plan.fills !== undefined) {
    node.fills = plan.fills.map(paintFrom)
  }

  if (plan.strokes !== undefined) {
    node.strokes = plan.strokes === null ? [] : plan.strokes.map(paintFrom)
  }

  if (plan.strokeWeight !== undefined) {
    node.strokeWeight = plan.strokeWeight
  }

  if (plan.strokeWeights !== undefined) {
    node.strokeTopWeight = plan.strokeWeights.top
    node.strokeRightWeight = plan.strokeWeights.right
    node.strokeBottomWeight = plan.strokeWeights.bottom
    node.strokeLeftWeight = plan.strokeWeights.left
  }

  if (plan.cornerRadius !== undefined) {
    node.cornerRadius = plan.cornerRadius
  }

  if (plan.cornerRadii !== undefined) {
    node.topLeftRadius = plan.cornerRadii.topLeft
    node.topRightRadius = plan.cornerRadii.topRight
    node.bottomRightRadius = plan.cornerRadii.bottomRight
    node.bottomLeftRadius = plan.cornerRadii.bottomLeft
  }

  if (plan.effects !== undefined) {
    node.effects = plan.effects === null ? [] : plan.effects.map(effectFrom)
  }

  if (plan.placeholder !== undefined) {
    node.name = plan.placeholder.label
  }
}

function applyAutoLayout(plan: RenderPlanNode, node: RenderableNode): void {
  if (plan.layoutMode !== undefined) {
    node.layoutMode = plan.layoutMode
  }
  if (plan.itemSpacing !== undefined) {
    node.itemSpacing = plan.itemSpacing
  }
  if (plan.padding !== undefined) {
    node.paddingTop = plan.padding.top
    node.paddingRight = plan.padding.right
    node.paddingBottom = plan.padding.bottom
    node.paddingLeft = plan.padding.left
  }
  if (plan.primaryAxisAlign !== undefined) {
    node.primaryAxisAlignItems = plan.primaryAxisAlign
  }
  if (plan.counterAxisAlign !== undefined) {
    node.counterAxisAlignItems = plan.counterAxisAlign
  }
  if (plan.layoutGrow !== undefined) {
    node.layoutGrow = plan.layoutGrow
  }
  if (plan.position !== undefined) {
    node.layoutPositioning = plan.position === 'absolute' ? 'ABSOLUTE' : 'AUTO'
  }
}

async function applyText(plan: RenderPlanNode, node: RenderableNode, figma: DocumentRendererFigma): Promise<void> {
  if (plan.text === undefined) {
    return
  }

  if (plan.text.font !== undefined) {
    await figma.loadFontAsync(plan.text.font)
    node.fontName = { ...plan.text.font }
  }
  if (plan.text.characters !== undefined) {
    node.characters = plan.text.characters
  }
  if (plan.text.fontSize !== undefined) {
    node.fontSize = plan.text.fontSize
  }
  if (plan.text.lineHeight !== undefined) {
    node.lineHeight = { unit: 'PIXELS', value: plan.text.lineHeight }
  }
  if (plan.text.letterSpacing !== undefined) {
    node.letterSpacing = { unit: 'PIXELS', value: plan.text.letterSpacing }
  }
  if (plan.text.textAlign !== undefined) {
    node.textAlignHorizontal = plan.text.textAlign
  }
  if (plan.text.textAutoResize !== undefined) {
    node.textAutoResize = plan.text.textAutoResize
  }
}

export function createDocumentRenderer(figma: DocumentRendererFigma): DocumentRenderer {
  const removedTemporaryRoots = new WeakSet<TemporaryRootNode>()
  const renderedTemporaryRoots = new WeakSet<TemporaryRootNode>()

  async function renderNode(plan: RenderPlanNode, parent: TemporaryRootNode): Promise<void> {
    const node = plan.type === 'FRAME'
      ? figma.createFrame()
      : plan.type === 'TEXT'
        ? figma.createText()
        : figma.createRectangle()

    parent.appendChild?.(node)

    applyGeometryAndAppearance(plan, node)
    applyAutoLayout(plan, node)
    await applyText(plan, node, figma)

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
      renderedTemporaryRoots.add(temporaryRoot)
    },
    confirmTemporaryRoot(temporaryRoot: TemporaryRootNode, destination: TemporaryRootDestination): void {
      if (!renderedTemporaryRoots.has(temporaryRoot)) {
        throw new Error('The temporary root has not completed rendering.')
      }

      temporaryRoot.x = destination.x
      temporaryRoot.y = destination.y
      temporaryRoot.visible = true
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
