import { describe, expect, it, vi } from 'vitest'
import type { FigmaDocument } from '../../src/contracts/api-v1'
import { requestFigmaDocument } from '../../src/infrastructure/api/figmify-client'

const document: FigmaDocument = {
  schemaVersion: '1.0',
  source: {
    url: 'https://example.com/',
    viewport: {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
    },
  },
  styles: { colors: [], typographies: [] },
  assets: [],
  document: {
    id: 'root',
    tag: 'body',
    type: 'FRAME',
    rect: { x: 0, y: 0, width: 1440, height: 900, top: 0, left: 0 },
    isVisible: true,
    children: [],
  },
}

describe('Figmify API v1 client', () => {
  it('requests the local API with the original URL and forwards the cancellation signal', async () => {
    const controller = new AbortController()
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(document), { status: 200 }),
    )
    const inputUrl = 'not a URL?with=unescaped values'

    await expect(requestFigmaDocument(inputUrl, controller.signal, fetchImplementation)).resolves.toEqual(document)

    expect(fetchImplementation).toHaveBeenCalledOnce()
    expect(fetchImplementation).toHaveBeenCalledWith(
      'http://127.0.0.1:3000/v1/figma?url=not+a+URL%3Fwith%3Dunescaped+values&includeHidden=false',
      {
        method: 'GET',
        signal: controller.signal,
      },
    )
  })
})
