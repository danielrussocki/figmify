import { describe, expect, it } from 'vitest'
import { hasValidApiV1Document } from '../../src/contracts/api-v1'

const validDocument = {
  schemaVersion: '1.0',
  source: {
    url: 'https://example.com/',
    viewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
  },
  styles: {
    colors: [
      { id: 'color-primary', name: 'Primary', rgba: { r: 0, g: 0.2, b: 0.8, a: 1 } },
    ],
    typographies: [
      {
        id: 'type-heading',
        fontFamily: 'Inter',
        fontSize: '32px',
        fontWeight: '700',
        fontStyle: 'normal',
        lineHeight: '40px',
        letterSpacing: '0px',
        textTransform: 'none',
      },
    ],
  },
  assets: [{ family: 'Inter', weights: [400, 700], url: 'https://example.com/inter.woff2' }],
  document: {
    id: 'root',
    tag: 'body',
    type: 'FRAME',
    rect: { x: 0, y: 0, width: 1440, height: 900, top: 0, left: 0 },
    isVisible: true,
    fills: [
      { type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 } },
      { type: 'IMAGE', src: 'https://images.example.com/hero.jpg', scaleMode: 'FILL' },
    ],
    strokes: [
      { type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 }, weight: 1, side: 'TOP' },
    ],
    effects: [
      {
        type: 'DROP_SHADOW',
        color: { r: 0, g: 0, b: 0, a: 0.25 },
        offset: { x: 0, y: 4 },
        radius: 8,
        spread: 0,
      },
    ],
    styles: {
      fontFamily: 'Inter',
      fontSize: 16,
      fontWeight: 400,
      lineHeight: 24,
      letterSpacing: 0,
      textAlign: 'LEFT',
      textAutoResize: 'HEIGHT',
    },
    image: { src: 'https://images.example.com/hero.jpg', naturalWidth: 640, naturalHeight: 360, objectFit: 'cover' },
    children: [],
  },
}

describe('API v1 style, paint, resource, and catalog validation', () => {
  it('accepts a document with valid styles, paints, resources, and catalogs', () => {
    expect(hasValidApiV1Document(validDocument)).toBe(true)
  })

  it.each([
    ['a solid paint without a valid color', { ...validDocument, document: { ...validDocument.document, fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }] } }],
    ['an image paint without a source', { ...validDocument, document: { ...validDocument.document, fills: [{ type: 'IMAGE', scaleMode: 'FILL' }] } }],
    ['a stroke without a weight', { ...validDocument, document: { ...validDocument.document, strokes: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 } }] } }],
    ['an invalid effect', { ...validDocument, document: { ...validDocument.document, effects: [{ type: 'BLUR' }] } }],
    ['an invalid text style', { ...validDocument, document: { ...validDocument.document, styles: { ...validDocument.document.styles, textAlign: 'START' } } }],
    ['an invalid image resource', { ...validDocument, document: { ...validDocument.document, image: { src: 'https://images.example.com/hero.jpg', naturalWidth: '640', naturalHeight: 360, objectFit: 'cover' } } }],
    ['a malformed color catalog entry', { ...validDocument, styles: { ...validDocument.styles, colors: [{ id: 'primary', name: 'Primary', rgba: { r: 0, g: 0, b: 0, a: 1 } }] } }],
    ['a malformed typography catalog entry', { ...validDocument, styles: { ...validDocument.styles, typographies: [{ ...validDocument.styles.typographies[0], fontWeight: 700 }] } }],
    ['a malformed font asset', { ...validDocument, assets: [{ family: 'Inter', weights: [400, '700'] }] }],
  ])('rejects a document with %s', (_description, document) => {
    expect(hasValidApiV1Document(document)).toBe(false)
  })
})
