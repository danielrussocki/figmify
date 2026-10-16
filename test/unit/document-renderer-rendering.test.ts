import { describe, expect, it, vi } from 'vitest'
import { createDocumentRenderer } from '../../src/infrastructure/figma/document-renderer'
import type { RenderPlanNode } from '../../src/domain/render-plan'

interface TemporaryRootGeometry {
  readonly width: number
  readonly height: number
}

interface GeometryAwareDocumentRenderer {
  createTemporaryRoot(
    page: { appendChild(node: FakeNode): void },
    geometry: TemporaryRootGeometry,
  ): FakeNode
}

interface FakeNode {
  readonly kind: 'FRAME' | 'TEXT' | 'RECTANGLE'
  name?: string
  visible: boolean
  x: number
  y: number
  children: FakeNode[]
  width?: number
  height?: number
  opacity?: number
  fills?: unknown
  strokes?: unknown
  strokeWeight?: number
  strokeTopWeight?: number
  strokeRightWeight?: number
  strokeBottomWeight?: number
  strokeLeftWeight?: number
  cornerRadius?: number
  topLeftRadius?: number
  topRightRadius?: number
  bottomRightRadius?: number
  bottomLeftRadius?: number
  effects?: unknown
  layoutMode?: string
  itemSpacing?: number
  paddingTop?: number
  paddingRight?: number
  paddingBottom?: number
  paddingLeft?: number
  primaryAxisAlignItems?: string
  counterAxisAlignItems?: string
  layoutGrow?: number
  layoutPositioning?: string
  characters?: string
  fontName?: unknown
  fontSize?: number
  fontWeight?: number
  lineHeight?: unknown
  letterSpacing?: unknown
  textAlignHorizontal?: string
  textAutoResize?: string
  resize(width: number, height: number): void
  appendChild(node: FakeNode): void
  remove(): void
}

type InlineSvgRenderPlanNode = RenderPlanNode & {
  readonly svg: string
}

type TaggedRenderPlanNode = RenderPlanNode & {
  readonly tag: string
}

interface ReadOnlyGeometryNode extends FakeNode {
  resize(width: number, height: number): void
}

function createNode(kind: FakeNode['kind']): FakeNode {
  return {
    kind,
    visible: true,
    x: 0,
    y: 0,
    children: [],
    resize(width: number, height: number): void {
      this.width = width
      this.height = height
    },
    appendChild(node: FakeNode): void {
      this.children.push(node)
    },
    remove: vi.fn(),
  }
}

function createReadOnlyGeometryNode(kind: FakeNode['kind']): ReadOnlyGeometryNode {
  const node = createNode(kind) as ReadOnlyGeometryNode
  let width = 0
  let height = 0

  Object.defineProperties(node, {
    width: {
      enumerable: true,
      get: (): number => width,
    },
    height: {
      enumerable: true,
      get: (): number => height,
    },
  })
  node.resize = vi.fn((nextWidth: number, nextHeight: number): void => {
    width = nextWidth
    height = nextHeight
  })

  return node
}

function createSealedAutoLayoutNode(
  kind: FakeNode['kind'],
  capabilities: { readonly container: boolean; readonly child: boolean },
): FakeNode {
  const node: FakeNode = { ...createNode(kind), name: '', width: 0, height: 0, opacity: 1 }

  if (capabilities.container) {
    Object.assign(node, {
      layoutMode: 'NONE',
      itemSpacing: 0,
      paddingTop: 0,
      paddingRight: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      primaryAxisAlignItems: 'MIN',
      counterAxisAlignItems: 'MIN',
    })
  }

  if (capabilities.child) {
    Object.assign(node, {
      layoutGrow: 0,
      layoutPositioning: 'AUTO',
    })
  }

  return Object.seal(node)
}

