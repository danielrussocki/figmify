import { describe, expect, it } from 'vitest'
import type { FigmaNode, FigmaStyleCatalog } from '../../src/contracts/api-v1'
import type { PlannedFontUse } from '../../src/domain/font-substitution'
import { buildRenderPlan, type PlannedNonTypographyResource } from '../../src/domain/render-plan'

const root: FigmaNode = {
  id: 'root',
  tag: 'body',
  type: 'FRAME',
  rect: { x: 0, y: 0, width: 1440, height: 900, top: 0, left: 0 },
  isVisible: true,
  opacity: 1,
  children: [
    {
      id: 'hero',
      tag: 'section',
      type: 'FRAME',
      rect: { x: 80, y: 96, width: 640, height: 360, top: 96, left: 80 },
      relativeRect: { x: 80, y: 96, width: 640, height: 360, top: 96, left: 80 },
      isVisible: true,
      opacity: 0.8,
      children: [
        {
          id: 'headline',
          tag: 'h1',
          type: 'TEXT',
          rect: { x: 112, y: 128, width: 400, height: 72, top: 128, left: 112 },
          relativeRect: { x: 32, y: 32, width: 400, height: 72, top: 32, left: 32 },
          isVisible: true,
          children: [],
        },
        {
          id: 'hero-image',
          tag: 'img',
          type: 'IMAGE',
          rect: { x: 112, y: 232, width: 576, height: 192, top: 232, left: 112 },
          relativeRect: { x: 32, y: 136, width: 576, height: 192, top: 136, left: 32 },
          isVisible: false,
          opacity: 0.35,
          children: [],
        },
      ],
    },
  ],
}

describe('render plan hierarchy and geometry', () => {
  it('maps FRAME, TEXT, and IMAGE nodes recursively with relative geometry', () => {
    expect(buildRenderPlan(root)).toEqual({
      id: 'root',
      type: 'FRAME',
      geometry: { x: 0, y: 0, width: 1440, height: 900 },
      isVisible: true,
      opacity: 1,
      children: [
        {
          id: 'hero',
          type: 'FRAME',
          geometry: { x: 80, y: 96, width: 640, height: 360 },
          isVisible: true,
          opacity: 0.8,
          children: [
            {
              id: 'headline',
              type: 'TEXT',
              geometry: { x: 32, y: 32, width: 400, height: 72 },
              isVisible: true,
              opacity: 1,
              children: [],
            },
            {
              id: 'hero-image',
              type: 'IMAGE',
              geometry: { x: 32, y: 136, width: 576, height: 192 },
              isVisible: false,
              opacity: 0.35,
              children: [],
            },
          ],
        },
      ],
    })
  })

  it('uses absolute geometry when a node has no relative rectangle', () => {
    const textWithoutRelativeRect: FigmaNode = {
      id: 'footer-copy',
      tag: 'p',
      type: 'TEXT',
      rect: { x: 120, y: 760, width: 360, height: 24, top: 760, left: 120 },
      isVisible: true,
      children: [],
    }

    expect(buildRenderPlan(textWithoutRelativeRect)).toMatchObject({
      geometry: { x: 120, y: 760, width: 360, height: 24 },
      isVisible: true,
      opacity: 1,
    })
  })
})

describe('render plan solid paints and borders', () => {
  it('preserves solid fills, strokes, and border weights from an API v1 fixture', () => {
    const paintedFrame: FigmaNode = {
      id: 'painted-frame',
      tag: 'section',
      type: 'FRAME',
      rect: { x: 0, y: 0, width: 320, height: 180, top: 0, left: 0 },
      isVisible: true,
      fills: [
        { type: 'SOLID', color: { r: 0.1, g: 0.2, b: 0.3, a: 0.75 } },
        { type: 'IMAGE', src: 'https://images.example.com/ignored-until-task-35.jpg', scaleMode: 'FILL' },
      ],
      strokes: [
        { type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 }, side: 'TOP', weight: 2 },
        { type: 'SOLID', color: { r: 0, g: 0, b: 1, a: 0.5 }, side: 'BOTTOM', weight: 4 },
      ],
      strokeWeight: 3,
      strokeWeights: { top: 2, right: 3, bottom: 4, left: 5 },
      children: [],
    }

    expect(buildRenderPlan(paintedFrame)).toMatchObject({
      fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.2, b: 0.3, a: 0.75 } }],
      strokes: [
        { type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 }, side: 'TOP', weight: 2 },
        { type: 'SOLID', color: { r: 0, g: 0, b: 1, a: 0.5 }, side: 'BOTTOM', weight: 4 },
      ],
      strokeWeight: 3,
      strokeWeights: { top: 2, right: 3, bottom: 4, left: 5 },
    })
  })
})

