import { describe, expect, it } from 'vitest'
import type { FigmaNode } from '../../src/contracts/api-v1'
import { buildRenderPlan } from '../../src/domain/render-plan'

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