function completePlan(): RenderPlanNode {
  return {
    id: 'design',
    type: 'FRAME',
    geometry: { x: 12, y: 24, width: 640, height: 480 },
    isVisible: true,
    opacity: 0.8,
    fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.2, b: 0.3, a: 0.4 } }],
    strokes: [{ type: 'SOLID', color: { r: 0.5, g: 0.6, b: 0.7, a: 0.8 }, weight: 2 }],
    strokeWeight: 2,
    strokeWeights: { top: 1, right: 2, bottom: 3, left: 4 },
    cornerRadius: 8,
    cornerRadii: { topLeft: 1, topRight: 2, bottomRight: 3, bottomLeft: 4 },
    effects: [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.2 }, offset: { x: 1, y: 2 }, radius: 3, spread: 4 }],
    layoutMode: 'VERTICAL',
    itemSpacing: 16,
    padding: { top: 5, right: 6, bottom: 7, left: 8 },
    primaryAxisAlign: 'SPACE_BETWEEN',
    counterAxisAlign: 'CENTER',
    layoutGrow: 1,
    position: 'absolute',
    children: [
      {
        id: 'headline',
        type: 'TEXT',
        geometry: { x: 20, y: 30, width: 200, height: 40 },
        isVisible: true,
        opacity: 1,
        text: {
          characters: 'Build faster',
          font: { family: 'Inter', style: 'Bold' },
          fontSize: 32,
          fontWeight: 700,
          lineHeight: 40,
          letterSpacing: -0.5,
          textAlign: 'CENTER',
          textAutoResize: 'HEIGHT',
        },
        children: [],
      },
      {
        id: 'hero-image',
        type: 'IMAGE',
        geometry: { x: 20, y: 90, width: 300, height: 180 },
        isVisible: false,
        opacity: 0.5,
        fills: [{ type: 'IMAGE', imageHash: 'hero-hash', scaleMode: 'FILL' }],
        children: [],
      },
    ],
  }
}

function autoLayoutRegressionPlan(
  parentUsesAutoLayout: boolean,
  childrenHaveContainerProperties: boolean,
): RenderPlanNode {
  const children: readonly RenderPlanNode[] = [
    {
      id: 'headline',
      type: 'TEXT',
      geometry: { x: 20, y: 30, width: 200, height: 40 },
      isVisible: true,
      opacity: 1,
      ...(childrenHaveContainerProperties
        ? {
            layoutMode: 'HORIZONTAL' as const,
            itemSpacing: 12,
            padding: { top: 1, right: 2, bottom: 3, left: 4 },
            primaryAxisAlign: 'CENTER' as const,
            counterAxisAlign: 'MAX' as const,
          }
        : {}),
      layoutGrow: 1,
      position: 'absolute',
      children: [],
    },
    {
      id: 'hero-image',
      type: 'IMAGE',
      geometry: { x: 20, y: 90, width: 300, height: 180 },
      isVisible: true,
      opacity: 1,
      ...(childrenHaveContainerProperties
        ? {
            layoutMode: 'HORIZONTAL' as const,
            itemSpacing: 12,
            padding: { top: 1, right: 2, bottom: 3, left: 4 },
            primaryAxisAlign: 'CENTER' as const,
            counterAxisAlign: 'MAX' as const,
          }
        : {}),
      layoutGrow: 1,
      position: 'absolute',
      children: [],
    },
  ]

  return {
    id: 'design',
    type: 'FRAME',
    geometry: { x: 12, y: 24, width: 640, height: 480 },
    isVisible: true,
    opacity: 1,
    ...(parentUsesAutoLayout
      ? {
          layoutMode: 'VERTICAL' as const,
          itemSpacing: 16,
          padding: { top: 5, right: 6, bottom: 7, left: 8 },
          primaryAxisAlign: 'SPACE_BETWEEN' as const,
          counterAxisAlign: 'CENTER' as const,
        }
      : {}),
    children,
  }
}