describe('render plan corner radii and effects', () => {
  it('preserves individual corner radii and every shadow effect from an API v1 fixture', () => {
    const elevatedCard: FigmaNode = {
      id: 'elevated-card',
      tag: 'article',
      type: 'FRAME',
      rect: { x: 40, y: 72, width: 360, height: 240, top: 72, left: 40 },
      isVisible: true,
      cornerRadius: 12,
      cornerRadii: { topLeft: 12, topRight: 16, bottomRight: 20, bottomLeft: 24 },
      effects: [
        {
          type: 'DROP_SHADOW',
          color: { r: 0, g: 0, b: 0, a: 0.2 },
          offset: { x: 0, y: 8 },
          radius: 24,
          spread: 2,
        },
        {
          type: 'INNER_SHADOW',
          color: { r: 1, g: 1, b: 1, a: 0.3 },
          offset: { x: 0, y: 1 },
          radius: 3,
          spread: 0,
        },
      ],
      children: [],
    }

    expect(buildRenderPlan(elevatedCard)).toMatchObject({
      cornerRadius: 12,
      cornerRadii: { topLeft: 12, topRight: 16, bottomRight: 20, bottomLeft: 24 },
      effects: [
        {
          type: 'DROP_SHADOW',
          color: { r: 0, g: 0, b: 0, a: 0.2 },
          offset: { x: 0, y: 8 },
          radius: 24,
          spread: 2,
        },
        {
          type: 'INNER_SHADOW',
          color: { r: 1, g: 1, b: 1, a: 0.3 },
          offset: { x: 0, y: 1 },
          radius: 3,
          spread: 0,
        },
      ],
    })
  })

  it('preserves a null effects value', () => {
    const effectlessFrame: FigmaNode = {
      id: 'effectless-frame',
      tag: 'div',
      type: 'FRAME',
      rect: { x: 0, y: 0, width: 100, height: 100, top: 0, left: 0 },
      isVisible: true,
      effects: null,
      children: [],
    }

    expect(buildRenderPlan(effectlessFrame)).toMatchObject({ effects: null })
  })
})

describe('render plan Auto Layout', () => {
  it('preserves direction, alignment, spacing, padding, and sizing adjustments', () => {
    const autoLayoutFrame: FigmaNode = {
      id: 'feature-list',
      tag: 'ul',
      type: 'FRAME',
      rect: { x: 80, y: 160, width: 480, height: 320, top: 160, left: 80 },
      isVisible: true,
      layoutMode: 'VERTICAL',
      itemSpacing: 16,
      gap: 20,
      padding: { top: 24, right: 32, bottom: 40, left: 32 },
      primaryAxisAlign: 'SPACE_BETWEEN',
      counterAxisAlign: 'CENTER',
      layoutGrow: 1,
      position: 'absolute',
      children: [],
    }

    expect(buildRenderPlan(autoLayoutFrame)).toMatchObject({
      layoutMode: 'VERTICAL',
      itemSpacing: 16,
      gap: 20,
      padding: { top: 24, right: 32, bottom: 40, left: 32 },
      primaryAxisAlign: 'SPACE_BETWEEN',
      counterAxisAlign: 'CENTER',
      layoutGrow: 1,
      position: 'absolute',
    })
  })
})

describe('render plan reusable color styles', () => {
  const colorCatalog: FigmaStyleCatalog = {
    colors: [
      { id: 'color-primary', name: 'Primary', rgba: { r: 0.05, g: 0.3, b: 0.9, a: 1 } },
      { id: 'color-border', name: 'Border', rgba: { r: 0.8, g: 0.82, b: 0.86, a: 1 } },
    ],
    typographies: [],
  }

  it('resolves catalog color references for fills and strokes in every node', () => {
    const styledRoot: FigmaNode = {
      id: 'styled-root',
      tag: 'main',
      type: 'FRAME',
      rect: { x: 0, y: 0, width: 320, height: 180, top: 0, left: 0 },
      isVisible: true,
      fills: [{ type: 'SOLID', color: { r: 0.05, g: 0.3, b: 0.9, a: 1 } }],
      children: [
        {
          id: 'styled-card',
          tag: 'article',
          type: 'FRAME',
          rect: { x: 16, y: 16, width: 288, height: 148, top: 16, left: 16 },
          isVisible: true,
          strokes: [{ type: 'SOLID', color: { r: 0.8, g: 0.82, b: 0.86, a: 1 }, weight: 1 }],
          children: [],
        },
      ],
    }

    expect(buildRenderPlan(styledRoot, colorCatalog)).toMatchObject({
      fillColorStyleIds: ['color-primary'],
      children: [
        {
          strokeColorStyleIds: ['color-border'],
        },
      ],
    })
  })

  it('does not assign a catalog reference when a color is not reusable', () => {
    const uniqueColorFrame: FigmaNode = {
      id: 'unique-color',
      tag: 'div',
      type: 'FRAME',
      rect: { x: 0, y: 0, width: 100, height: 100, top: 0, left: 0 },
      isVisible: true,
      fills: [{ type: 'SOLID', color: { r: 0.4, g: 0.5, b: 0.6, a: 1 } }],
      children: [],
    }

    expect(buildRenderPlan(uniqueColorFrame, colorCatalog)).toMatchObject({
      fillColorStyleIds: [undefined],
    })
  })
})

