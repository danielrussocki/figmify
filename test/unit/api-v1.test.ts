import { describe, expectTypeOf, it } from 'vitest'
import type {
  ApiError,
  FigmaDocument,
  FigmaImagePaint,
  FigmaNode,
  FigmaSolidPaint,
} from '../../src/contracts/api-v1'

const solidPaint: FigmaSolidPaint = {
  type: 'SOLID',
  color: { r: 1, g: 1, b: 1, a: 1 },
}

const imagePaint: FigmaImagePaint = {
  type: 'IMAGE',
  src: 'https://images.example.com/hero.jpg',
  scaleMode: 'FILL',
}

const rootNode: FigmaNode = {
  id: 'root',
  tag: 'body',
  type: 'FRAME',
  rect: { x: 0, y: 0, width: 1440, height: 900, top: 0, left: 0 },
  isVisible: true,
  fills: [solidPaint],
  children: [
    {
      id: 'headline',
      tag: 'h1',
      type: 'TEXT',
      rect: { x: 80, y: 96, width: 500, height: 72, top: 96, left: 80 },
      isVisible: true,
      characters: 'Build faster',
      children: [],
    },
    {
      id: 'hero-image',
      tag: 'img',
      type: 'IMAGE',
      rect: { x: 80, y: 208, width: 640, height: 360, top: 208, left: 80 },
      isVisible: true,
      fills: [imagePaint],
      children: [],
    },
  ],
}

const document: FigmaDocument = {
  schemaVersion: '1.1',
  source: {
    url: 'https://example.com/',
    viewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
  },
  styles: { colors: [], typographies: [] },
  assets: [],
  document: rootNode,
}

const apiError: ApiError = {
  code: 'INVALID_URL',
  message: 'The URL could not be imported.',
}

describe('API v1 contracts', () => {
  it('types a complete successful API v1 document', () => {
    expectTypeOf(document.schemaVersion).toEqualTypeOf<'1.1'>()
    expectTypeOf(document.document.children).toEqualTypeOf<FigmaNode[]>()
    expectTypeOf(document.document.fills).toEqualTypeOf<(FigmaSolidPaint | FigmaImagePaint)[] | undefined>()
  })

  it('types API errors with an explicit code and English message', () => {
    expectTypeOf(apiError).toEqualTypeOf<ApiError>()
    expectTypeOf(apiError.code).toEqualTypeOf<string>()
    expectTypeOf(apiError.message).toEqualTypeOf<string>()
  })
})
