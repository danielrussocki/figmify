import { describe, expect, it } from 'vitest'
import { hasValidApiV1Node, hasValidFigmaRect } from '../../src/contracts/api-v1'

const validRect = {
  x: 0,
  y: 0,
  width: 1440,
  height: 900,
  top: 0,
  left: 0,
}

const validNode = {
  id: 'root',
  tag: 'body',
  type: 'FRAME',
  rect: validRect,
  isVisible: true,
  children: [
    {
      id: 'headline',
      tag: 'h1',
      type: 'TEXT',
      rect: { x: 80, y: 96, width: 500, height: 72, top: 96, left: 80 },
      isVisible: true,
      children: [],
    },
  ],
}

describe('API v1 node validation', () => {
  it('accepts a valid rectangle with all CSS pixel coordinates', () => {
    expect(hasValidFigmaRect(validRect)).toBe(true)
  })

  it.each([
    ['x is missing', { ...validRect, x: undefined }],
    ['width is not a number', { ...validRect, width: '1440' }],
    ['height is not finite', { ...validRect, height: Number.NaN }],
  ])('rejects a rectangle when %s', (_description, rect) => {
    expect(hasValidFigmaRect(rect)).toBe(false)
  })

  it('accepts a valid node tree recursively', () => {
    expect(hasValidApiV1Node(validNode)).toBe(true)
  })

  it.each([
    ['type is missing', { ...validNode, type: undefined }],
    ['type is unsupported', { ...validNode, type: 'GROUP' }],
    ['geometry is missing', { ...validNode, rect: undefined }],
    ['geometry is invalid', { ...validNode, rect: { ...validRect, left: '0' } }],
    ['visibility is missing', { ...validNode, isVisible: undefined }],
    ['visibility is not a boolean', { ...validNode, isVisible: 'true' }],
    ['children is missing', { ...validNode, children: undefined }],
    ['children is not an array', { ...validNode, children: {} }],
    [
      'a nested child is invalid',
      {
        ...validNode,
        children: [{ ...validNode.children[0], isVisible: undefined }],
      },
    ],
  ])('rejects a node tree when %s', (_description, node) => {
    expect(hasValidApiV1Node(node)).toBe(false)
  })
})
