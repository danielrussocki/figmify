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