describe('Figma document renderer complete tree', () => {
  it('resizes frame, text, and image nodes without assigning read-only dimensions', async () => {
    const createdFrames: ReadOnlyGeometryNode[] = []
    const createdTexts: ReadOnlyGeometryNode[] = []
    const createdRectangles: ReadOnlyGeometryNode[] = []
    const figma = {
      createFrame: vi.fn(() => {
        const node = createReadOnlyGeometryNode('FRAME')
        createdFrames.push(node)
        return node
      }),
      createText: vi.fn(() => {
        const node = createReadOnlyGeometryNode('TEXT')
        createdTexts.push(node)
        return node
      }),
      createRectangle: vi.fn(() => {
        const node = createReadOnlyGeometryNode('RECTANGLE')
        createdRectangles.push(node)
        return node
      }),
      loadFontAsync: vi.fn().mockResolvedValue(undefined),
    }
    const renderer = createDocumentRenderer(figma)
    const temporaryRoot = createNode('FRAME')

    await expect(renderer.renderCompleteTree(completePlan(), temporaryRoot)).resolves.toBeUndefined()

    expect(createdFrames[0].resize).toHaveBeenCalledWith(640, 480)
    expect(createdTexts[0].resize).toHaveBeenCalledWith(200, 40)
    expect(createdRectangles[0].resize).toHaveBeenCalledWith(300, 180)
    expect(createdFrames[0]).toMatchObject({ width: 640, height: 480 })
    expect(createdTexts[0]).toMatchObject({ width: 200, height: 40 })
    expect(createdRectangles[0]).toMatchObject({ width: 300, height: 180 })
  })

  it('creates the hierarchy and applies geometry, properties, text, and image resources', async () => {
    const createdFrames: FakeNode[] = []
    const createdTexts: FakeNode[] = []
    const createdRectangles: FakeNode[] = []
    const figma = {
      createFrame: vi.fn(() => {
        const node = createNode('FRAME')
        createdFrames.push(node)
        return node
      }),
      createText: vi.fn(() => {
        const node = createNode('TEXT')
        createdTexts.push(node)
        return node
      }),
      createRectangle: vi.fn(() => {
        const node = createNode('RECTANGLE')
        createdRectangles.push(node)
        return node
      }),
      loadFontAsync: vi.fn().mockResolvedValue(undefined),
    }
    const renderer = createDocumentRenderer(figma)
    const temporaryRoot = createNode('FRAME')

    await renderer.renderCompleteTree(completePlan(), temporaryRoot)

    const [design] = temporaryRoot.children
    const [headline, heroImage] = design.children
    expect(createdFrames).toHaveLength(1)
    expect(createdTexts).toHaveLength(1)
    expect(createdRectangles).toHaveLength(1)
    expect(design).toMatchObject({
      x: 12,
      y: 24,
      width: 640,
      height: 480,
      visible: true,
      opacity: 0.8,
      fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.2, b: 0.3 }, opacity: 0.4 }],
      strokes: [{ type: 'SOLID', color: { r: 0.5, g: 0.6, b: 0.7 }, opacity: 0.8 }],
      strokeWeight: 2,
      strokeTopWeight: 1,
      strokeRightWeight: 2,
      strokeBottomWeight: 3,
      strokeLeftWeight: 4,
      cornerRadius: 8,
      topLeftRadius: 1,
      topRightRadius: 2,
      bottomRightRadius: 3,
      bottomLeftRadius: 4,
      effects: [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.2 }, offset: { x: 1, y: 2 }, radius: 3, spread: 4, visible: true }],
      layoutMode: 'VERTICAL',
      itemSpacing: 16,
      paddingTop: 5,
      paddingRight: 6,
      paddingBottom: 7,
      paddingLeft: 8,
      primaryAxisAlignItems: 'SPACE_BETWEEN',
      counterAxisAlignItems: 'CENTER',
    })
    expect(figma.loadFontAsync).toHaveBeenCalledWith({ family: 'Inter', style: 'Bold' })
    expect(headline).toMatchObject({
      x: 20,
      y: 30,
      width: 200,
      height: 40,
      characters: 'Build faster',
      fontName: { family: 'Inter', style: 'Bold' },
      fontSize: 32,
      lineHeight: { unit: 'PIXELS', value: 40 },
      letterSpacing: { unit: 'PIXELS', value: -0.5 },
      textAlignHorizontal: 'CENTER',
      textAutoResize: 'HEIGHT',
    })
    expect(heroImage).toMatchObject({
      x: 20,
      y: 90,
      width: 300,
      height: 180,
      visible: false,
      opacity: 0.5,
      fills: [{ type: 'IMAGE', imageHash: 'hero-hash', scaleMode: 'FILL' }],
    })
  })

  it('writes Auto Layout container properties only to sealed frames', async () => {
    const createdFrames: FakeNode[] = []
    const createdTexts: FakeNode[] = []
    const createdRectangles: FakeNode[] = []
    const figma = {
      createFrame: vi.fn(() => {
        const node = createSealedAutoLayoutNode('FRAME', { container: true, child: true })
        createdFrames.push(node)
        return node
      }),
      createText: vi.fn(() => {
        const node = createSealedAutoLayoutNode('TEXT', { container: false, child: true })
        createdTexts.push(node)
        return node
      }),
      createRectangle: vi.fn(() => {
        const node = createSealedAutoLayoutNode('RECTANGLE', { container: false, child: true })
        createdRectangles.push(node)
        return node
      }),
      loadFontAsync: vi.fn().mockResolvedValue(undefined),
    }
    const renderer = createDocumentRenderer(figma)
    const temporaryRoot = createNode('FRAME')
    const plan = autoLayoutRegressionPlan(true, true)

    await expect(renderer.renderCompleteTree(plan, temporaryRoot)).resolves.toBeUndefined()

    expect(createdFrames[0]).toMatchObject({
      layoutMode: 'VERTICAL',
      itemSpacing: 16,
      paddingTop: 5,
      paddingRight: 6,
      paddingBottom: 7,
      paddingLeft: 8,
      primaryAxisAlignItems: 'SPACE_BETWEEN',
      counterAxisAlignItems: 'CENTER',
    })
    expect(createdTexts[0]).toMatchObject({ layoutGrow: 1, layoutPositioning: 'ABSOLUTE' })
    expect(createdRectangles[0]).toMatchObject({ layoutGrow: 1, layoutPositioning: 'ABSOLUTE' })
    expect('layoutMode' in createdTexts[0]).toBe(false)
    expect('layoutMode' in createdRectangles[0]).toBe(false)
  })

  it('does not write Auto Layout child properties below a sealed non-Auto Layout parent', async () => {
    const createdFrames: FakeNode[] = []
    const createdTexts: FakeNode[] = []
    const createdRectangles: FakeNode[] = []
    const figma = {
      createFrame: vi.fn(() => {
        const node = createSealedAutoLayoutNode('FRAME', { container: true, child: false })
        createdFrames.push(node)
        return node
      }),
      createText: vi.fn(() => {
        const node = createSealedAutoLayoutNode('TEXT', { container: false, child: false })
        createdTexts.push(node)
        return node
      }),
      createRectangle: vi.fn(() => {
        const node = createSealedAutoLayoutNode('RECTANGLE', { container: false, child: false })
        createdRectangles.push(node)
        return node
      }),
      loadFontAsync: vi.fn().mockResolvedValue(undefined),
    }
    const renderer = createDocumentRenderer(figma)
    const temporaryRoot = createNode('FRAME')
    const plan = autoLayoutRegressionPlan(false, false)

    await expect(renderer.renderCompleteTree(plan, temporaryRoot)).resolves.toBeUndefined()

    expect(createdFrames).toHaveLength(1)
    expect(createdTexts).toHaveLength(1)
    expect(createdRectangles).toHaveLength(1)
    expect('layoutGrow' in createdTexts[0]).toBe(false)
    expect('layoutPositioning' in createdTexts[0]).toBe(false)
    expect('layoutGrow' in createdRectangles[0]).toBe(false)
    expect('layoutPositioning' in createdRectangles[0]).toBe(false)
  })

  it('moves and reveals the temporary root only after its complete tree has rendered', async () => {
    const figma = {
      createFrame: vi.fn(() => createNode('FRAME')),
      createText: vi.fn(() => createNode('TEXT')),
      createRectangle: vi.fn(() => createNode('RECTANGLE')),
      loadFontAsync: vi.fn().mockResolvedValue(undefined),
    }
    const renderer = createDocumentRenderer(figma)
    const page = { appendChild: vi.fn() }
    const temporaryRoot = renderer.createTemporaryRoot(page, { width: 640, height: 480 })

    expect(temporaryRoot).toMatchObject({ visible: false, x: -10000, y: -10000 })
    expect(() => renderer.confirmTemporaryRoot(temporaryRoot, { x: 480, y: 96 })).toThrow(
      'The temporary root has not completed rendering.',
    )

    await renderer.renderCompleteTree(completePlan(), temporaryRoot)
    renderer.confirmTemporaryRoot(temporaryRoot, { x: 480, y: 96 })

    expect(temporaryRoot).toMatchObject({ visible: true, x: 480, y: 96 })
  })

  it('resizes the temporary root to the imported document dimensions without moving it', () => {
    const figma = {
      createFrame: vi.fn(() => createReadOnlyGeometryNode('FRAME')),
      createText: vi.fn(() => createNode('TEXT')),
      createRectangle: vi.fn(() => createNode('RECTANGLE')),
      loadFontAsync: vi.fn().mockResolvedValue(undefined),
    }
    const renderer = createDocumentRenderer(figma) as unknown as GeometryAwareDocumentRenderer
    const page = { appendChild: vi.fn() }
    const documentGeometry = { width: 1280, height: 720 }

    const temporaryRoot = renderer.createTemporaryRoot(page, documentGeometry)

    expect(temporaryRoot.resize).toHaveBeenCalledWith(1280, 720)
    expect(temporaryRoot).toMatchObject({ x: -10000, y: -10000 })
  })

  it('creates inline SVG once without rendering its source children as empty frames', async () => {
    const inlineSvg = '<svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z" /></svg>'
    const svgNode = createNode('FRAME')
    const figma = {
      createFrame: vi.fn(() => createNode('FRAME')),
      createText: vi.fn(() => createNode('TEXT')),
      createRectangle: vi.fn(() => createNode('RECTANGLE')),
      createNodeFromSvg: vi.fn(() => svgNode),
      loadFontAsync: vi.fn().mockResolvedValue(undefined),
    }
    const renderer = createDocumentRenderer(figma)
    const temporaryRoot = createNode('FRAME')
    const plan: InlineSvgRenderPlanNode = {
      id: 'inline-icon',
      type: 'FRAME',
      svg: inlineSvg,
      geometry: { x: 48, y: 72, width: 24, height: 24 },
      isVisible: false,
      opacity: 0.4,
      children: [{
        id: 'svg-path',
        type: 'FRAME',
        geometry: { x: 0, y: 0, width: 24, height: 24 },
        isVisible: true,
        opacity: 1,
        children: [],
      }],
    }

    await renderer.renderCompleteTree(plan, temporaryRoot)

    expect(figma.createNodeFromSvg).toHaveBeenCalledWith(inlineSvg)
    expect(temporaryRoot.children).toEqual([svgNode])
    expect(svgNode).toMatchObject({ x: 48, y: 72, width: 24, height: 24, visible: false, opacity: 0.4 })
    expect(figma.createFrame).not.toHaveBeenCalled()
  })

  it('assigns HTML tags as names to frame, text, image, and inline SVG nodes without changing their tree or appearance', async () => {
    const svgNode = createNode('FRAME')
    const figma = {
      createFrame: vi.fn(() => createNode('FRAME')),
      createText: vi.fn(() => createNode('TEXT')),
      createRectangle: vi.fn(() => createNode('RECTANGLE')),
      createNodeFromSvg: vi.fn(() => svgNode),
      loadFontAsync: vi.fn().mockResolvedValue(undefined),
    }
    const renderer = createDocumentRenderer(figma)
    const temporaryRoot = createNode('FRAME')
    const inlineSvg = '<svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z" /></svg>'
    const plan = {
      id: 'html-root',
      tag: 'html',
      type: 'FRAME',
      geometry: { x: 0, y: 0, width: 1280, height: 720 },
      isVisible: true,
      opacity: 0.9,
      children: [
        {
          id: 'body',
          tag: 'body',
          type: 'FRAME',
          geometry: { x: 16, y: 24, width: 960, height: 640 },
          isVisible: true,
          opacity: 1,
          children: [
            {
              id: 'heading',
              tag: 'h1',
              type: 'TEXT',
              geometry: { x: 32, y: 48, width: 400, height: 64 },
              isVisible: true,
              opacity: 1,
              children: [],
            },
            {
              id: 'hero',
              tag: 'img',
              type: 'IMAGE',
              geometry: { x: 32, y: 136, width: 640, height: 360 },
              isVisible: false,
              opacity: 0.5,
              children: [],
            },
            {
              id: 'icon',
              tag: 'svg',
              type: 'FRAME',
              svg: inlineSvg,
              geometry: { x: 704, y: 136, width: 24, height: 24 },
              isVisible: true,
              opacity: 0.4,
              children: [],
            },
          ],
        },
      ],
    } as TaggedRenderPlanNode

    await renderer.renderCompleteTree(plan, temporaryRoot)

    const [html] = temporaryRoot.children
    const [body] = html.children
    const [heading, hero, icon] = body.children
    expect(html).toMatchObject({ name: 'html', x: 0, y: 0, width: 1280, height: 720, visible: true, opacity: 0.9 })
    expect(body).toMatchObject({ name: 'body', x: 16, y: 24, width: 960, height: 640 })
    expect(heading).toMatchObject({ name: 'h1', kind: 'TEXT' })
    expect(hero).toMatchObject({ name: 'img', kind: 'RECTANGLE', visible: false, opacity: 0.5 })
    expect(icon).toBe(svgNode)
    expect(icon).toMatchObject({ name: 'svg', x: 704, y: 136, width: 24, height: 24, visible: true, opacity: 0.4 })
    expect(figma.createNodeFromSvg).toHaveBeenCalledWith(inlineSvg)
  })
})