describe('render plan text properties', () => {
  it('preserves characters and text properties while applying the planned font substitution', () => {
    const headline: FigmaNode = {
      id: 'headline',
      tag: 'h1',
      type: 'TEXT',
      rect: { x: 80, y: 96, width: 500, height: 72, top: 96, left: 80 },
      isVisible: true,
      characters: 'Build faster',
      styles: {
        fontFamily: 'Unavailable Sans',
        fontSize: 56,
        fontWeight: 700,
        lineHeight: 64,
        letterSpacing: -1.2,
        textAlign: 'CENTER',
        textAutoResize: 'HEIGHT',
      },
      children: [],
    }
    const fontSubstitutions: readonly PlannedFontUse[] = [
      { id: 'headline', font: { family: 'Inter', style: 'Bold' } },
    ]

    expect(buildRenderPlan(headline, undefined, fontSubstitutions)).toMatchObject({
      text: {
        characters: 'Build faster',
        font: { family: 'Inter', style: 'Bold' },
        fontSize: 56,
        fontWeight: 700,
        lineHeight: 64,
        letterSpacing: -1.2,
        textAlign: 'CENTER',
        textAutoResize: 'HEIGHT',
      },
    })
  })

  it('applies substitutions to matching text nodes throughout the hierarchy', () => {
    const textTree: FigmaNode = {
      id: 'root',
      tag: 'main',
      type: 'FRAME',
      rect: { x: 0, y: 0, width: 320, height: 180, top: 0, left: 0 },
      isVisible: true,
      children: [
        {
          id: 'body-copy',
          tag: 'p',
          type: 'TEXT',
          rect: { x: 16, y: 16, width: 288, height: 48, top: 16, left: 16 },
          isVisible: true,
          characters: 'Editable copy',
          styles: {
            fontFamily: 'Unavailable Sans',
            fontSize: 16,
            fontWeight: 400,
            lineHeight: 24,
            letterSpacing: 0,
            textAlign: 'LEFT',
            textAutoResize: 'WIDTH_AND_HEIGHT',
          },
          children: [],
        },
      ],
    }
    const fontSubstitutions: readonly PlannedFontUse[] = [
      { id: 'body-copy', font: { family: 'Roboto', style: 'Regular' } },
    ]

    expect(buildRenderPlan(textTree, undefined, fontSubstitutions)).toMatchObject({
      children: [
        {
          text: {
            characters: 'Editable copy',
            font: { family: 'Roboto', style: 'Regular' },
          },
        },
      ],
    })
  })
})

describe('render plan image paints and placeholders', () => {
  const heroImage: FigmaNode = {
    id: 'hero-image',
    tag: 'img',
    type: 'IMAGE',
    rect: { x: 80, y: 208, width: 640, height: 360, top: 208, left: 80 },
    isVisible: true,
    fills: [{ type: 'IMAGE', src: 'https://images.example.com/hero.jpg', scaleMode: 'FILL' }],
    children: [],
  }

  it('assigns a resolved image as an IMAGE paint', () => {
    const resources: readonly PlannedNonTypographyResource[] = [
      { id: 'hero-image', kind: 'resolved', imageHash: 'hero-image-hash' },
    ]

    expect(buildRenderPlan(heroImage, undefined, [], resources)).toMatchObject({
      fills: [{ type: 'IMAGE', imageHash: 'hero-image-hash', scaleMode: 'FILL' }],
    })
  })

  it('replaces an unresolved image with the defined placeholder', () => {
    const resources: readonly PlannedNonTypographyResource[] = [
      { id: 'hero-image', kind: 'placeholder', label: 'Image resource unavailable.' },
    ]

    expect(buildRenderPlan(heroImage, undefined, [], resources)).toMatchObject({
      fills: [],
      placeholder: {
        geometry: { x: 80, y: 208, width: 640, height: 360 },
        label: 'Image resource unavailable.',
      },
    })
  })
})

describe('render plan inline SVG', () => {
  it('preserves inline SVG while retaining its visual properties and source children', () => {
    const inlineSvg = '<svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z" /></svg>'
    const icon: FigmaNode = {
      id: 'inline-icon',
      tag: 'svg',
      type: 'FRAME',
      rect: { x: 48, y: 72, width: 24, height: 24, top: 72, left: 48 },
      isVisible: false,
      opacity: 0.4,
      svg: inlineSvg,
      children: [
        {
          id: 'svg-path',
          tag: 'path',
          type: 'FRAME',
          rect: { x: 48, y: 72, width: 24, height: 24, top: 72, left: 48 },
          relativeRect: { x: 0, y: 0, width: 24, height: 24, top: 0, left: 0 },
          isVisible: true,
          children: [],
        },
      ],
    }

    expect(buildRenderPlan(icon)).toMatchObject({
      svg: inlineSvg,
      geometry: { x: 48, y: 72, width: 24, height: 24 },
      isVisible: false,
      opacity: 0.4,
      children: [
        expect.objectContaining({ id: 'svg-path' }),
      ],
    })
  })
})
